"""AI assistant router: conversation history, stateful test wizard, and plan rendering."""
import threading

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..ai_service import (DIFFICULTY_LABELS, MODEL_LABELS, ai, fa_number)
from ..database import get_db
from ..models import (AiChatMessage, ExamAttempt, StudentProfile, StudyPlan,
                      User)
from ..security import (ai_chat_limiter, check_rate_limit, get_current_user)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# In-memory assistant wizard state: {user_id: {"state": str, "params": dict}}
_assistant_state = {}
_state_lock = threading.Lock()


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    lang: str = Field(default="fa", max_length=10)


def _student_context(profile: StudentProfile, lang: str = "fa") -> dict:
    return {
        "name": profile.user.full_name if profile.user else "",
        "field": profile.field_of_study,
        "goal": profile.goal_type,
        "subject_scores": profile.subject_scores,
        "lang": lang,
    }


def _parse_count(msg: str) -> int | None:
    for token in msg.split():
        digits = "".join(ch for ch in token if ch.isdigit() or ch in "۰۱۲۳۴۵۶۷۸۹")
        if digits:
            fa_to_en = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
            try:
                n = int(digits.translate(fa_to_en))
                if 1 <= n <= 60:
                    return n
            except ValueError:
                pass
    return None


def _parse_difficulty(msg: str) -> int | None:
    for token in msg.split():
        digits = "".join(ch for ch in token if ch.isdigit() or ch in "۰۱۲۳۴۵۶۷۸۹")
        if digits:
            fa_to_en = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
            try:
                n = int(digits.translate(fa_to_en))
                if 1 <= n <= 4:
                    return n
            except ValueError:
                pass
    return None


MODEL_KEYWORDS = {
    "random": ["تصادف", "همه", "ترکیب", "random", "1"],
    "essay": ["تشریح", "essay", "2"],
    "fill": ["جای خالی", "جاخالی", "fill", "3"],
    "mcq": ["چهارگزینه", "چهار گزینه", "تستی", "mcq", "4"],
}


def _parse_model(msg: str) -> str | None:
    m = msg.strip().lower()
    for key, kws in MODEL_KEYWORDS.items():
        for kw in kws:
            if kw in m or m == kw:
                return key
    return None


def _create_exam(db: Session, user: User, kind: str, count: int,
                 difficulty: int, model: str) -> ExamAttempt:
    from .exams import build_attempt
    return build_attempt(db, user, kind, count, difficulty, model)


