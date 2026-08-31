"""Student dashboard router: academic summaries, exam history, study plans, and notifications."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (ExamAttempt, Grade, Notification, StudentProfile,
                      StudyPlan, User, VideoSuggestion)
from ..security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class MentorCodeIn(BaseModel):
    code: str = Field(min_length=1, max_length=40)


@router.post("/connect-mentor")
def connect_mentor(data: MentorCodeIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Bind student profile to a mentor using invite code."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=403, detail="Student account required")

    code = (data.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Please enter a valid mentor code")

    mentor = db.query(User).filter(
        User.role == "mentor", User.code == code, User.is_active == True,
    ).first()
    if not mentor:
        raise HTTPException(status_code=400, detail="Invalid mentor code")

    if profile.mentor_id != mentor.id:
        profile.mentor_id = mentor.id
        db.add(Notification(
            user_id=mentor.id,
            text=f"Student '{user.full_name}' connected to your roster via mentor code.",
            link=f"/mentor/student/{user.id}",
        ))
        db.commit()

    return {"mentor_name": mentor.full_name, "mentor_code": mentor.code}


@router.get("/")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        return {"role": user.role}

    mentor = db.query(User).filter(User.id == profile.mentor_id).first() if profile.mentor_id else None
    grades = db.query(Grade).filter(Grade.student_id == user.id).order_by(Grade.created_at).all()
    attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == user.id)\
                 .order_by(ExamAttempt.started_at.desc()).limit(20).all()
    plan = db.query(StudyPlan).filter(StudyPlan.student_id == user.id).first()
    videos = db.query(VideoSuggestion).filter(VideoSuggestion.student_id == user.id).all()
    notifs = db.query(Notification).filter(Notification.user_id == user.id)\
               .order_by(Notification.created_at.desc()).limit(10).all()

    reported = sorted(profile.subject_scores or [], key=lambda s: -s["score"])
    exam_scores = [
        {"id": a.id, "kind": a.kind, "score": a.total_score,
         "date": a.started_at.isoformat() if a.started_at else None}
        for a in attempts if a.total_score is not None
    ]
    latest_avg = attempts[0].total_score if attempts and attempts[0].total_score is not None else None

    return {
        "role": user.role,
        "profile": {
            "full_name": user.full_name,
            "email": user.email,
            "field_of_study": profile.field_of_study,
            "grade_level": profile.grade_level,
            "last_year_avg": profile.last_year_avg,
            "goal_type": profile.goal_type,
            "goal_subjects": profile.goal_subjects or [],
            "mentor_name": mentor.full_name if mentor else None,
            "mentor_code": mentor.code if mentor else None,
        },
        "analysis": profile.analysis or {},
        "reported_subjects": reported,
        "exam_scores": exam_scores,
        "latest_exam_avg": latest_avg,
        "plan": plan.content if plan else None,
        "plan_source": plan.source if plan else None,
        "plan_mentor_name": (db.query(User).filter(User.id == plan.mentor_id).first().full_name
                             if plan and plan.mentor_id else None),
        "videos": [{
            "subject": v.subject,
            "title": v.title,
            "url": v.url,
            "reason": v.reason,
            "source": v.source,
            "views": v.views,
            "likes": v.likes,
        } for v in videos],
        "notifications": [{
            "id": n.id,
            "text": n.text,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in notifs],
        "exam_count": len(attempts),
        "tests_taken": sum(1 for a in attempts if a.kind == "test"),
        "exams_taken": sum(1 for a in attempts if a.kind == "exam"),
    }
