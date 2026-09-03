"""Support ticket router: student inquiries, bug reports, and admin triage."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import StudentProfile, SupportTicket, User
from ..security import get_current_user

router = APIRouter(tags=["support"])


def _admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class SupportIn(BaseModel):
    category: str = "support"       # support | bug | feedback
    content: str = Field(min_length=3, max_length=2000)


@router.post("/api/support/send")
def send_ticket(data: SupportIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    content = data.content.strip()
    if len(content) < 3:
        raise HTTPException(status_code=400, detail="Message is too short")
    cat = data.category if data.category in ("support", "bug", "feedback") else "support"
    db.add(SupportTicket(student_id=user.id, category=cat, content=content[:2000]))
    db.commit()
    return {"ok": True}


def _row(db: Session, ticket: SupportTicket) -> dict:
    stu = db.query(User).filter(User.id == ticket.student_id).first()
    p = (db.query(StudentProfile)
         .filter(StudentProfile.user_id == ticket.student_id).first())
    return {
        "id": ticket.id,
        "student_id": ticket.student_id,
        "full_name": stu.full_name if stu else "(Deleted User)",
        "email": stu.email if stu else "",
        "phone": stu.phone or "" if stu else "",
        "address": stu.address or "" if stu else "",
        "field": p.field_of_study if p else "",
        "grade": p.grade_level if p else "",
        "category": ticket.category,
        "content": ticket.content,
        "is_read": bool(ticket.is_read),
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
    }


@router.get("/api/admin/support")
def list_tickets(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _admin(user)
    rows = db.query(SupportTicket).order_by(SupportTicket.created_at.desc(),
                                            SupportTicket.id.desc()).all()
    return [_row(db, t) for t in rows]


@router.get("/api/admin/support/unread-count")
def unread_count(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _admin(user)
    n = db.query(SupportTicket).filter(SupportTicket.is_read.is_(False)).count()
    return {"count": n}


@router.post("/api/admin/support/{ticket_id}/read")
def mark_read(ticket_id: int, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    _admin(user)
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/api/admin/support/read-all")
def read_all(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    _admin(user)
    db.query(SupportTicket).filter(SupportTicket.is_read.is_(False))\
        .update({SupportTicket.is_read: True})
    db.commit()
    return {"ok": True}