def _handle_assistant(db: Session, user: User, profile: StudentProfile,
                      msg: str, lang: str) -> dict:
    """State machine wizard for interactive test builder and AI chat."""
    is_en = lang == "en"
    with _state_lock:
        state = _assistant_state.get(user.id, {"state": "idle", "params": {}})
        s = state["state"]

        # ── Command: /plan ──────────────────────────────────────────────
        if msg.startswith("/plan") or s == "show_plan":
            plan = db.query(StudyPlan).filter(StudyPlan.student_id == user.id).first()
            _assistant_state[user.id] = {"state": "idle", "params": {}}
            if plan and plan.content:
                return {"reply": _render_plan(plan.content, is_en), "action": None}
            return {
                "reply": "No study plan created yet. Initializing your custom plan..." if is_en else "هنوز برنامه‌ای برای شما ساخته نشده است. در حال آماده‌سازی برنامه...",
                "action": None,
            }

        # ── Command: /test or /exam (start wizard) ──────────────────────
        if s == "idle" and (msg.startswith("/test") or msg.startswith("/exam")):
            kind = "test" if msg.startswith("/test") else "exam"
            _assistant_state[user.id] = {"state": "ask_count", "params": {"kind": kind}}
            if is_en:
                return {
                    "reply": f"{'Quick Test' if kind == 'test' else 'Full Exam'} initiated! 🎯\n1. How many questions would you like? (1 to 60)",
                    "action": None,
                }
            return {
                "reply": (
                    f"{'آزمون سریع' if kind == 'test' else 'امتحان'} شروع شد! 🎯\n"
                    "۱. چند سؤال می‌خواهید؟ (بین ۱ تا ۶۰ — عدد بنویسید)"
                ),
                "action": None,
            }

        # ── Step 1: Question Count ──────────────────────────────────────
        if s == "ask_count":
            n = _parse_count(msg)
            if n is None:
                return {
                    "reply": "Please enter a valid number (e.g. 10)." if is_en else "لطفاً فقط تعداد سؤالات را به عدد بنویسید (مثلاً ۱۰).",
                    "action": None,
                }
            state["params"]["count"] = n
            _assistant_state[user.id] = {"state": "ask_difficulty", "params": state["params"]}
            if is_en:
                return {
                    "reply": f"{n} questions set! 👌\n2. Select difficulty level:\n1) Easy   2) Medium   3) Hard   4) Very Hard\n(Enter 1 to 4)",
                    "action": None,
                }
            return {
                "reply": (
                    f"{fa_number(n)} سؤال، عالی! 👌\n"
                    "۲. سختی سؤالات چقدر باشد؟\n"
                    "۱) آسان   ۲) متوسط   ۳) سخت   ۴) خیلی سخت\n"
                    "(عدد ۱ تا ۴ را بنویسید)"
                ),
                "action": None,
            }

        # ── Step 2: Difficulty Level ────────────────────────────────────
        if s == "ask_difficulty":
            d = _parse_difficulty(msg)
            if d is None:
                return {
                    "reply": "Please enter a number between 1 and 4." if is_en else "لطفاً عدد ۱ تا ۴ را بنویسید (۱ آسان، ۲ متوسط، ۳ سخت، ۴ خیلی سخت).",
                    "action": None,
                }
            state["params"]["difficulty"] = d
            _assistant_state[user.id] = {"state": "ask_model", "params": state["params"]}
            if is_en:
                return {
                    "reply": f"Difficulty set. ⏱\n3. Choose question format:\n1) Mixed / Random\n2) Essay only\n3) Fill-in-the-blank only\n4) Multiple Choice (MCQ)\n(Enter number or name)",
                    "action": None,
                }
            return {
                "reply": (
                    f"سختی «{DIFFICULTY_LABELS[d]}» ثبت شد. ⏱\n"
                    "۳. مدل سؤالات کدام باشد؟\n"
                    "۱) تصادفی از همهٔ سؤالات\n"
                    "۲) فقط تشریحی\n"
                    "۳) فقط جای خالی\n"
                    "۴) فقط چهارگزینه‌ای\n"
                    "(عدد یا نام مدل را بنویسید)"
                ),
                "action": None,
            }

        # ── Step 3: Question Format & Generation ────────────────────────
        if s == "ask_model":
            model = _parse_model(msg)
            if model is None:
                return {
                    "reply": "Please choose: 1) Mixed  2) Essay  3) Fill-in  4) Multiple Choice" if is_en else "لطفاً انتخاب کنید: ۱) تصادفی  ۲) تشریحی  ۳) جای خالی  ۴) چهارگزینه‌ای",
                    "action": None,
                }
            p = state["params"]
            attempt = _create_exam(db, user, p["kind"], p["count"], p["difficulty"], model)
            _assistant_state[user.id] = {"state": "idle", "params": {}}
            label = MODEL_LABELS.get(model, model)
            secs = attempt.time_limit_seconds or 0
            minutes = round(secs / 60)
            if is_en:
                return {
                    "reply": f"✅ {p['count']} questions ({model}) created with difficulty level {p['difficulty']}.\n⏱ Time limit: {minutes} minutes.\nExam room is ready — good luck! 🌟",
                    "action": "open_exam",
                    "exam_id": attempt.id,
                }
            return {
                "reply": (
                    f"✅ {fa_number(p['count'])} سؤال با مدل «{label}» و سختی "
                    f"«{DIFFICULTY_LABELS.get(p['difficulty'])}» آماده شد.\n"
                    f"⏱ زمان: {fa_number(minutes)} دقیقه.\n"
                    "پنل آزمون برای شما باز شد — موفق باشید! 🌟"
                ),
                "action": "open_exam",
                "exam_id": attempt.id,
            }

        # ── Free-form AI Chat ───────────────────────────────────────────
        context = _student_context(profile, lang)
        reply = ai.chat([{"role": "user", "content": msg}], context)
        return {"reply": reply, "action": None}


@router.post("/chat", dependencies=[Depends(check_rate_limit(ai_chat_limiter))])
def assistant_chat(data: ChatIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=403, detail="Student account required")

    msg = data.message.strip()
    resp = _handle_assistant(db, user, profile, msg, data.lang)

    # Persist message history
    db.add(AiChatMessage(student_id=user.id, role="user", content=msg))
    db.add(AiChatMessage(student_id=user.id, role="ai", content=resp["reply"]))
    db.commit()
    return resp


@router.get("/chat/history")
def chat_history(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    rows = (db.query(AiChatMessage)
            .filter(AiChatMessage.student_id == user.id)
            .order_by(AiChatMessage.created_at.desc(), AiChatMessage.id.desc())
            .limit(200).all())
    rows.reverse()
    return [{
        "role": m.role,
        "content": m.content,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in rows]


def _render_plan(content: dict, is_en: bool = False) -> str:
    if is_en:
        lines = [f"📋 Study Schedule (Generated: {content.get('generated_at', '')}):"]
        lines.append(content.get("summary", ""))
        for day in content.get("weekly", []):
            sessions = " — ".join(
                f"{s['subject']} ({s['hours']}h: {s['focus']})"
                for s in day.get("sessions", [])
            )
            lines.append(f"• {day.get('day')}: {sessions}")
        return "\n".join(lines)

    lines = [f"📋 برنامهٔ مطالعهٔ شما (تولید {content.get('generated_at', '')}):"]
    lines.append(content.get("summary", ""))
    for day in content.get("weekly", []):
        sessions = " — ".join(
            f"{s['subject']} ({fa_number(s['hours'])} ساعت: {s['focus']})"
            for s in day.get("sessions", [])
        )
        lines.append(f"• {day.get('day')}: {sessions}")
    return "\n".join(lines)


@router.get("/plan")
def get_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(StudyPlan).filter(StudyPlan.student_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return {"content": plan.content}


@router.get("/videos")
def get_videos(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import VideoSuggestion
    videos = db.query(VideoSuggestion).filter(VideoSuggestion.student_id == user.id).all()
    return [{
        "subject": v.subject,
        "title": v.title,
        "url": v.url,
        "reason": v.reason,
        "source": v.source,
        "views": v.views,
        "likes": v.likes,
    } for v in videos]
