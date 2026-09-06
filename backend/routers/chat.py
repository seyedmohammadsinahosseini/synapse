"""Mentor-Student messaging router: REST chat history, audio uploads, and WebSocket transport."""
import json
import os
import uuid
from datetime import datetime

from fastapi import (APIRouter, Depends, File, HTTPException, UploadFile,
                     WebSocket, WebSocketDisconnect)
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Message, StudentProfile, User
from ..schemas import MessageCreate, MessageOut
from ..security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

VOICE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(VOICE_DIR, exist_ok=True)
MAX_VOICE_SIZE = 10 * 1024 * 1024  # 10 MB limit


def _peer(db: Session, student_id: int, mentor_id: int) -> User:
    """Resolve mentor user model associated with student."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student record not found")
    return db.query(User).filter(User.id == profile.mentor_id).first()


@router.get("/with/{student_id}", response_model=list[MessageOut])
def history(student_id: int, user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    if user.role == "student":
        if user.id != student_id:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot view another student's messages")
        p = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        mentor_id = p.mentor_id if p else None
        if not mentor_id:
            return []
    elif user.role == "mentor":
        p = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
        if not p or p.mentor_id != user.id:
            raise HTTPException(status_code=404, detail="Student is not assigned to you")
        mentor_id = user.id
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")

    msgs = db.query(Message).filter(
        (Message.student_id == student_id) & (Message.mentor_id == mentor_id)
    ).order_by(Message.created_at.asc(), Message.id.asc()).all()
    return msgs


@router.post("/with/{student_id}/send", response_model=MessageOut)
def send_text(student_id: int, data: MessageCreate,
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mentor = _peer(db, student_id, user.id)
    if user.role == "mentor":
        p = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
        if not p or p.mentor_id != user.id:
            raise HTTPException(status_code=404, detail="Student is not assigned to you")
        sender, receiver = user.id, student_id
    else:
        sender, receiver = user.id, mentor.id

    msg = Message(
        student_id=student_id,
        mentor_id=mentor.id,
        sender_id=sender,
        receiver_id=receiver,
        kind="text",
        text=data.text,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def _is_valid_audio_header(b: bytes) -> bool:
    if len(b) < 4:
        return False
    # WebM / Matroska
    if b.startswith(b"\x1a\x45\xdf\xa3"):
        return True
    # Ogg
    if b.startswith(b"OggS"):
        return True
    # RIFF / WAV
    if b.startswith(b"RIFF"):
        return True
    # MP3 (ID3 tag or sync word)
    if b.startswith(b"ID3") or b.startswith(b"\xff\xfb") or b.startswith(b"\xff\xf3") or b.startswith(b"\xff\xf2"):
        return True
    # MP4 / M4A (ftyp atom in container header)
    if b"ftyp" in b[:16]:
        return True
    return False


@router.post("/with/{student_id}/voice")
async def send_voice(student_id: int, file: UploadFile = File(...),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if file.content_type not in ("audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a"):
        raise HTTPException(status_code=400, detail="Unsupported audio format")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
    if ext.lower() not in ("webm", "ogg", "mp3", "wav", "m4a", "mp4"):
        ext = "webm"

    content = await file.read()
    if len(content) > MAX_VOICE_SIZE:
        raise HTTPException(status_code=413, detail="Audio file exceeds maximum size limit (10MB)")
    if len(content) < 16 or not _is_valid_audio_header(content[:32]):
        raise HTTPException(status_code=400, detail="Corrupted or invalid audio file format")

    fname = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(VOICE_DIR, fname)
    with open(path, "wb") as f:
        f.write(content)

    mentor = _peer(db, student_id, user.id)
    if user.role == "mentor":
        p = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
        if not p or p.mentor_id != user.id:
            raise HTTPException(status_code=404, detail="Student is not assigned to you")
        sender, receiver = user.id, student_id
    else:
        sender, receiver = user.id, mentor.id

    msg = Message(
        student_id=student_id,
        mentor_id=mentor.id,
        sender_id=sender,
        receiver_id=receiver,
        kind="voice",
        audio_path=f"/media/{fname}",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/conversations")
def conversations(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    rows = []
    if user.role == "mentor":
        profiles = (db.query(StudentProfile)
                    .filter(StudentProfile.mentor_id == user.id).all())
        for p in profiles:
            stu = db.query(User).filter(User.id == p.user_id).first()
            if not stu:
                continue
            last = (db.query(Message)
                    .filter(Message.student_id == stu.id,
                            Message.mentor_id == user.id)
                    .order_by(Message.created_at.desc(), Message.id.desc())
                    .first())
            rows.append({
                "student_id": stu.id,
                "peer_id": stu.id,
                "peer_name": stu.full_name,
                "peer_role": "student",
                "subtitle": f"{p.field_of_study} — {p.grade_level}",
                "last_text": last.text if last else None,
                "last_kind": last.kind if last else None,
                "last_at": last.created_at.isoformat() if last else None,
            })
    elif user.role == "student":
        p = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if p and p.mentor_id:
            mentor = db.query(User).filter(User.id == p.mentor_id).first()
            if mentor:
                last = (db.query(Message)
                        .filter(Message.student_id == user.id,
                                Message.mentor_id == mentor.id)
                        .order_by(Message.created_at.desc(), Message.id.desc())
                        .first())
                rows.append({
                    "student_id": user.id,
                    "peer_id": mentor.id,
                    "peer_name": mentor.full_name,
                    "peer_role": "mentor",
                    "subtitle": mentor.code or "",
                    "last_text": last.text if last else None,
                    "last_kind": last.kind if last else None,
                    "last_at": last.created_at.isoformat() if last else None,
                })
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")

    rows.sort(key=lambda r: r["last_at"] or "", reverse=True)
    return rows


# ── WebSocket Real-time Manager ────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.active:
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: int, payload: dict):
        for ws in self.active.get(user_id, [])[:]:
            try:
                await ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception:
                pass


manager = ConnectionManager()
ws_router = APIRouter(tags=["ws"])


@ws_router.websocket("/ws")
async def chat_ws(ws: WebSocket):
    token = ws.query_params.get("token", "")
    try:
        from ..security import decode_token
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)
    db = next(get_db())
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            student_id = data.get("student_id")
            if not student_id:
                continue

            profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
            if not profile:
                continue
            mentor_id = profile.mentor_id

            if user_id == student_id:
                sender, receiver = student_id, mentor_id
            elif user_id == mentor_id:
                sender, receiver = mentor_id, student_id
            else:
                continue

            raw_text = data.get("text", "")
            if not isinstance(raw_text, str):
                continue
            text = raw_text.strip()
            if not text or len(text) > 5000:
                continue

            msg = Message(
                student_id=student_id,
                mentor_id=mentor_id,
                sender_id=sender,
                receiver_id=receiver,
                kind="text",
                text=text,
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            payload = {
                "type": "message",
                "msg": {
                    "id": msg.id,
                    "student_id": student_id,
                    "mentor_id": mentor_id,
                    "sender_id": sender,
                    "receiver_id": receiver,
                    "kind": "text",
                    "text": msg.text,
                    "audio_path": None,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                },
            }
            await manager.send_to_user(student_id, payload)
            await manager.send_to_user(mentor_id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, ws)
        db.close()
