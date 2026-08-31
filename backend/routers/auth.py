"""Authentication endpoints: registration, login, profile, and password management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..ai_service import ai
from ..database import get_db
from ..models import Notification, StudentProfile, StudyPlan, User, VideoSuggestion
from ..schemas import (LoginRequest, PasswordChangeRequest,
                       ProfileUpdateRequest, StudentRegisterRequest,
                       TokenOut, UserOut)
from ..security import (check_rate_limit, create_token, get_current_user,
                        hash_password, login_limiter, register_limiter,
                        validate_password, verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])

PRE_UNIVERSITY_GRADES = ("پیش‌دانشگاهی / کنکوری", "Pre-University / Konkur")


@router.post("/login", response_model=TokenOut, dependencies=[Depends(check_rate_limit(login_limiter))])
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return {"token": create_token(user), "user": UserOut.model_validate(user)}


@router.post("/register/student", response_model=TokenOut, dependencies=[Depends(check_rate_limit(register_limiter))])
def register_student(data: StudentRegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Optional mentor invite code check
    mentor = None
    code = (data.mentor_code or "").strip().upper()
    if code:
        mentor = db.query(User).filter(
            User.role == "mentor", User.code == code, User.is_active == True,
        ).first()
        if not mentor:
            raise HTTPException(status_code=400, detail="Invalid mentor code")

    user = User(
        role="student",
        full_name=data.full_name,
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.flush()

    subject_scores = [s.model_dump() for s in data.subject_scores]

    is_pre_university = data.grade_level in PRE_UNIVERSITY_GRADES
    goal_type = "konkur" if is_pre_university else data.goal_type
    goal_subjects = [] if is_pre_university else data.goal_subjects

    profile = StudentProfile(
        user_id=user.id,
        field_of_study=data.field_of_study,
        grade_level=data.grade_level,
        last_year_avg=data.last_year_avg,
        goal_type=goal_type,
        goal_subjects=goal_subjects,
        subject_scores=subject_scores,
        mentor_id=mentor.id if mentor else None,
    )
    db.add(profile)

    # Trigger baseline AI analysis
    analysis = ai.analyze_student({
        "full_name": data.full_name,
        "field_of_study": data.field_of_study,
        "grade_level": data.grade_level,
        "last_year_avg": data.last_year_avg,
        "goal_type": goal_type,
        "goal_subjects": goal_subjects,
        "subject_scores": subject_scores,
    })
    profile.analysis = analysis

    plan_content = analysis.get("plan", {})
    db.add(StudyPlan(student_id=user.id, content=plan_content, source="ai"))

    # Populate video recommendations
    focus = analysis.get("focus_subjects", []) or [s["subject"] for s in subject_scores[:3]]
    for v in ai.suggest_videos(focus, lang=data.lang):
        db.add(VideoSuggestion(
            student_id=user.id,
            subject=v["subject"],
            title=v["title"],
            url=v["url"],
            reason=v["reason"],
        ))

    if mentor:
        db.add(Notification(
            user_id=mentor.id,
            text=f"New student '{data.full_name}' joined using your mentor code. AI diagnostic report is ready.",
            link=f"/mentor/student/{user.id}",
        ))

    db.commit()
    db.refresh(user)
    return {"token": create_token(user), "user": UserOut.model_validate(user)}


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdateRequest, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if data.email is not None and data.email.lower().strip() != user.email:
        email = data.email.lower().strip()
        other = db.query(User).filter(User.email == email, User.id != user.id).first()
        if other:
            raise HTTPException(status_code=400, detail="Email is already in use")
        user.email = email
    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip()
    if data.address is not None:
        user.address = data.address.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/password")
def change_password(data: PasswordChangeRequest,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if data.new_password != data.new_password2:
        raise HTTPException(status_code=400, detail="Password confirmation does not match")
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as old password")
    err = validate_password(data.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True, "message": "Password updated successfully"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
