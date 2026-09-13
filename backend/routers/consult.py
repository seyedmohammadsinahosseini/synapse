"""Consultation booking router: mentor window scheduling and student atomic slot reservations."""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConsultSlot, StudentProfile, User
from ..security import get_current_user

mentor_router = APIRouter(prefix="/api/mentor/consult", tags=["mentor-consult"])
student_router = APIRouter(prefix="/api/consult", tags=["consult"])

DAY_MIN = 6 * 60       # 06:00
NIGHT_MIN = 23 * 60    # 23:00


def _parse_mm(v: str) -> int:
    try:
        parts = v.split(":")
        total = int(parts[0]) * 60 + int(parts[1])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format (HH:MM expected)")
    return total


def _fmt(total: int) -> str:
    return f"{total // 60:02d}:{total % 60:02d}"


def _slot_payload(s: ConsultSlot, db: Session):
    stu = db.query(User).filter(User.id == s.student_id).first() if s.student_id else None
    return {
        "id": s.id,
        "date_str": s.date_str,
        "start_min": s.start_min,
        "start": _fmt(s.start_min),
        "duration_min": s.duration_min or 45,
        "student_id": s.student_id,
        "student_name": stu.full_name if stu else None,
        "booked_at": s.booked_at.isoformat() if s.booked_at else None,
        "status": s.status or "booked",
    }


# ── Mentor Endpoints ───────────────────────────────────────────────────────
class WindowIn(BaseModel):
    date_str: str
    start: str
    end: str
    duration_min: Optional[int] = Field(default=45, ge=15, le=240)


@mentor_router.post("/window")
def open_window(data: WindowIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    try:
        d = date.fromisoformat(data.date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    if d < date.today():
        raise HTTPException(status_code=400, detail="Cannot schedule consultation slots in the past")

    start = _parse_mm(data.start)
    end = _parse_mm(data.end)
    if end <= start:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    if start < DAY_MIN or end > NIGHT_MIN:
        raise HTTPException(status_code=400, detail="Working hours must be between 06:00 and 23:00")

    slot_duration = max(15, min(240, data.duration_min or 45))
    length = end - start
    if length < slot_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Time window length ({length} mins) is shorter than slot duration ({slot_duration} mins)",
        )

    # Check for overlapping slots
    existing = (db.query(ConsultSlot)
                .filter(ConsultSlot.mentor_id == user.id,
                        ConsultSlot.date_str == data.date_str)
                .all())
    for e in existing:
        e_end = e.start_min + (e.duration_min or slot_duration)
        for m in range(start, end - (slot_duration - 1), slot_duration):
            if m < e_end and m + slot_duration > e.start_min:
                raise HTTPException(
                    status_code=409,
                    detail="Window overlaps with an existing time slot. Please remove conflicting slots first.",
                )

    created = []
    for m in range(start, end - (slot_duration - 1), slot_duration):
        slot = ConsultSlot(
            mentor_id=user.id,
            date_str=data.date_str,
            start_min=m,
            duration_min=slot_duration,
        )
        db.add(slot)
        created.append(slot)
    db.commit()
    return {
        "ok": True,
        "count": len(created),
        "slots": [_slot_payload(s, db) for s in created],
    }


@mentor_router.delete("/slot/{slot_id}")
def delete_slot(slot_id: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    slot = db.query(ConsultSlot).filter(ConsultSlot.id == slot_id).first()
    if not slot or slot.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.student_id:
        raise HTTPException(status_code=400, detail="Cannot delete an already booked slot")
    db.delete(slot)
    db.commit()
    return {"ok": True}


@mentor_router.post("/slot/{slot_id}/complete")
def complete_slot(slot_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    slot = db.query(ConsultSlot).filter(ConsultSlot.id == slot_id).first()
    if not slot or slot.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    if not slot.student_id:
        raise HTTPException(status_code=400, detail="Slot is not booked")
    slot.status = "done"
    db.commit()
    return {"ok": True}


@mentor_router.get("/calendar")
def mentor_calendar(year: int, month: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    try:
        first = date(year, month, 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month")
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)

    rows = (db.query(ConsultSlot)
            .filter(ConsultSlot.mentor_id == user.id,
                    ConsultSlot.status != "done",
                    ConsultSlot.date_str >= first.isoformat(),
                    ConsultSlot.date_str < nxt.isoformat())
            .order_by(ConsultSlot.date_str, ConsultSlot.start_min)
            .all())
    by_day: dict[str, list] = {}
    for r in rows:
        by_day.setdefault(r.date_str, []).append(_slot_payload(r, db))
    return {"year": year, "month": month, "days": by_day}


# ── Student Endpoints ──────────────────────────────────────────────────────
def _my_mentor(db: Session, user: User) -> User:
    p = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not p or not p.mentor_id:
        raise HTTPException(status_code=400, detail="No mentor attached to your profile")
    mentor = db.query(User).filter(User.id == p.mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Assigned mentor not found")
    return mentor


@student_router.get("/upcoming")
def upcoming(days: int = 14, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    mentor = _my_mentor(db, user)
    today = date.today()
    end = today + timedelta(days=max(1, min(days, 60)))
    rows = (db.query(ConsultSlot)
            .filter(ConsultSlot.mentor_id == mentor.id,
                    ConsultSlot.status != "done",
                    ConsultSlot.date_str >= today.isoformat(),
                    ConsultSlot.date_str <= end.isoformat())
            .order_by(ConsultSlot.date_str, ConsultSlot.start_min)
            .all())
    free_by_day: dict[str, list] = {}
    my_bookings = []
    for r in rows:
        payload = _slot_payload(r, db)
        if r.student_id == user.id:
            my_bookings.append(payload)
        elif r.student_id is None:
            free_by_day.setdefault(r.date_str, []).append(payload)
    return {
        "mentor_name": mentor.full_name,
        "free_by_day": free_by_day,
        "my_bookings": my_bookings,
    }


@student_router.post("/book")
def book_slot(data: dict, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    slot_id = int(data.get("slot_id") or 0)
    mentor = _my_mentor(db, user)
    slot = db.query(ConsultSlot).filter(ConsultSlot.id == slot_id).first()
    if not slot or slot.mentor_id != mentor.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.student_id:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    claimed = (db.query(ConsultSlot)
               .filter(ConsultSlot.id == slot.id,
                       ConsultSlot.student_id.is_(None))
               .update({"student_id": user.id, "booked_at": datetime.utcnow()},
                       synchronize_session=False))
    db.commit()
    if claimed != 1:
        raise HTTPException(status_code=409, detail="Slot was just reserved by another student")
    fresh = db.query(ConsultSlot).filter(ConsultSlot.id == slot_id).first()
    return {"ok": True, "slot": _slot_payload(fresh, db)}


@student_router.delete("/book/{slot_id}")
def cancel_booking(slot_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    mentor = _my_mentor(db, user)
    slot = db.query(ConsultSlot).filter(ConsultSlot.id == slot_id).first()
    if not slot or slot.mentor_id != mentor.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.student_id != user.id:
        raise HTTPException(status_code=400, detail="This reservation does not belong to you")
    slot.student_id = None
    slot.booked_at = None
    db.commit()
    return {"ok": True}
