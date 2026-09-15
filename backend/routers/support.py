"""Support ticket router: student/mentor inquiries, bug reports, and admin triage."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import StudentProfile, SupportTicket, TicketMessage, User
from ..security import get_current_user

router = APIRouter(tags=["support"])


def _admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class SupportIn(BaseModel):
    category: str = "support"       # support | bug | feedback
    content: str = Field(min_length=3, max_length=2000)


class ReplyIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


@router.post("/api/support/send")
def send_ticket(data: SupportIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    content = data.content.strip()
    if len(content) < 3:
        raise HTTPException(status_code=400, detail="Message is too short")
    cat = data.category if data.category in ("support", "bug", "feedback") else "support"
    ticket = SupportTicket(student_id=user.id, category=cat, content=content[:2000])
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    # Add initial message into thread
    db.add(TicketMessage(ticket_id=ticket.id, sender_id=user.id, sender_role=user.role, text=content[:2000]))
    db.commit()
    return {"ok": True, "ticket_id": ticket.id}


def _row(db: Session, ticket: SupportTicket) -> dict:
    stu = db.query(User).filter(User.id == ticket.student_id).first()
    p = (db.query(StudentProfile)
         .filter(StudentProfile.user_id == ticket.student_id).first())
    msg_count = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket.id).count()
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
        "messages_count": msg_count,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
    }


@router.get("/api/support/my-tickets")
def my_tickets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(SupportTicket).filter(SupportTicket.student_id == user.id)\
             .order_by(SupportTicket.created_at.desc()).all()
    return [_row(db, t) for t in rows]


@router.get("/api/support/tickets/{ticket_id}/messages")
def get_ticket_messages(ticket_id: int, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user.role != "admin" and ticket.student_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    msgs = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id)\
             .order_by(TicketMessage.created_at.asc()).all()
    result = []
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": sender.full_name if sender else "کاربر",
            "sender_role": m.sender_role or (sender.role if sender else "user"),
            "content": m.text,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return {"ok": True, "ticket": _row(db, ticket), "messages": result}


@router.post("/api/support/tickets/{ticket_id}/reply")
def reply_to_ticket(ticket_id: int, data: ReplyIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user.role != "admin" and ticket.student_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    msg = TicketMessage(ticket_id=ticket.id, sender_id=user.id, sender_role=user.role, text=content)
    if user.role != "admin":
        ticket.is_read = False
    db.add(msg)
    db.commit()
    return {"ok": True, "message_id": msg.id}


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

