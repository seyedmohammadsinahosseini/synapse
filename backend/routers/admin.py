"""Admin endpoints: accounts management, question bank CRUD, and system analytics."""
import io
import json
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openpyxl import load_workbook
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (ExamAttempt, Message, Question, StudentProfile, User,
                      VideoSuggestion)
from ..schemas import (MentorCreateRequest, MentorEditRequest,
                       QuestionIn, QuestionOut, StudentEditRequest)
from ..security import get_current_user, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── System Analytics ───────────────────────────────────────────────────────
@router.get("/stats")
def stats(user = Depends(_admin), db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student").count()
    mentors = db.query(User).filter(User.role == "mentor").count()
    questions = db.query(Question).count()
    attempts = db.query(ExamAttempt).count()
    submitted = db.query(ExamAttempt).filter(ExamAttempt.status == "submitted").all()
    avg_score = round(sum(a.total_score or 0 for a in submitted) / len(submitted), 1) if submitted else None
    msgs = db.query(Message).count()
    return {
        "students": students, "mentors": mentors, "questions": questions,
        "attempts": attempts, "avg_score": avg_score, "messages": msgs,
    }


# ── User Management ────────────────────────────────────────────────────────
@router.get("/students")
def all_students(user = Depends(_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "student").all()
    out = []
    for u in users:
        p = db.query(StudentProfile).filter(StudentProfile.user_id == u.id).first()
        m = db.query(User).filter(User.id == p.mentor_id).first() if p and p.mentor_id else None
        out.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "field_of_study": p.field_of_study if p else None,
            "grade_level": p.grade_level if p else None,
            "last_year_avg": p.last_year_avg if p else None,
            "goal_type": p.goal_type if p else None,
            "mentor": m.full_name if m else None,
            "joined": u.created_at.isoformat() if u.created_at else None,
        })
    return out


@router.get("/mentors")
def all_mentors(user = Depends(_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "mentor").all()
    out = []
    for u in users:
        cnt = db.query(StudentProfile).filter(StudentProfile.mentor_id == u.id).count()
        out.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "code": u.code,
            "is_active": u.is_active,
            "student_count": cnt,
        })
    return out


@router.post("/mentors", response_model=dict)
def create_mentor(data: MentorCreateRequest, user = Depends(_admin),
                  db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already in use")
    code = data.code.strip().upper()
    if db.query(User).filter(User.code == code).first():
        raise HTTPException(status_code=400, detail="Mentor code is already registered")
    m = User(
        role="mentor",
        full_name=data.full_name,
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        code=code,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "code": m.code, "full_name": m.full_name}


@router.patch("/mentors/{mentor_id}/toggle")
def toggle_mentor(mentor_id: int, user = Depends(_admin), db: Session = Depends(get_db)):
    m = db.query(User).filter(User.id == mentor_id, User.role == "mentor").first()
    if not m:
        raise HTTPException(status_code=404, detail="Mentor not found")
    m.is_active = not m.is_active
    db.commit()
    return {"id": m.id, "is_active": m.is_active}


@router.patch("/students/{student_id}")
def edit_student(student_id: int, data: StudentEditRequest,
                 user = Depends(_admin), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    if data.email is not None:
        email = data.email.lower().strip()
        other = db.query(User).filter(User.email == email, User.id != student_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Email is already in use")
        s.email = email
    if data.full_name is not None:
        s.full_name = data.full_name
    if data.phone is not None:
        s.phone = data.phone
    if data.password:
        s.password_hash = hash_password(data.password)
    p = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if p:
        for field in ("field_of_study", "grade_level", "goal_type"):
            val = getattr(data, field)
            if val is not None:
                setattr(p, field, val)
    db.commit()
    return {"ok": True}


@router.delete("/students/{student_id}")
def delete_student(student_id: int, user = Depends(_admin), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    from ..models import (ConsultSlot, ExamAttempt, ExamQuestion, Grade,
                          Message, Notification, PlanProgress, StudyPlan,
                          SupervisionEntry, SupportTicket, VideoSuggestion)
    db.query(Message).filter(Message.student_id == student_id).delete()
    db.query(Grade).filter(Grade.student_id == student_id).delete()
    db.query(Notification).filter(Notification.user_id == student_id).delete()
    db.query(StudyPlan).filter(StudyPlan.student_id == student_id).delete()
    db.query(PlanProgress).filter(PlanProgress.student_id == student_id).delete()
    db.query(SupervisionEntry).filter(SupervisionEntry.student_id == student_id).delete()
    db.query(VideoSuggestion).filter(VideoSuggestion.student_id == student_id).delete()
    db.query(SupportTicket).filter(SupportTicket.student_id == student_id).delete()
    db.query(ConsultSlot).filter(ConsultSlot.student_id == student_id).update({
        ConsultSlot.student_id: None,
        ConsultSlot.booked_at: None,
    })
    for att in db.query(ExamAttempt).filter(ExamAttempt.student_id == student_id).all():
        db.query(ExamQuestion).filter(ExamQuestion.attempt_id == att.id).delete()
        db.delete(att)
    db.query(StudentProfile).filter(StudentProfile.user_id == student_id).delete()
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.patch("/mentors/{mentor_id}")
def edit_mentor(mentor_id: int, data: MentorEditRequest,
                user = Depends(_admin), db: Session = Depends(get_db)):
    m = db.query(User).filter(User.id == mentor_id, User.role == "mentor").first()
    if not m:
        raise HTTPException(status_code=404, detail="Mentor not found")
    if data.email is not None:
        email = data.email.lower().strip()
        other = db.query(User).filter(User.email == email, User.id != mentor_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Email is already in use")
        m.email = email
    if data.full_name is not None:
        m.full_name = data.full_name
    if data.phone is not None:
        m.phone = data.phone
    if data.code is not None:
        code = data.code.strip().upper()
        other = db.query(User).filter(User.code == code, User.id != mentor_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Mentor code is already in use")
        m.code = code
    if data.password:
        m.password_hash = hash_password(data.password)
    if data.is_active is not None:
        m.is_active = data.is_active
    db.commit()
    return {"ok": True}


@router.delete("/mentors/{mentor_id}")
def delete_mentor(mentor_id: int, user = Depends(_admin), db: Session = Depends(get_db)):
    m = db.query(User).filter(User.id == mentor_id, User.role == "mentor").first()
    if not m:
        raise HTTPException(status_code=404, detail="Mentor not found")
    # Unlink assigned students
    db.query(StudentProfile).filter(StudentProfile.mentor_id == mentor_id).update({
        StudentProfile.mentor_id: None,
    })
    db.query(User).filter(User.id == mentor_id).delete()
    db.commit()
    return {"ok": True}


# ── Question Bank CRUD ─────────────────────────────────────────────────────
@router.get("/questions", response_model=list[QuestionOut])
def admin_questions(user = Depends(_admin), db: Session = Depends(get_db)):
    return db.query(Question).order_by(Question.id.desc()).all()


@router.post("/questions", response_model=QuestionOut)
def add_question(data: QuestionIn, user = Depends(_admin), db: Session = Depends(get_db)):
    q = Question(**data.model_dump(), created_by=user.id)
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.put("/questions/{qid}", response_model=QuestionOut)
def update_question(qid: int, data: QuestionIn, user = Depends(_admin),
                    db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for k, v in data.model_dump().items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/questions/{qid}")
def delete_question(qid: int, user = Depends(_admin), db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"ok": True}


# ── Bulk Imports (JSON / Excel) ────────────────────────────────────────────
def _clean_question(item: dict, row_label: str):
    """Normalize input question dictionary into a valid Question instance."""
    subject = str(item.get("subject") or "").strip()
    text = str(item.get("text") or "").strip()
    qtype = str(item.get("type") or "").strip().lower()
    answer = str(item.get("answer") or "").strip()
    if not subject or not text or not answer:
        return None, f"{row_label}: subject, text, and answer are required fields"
    if qtype not in ("mcq", "essay", "fill"):
        return None, f"{row_label}: Invalid question type '{qtype}' (mcq, essay, or fill expected)"
    try:
        diff = int(item.get("difficulty") or 2)
        diff = max(1, min(5, diff))
    except (TypeError, ValueError):
        diff = 2

    options: List[str] = []
    raw_opt = item.get("options")
    if isinstance(raw_opt, list):
        options = [str(o) for o in raw_opt if str(o).strip()]
    elif isinstance(raw_opt, str) and raw_opt.strip():
        options = [o.strip() for o in str(raw_opt).replace("،", "|").replace(",", "|").split("|") if o.strip()]

    # Fallback for excel columnar format
    if not options:
        for k in ("option_1", "option1", "a", "option_a"):
            v = item.get(k)
            if v and str(v).strip():
                options = [str(v).strip()]
                for j in range(2, 9):
                    vv = item.get(f"option_{j}") or item.get(f"option{j}")
                    if vv and str(vv).strip():
                        options.append(str(vv).strip())
                break

    if qtype == "mcq":
        if len(options) < 2:
            return None, f"{row_label}: Multiple choice questions require at least 2 options"
        if answer not in [str(i) for i in range(len(options))]:
            return None, f"{row_label}: Answer must be a zero-based option index (0 to {len(options)-1})"
    else:
        options = []

    explanation = str(item.get("explanation") or "").strip()
    q = Question(
        subject=subject,
        type=qtype,
        difficulty=diff,
        text=text,
        options=options,
        answer=answer,
        explanation=explanation,
    )
    return q, None


@router.post("/questions/import/json")
async def import_json(file: UploadFile = File(...), user = Depends(_admin),
                      db: Session = Depends(get_db)):
    raw = await file.read()
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format")

    items = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="JSON array of question items expected")

    added = 0
    errors: List[str] = []
    for i, item in enumerate(items):
        try:
            d = dict(item)
        except Exception:
            errors.append(f"Row {i+1}: Invalid item structure")
            continue
        q, err = _clean_question(d, f"Row {i+1}")
        if err:
            errors.append(err)
            continue
        q.created_by = user.id
        db.add(q)
        added += 1

    db.commit()
    return {"imported": added, "errors": errors[:30], "error_count": len(errors)}


@router.post("/questions/import/excel")
async def import_excel(file: UploadFile = File(...), user = Depends(_admin),
                       db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only Excel (.xlsx) files are supported")

    try:
        wb = load_workbook(io.BytesIO(await file.read()), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to parse Excel workbook")

    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    try:
        header = [str(c).strip().lower() if c is not None else "" for c in next(rows)]
    except StopIteration:
        raise HTTPException(status_code=400, detail="Excel spreadsheet is empty")

    def cell_map(row):
        return {header[i]: row[i] for i in range(min(len(header), len(row)))}

    added = 0
    errors: List[str] = []
    for idx, row in enumerate(rows, start=2):
        if row is None or all(c is None or str(c).strip() == "" for c in row):
            continue
        q, err = _clean_question(cell_map(row), f"Row {idx}")
        if err:
            errors.append(err)
            continue
        q.created_by = user.id
        db.add(q)
        added += 1

    db.commit()
    return {"imported": added, "errors": errors[:30], "error_count": len(errors)}


# ── AI Bi-Weekly Nightly Maintenance ──────────────────────────────────────────
@router.post("/ai/nightly-sync")
def ai_nightly_sync(user = Depends(_admin), db: Session = Depends(get_db)):
    """Runs automated bi-weekly diagnostic and confidential dossier refresh for active students."""
    from datetime import datetime, timedelta
    from ..ai_service import ai
    from ..models import ExamAttempt, PlanProgress, ReportCard, StudentProfile

    profiles = db.query(StudentProfile).all()
    refreshed_count = 0
    now = datetime.utcnow()
    two_weeks_ago = now - timedelta(days=14)

    for p in profiles:
        last_refreshed_str = (p.ai_dossier or {}).get("last_refreshed")
        needs_refresh = False
        if not last_refreshed_str:
            needs_refresh = True
        else:
            try:
                dt = datetime.fromisoformat(last_refreshed_str.replace("Z", ""))
                if dt < two_weeks_ago:
                    needs_refresh = True
            except ValueError:
                needs_refresh = True

        if needs_refresh:
            rcs = db.query(ReportCard).filter(ReportCard.student_id == p.user_id).all()
            attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == p.user_id).all()
            tasks_progress = db.query(PlanProgress).filter(PlanProgress.student_id == p.user_id).all()

            student_ctx = {
                "full_name": p.user.full_name if p.user else "دانش‌آموز",
                "grade_level": p.grade_level,
                "field_of_study": p.field_of_study,
                "last_year_avg": p.last_year_avg,
                "goal_type": p.goal_type,
                "subject_scores": p.subject_scores or [],
            }
            rc_list = [
                {
                    "title": rc.title,
                    "provider": rc.provider,
                    "exam_date": rc.exam_date,
                    "overall_traz": rc.total_traz,
                    "subjects": rc.parsed_data.get("subjects", []) if rc.parsed_data else [],
                }
                for rc in rcs
            ]
            attempts_list = [
                {"kind": a.kind, "score": a.total_score, "date": a.started_at.isoformat() if a.started_at else None}
                for a in attempts if a.total_score is not None
            ]

            # Generate new diagnostic and atomically swap
            new_diag = ai.standardized_student_diagnostic(
                student_profile=student_ctx,
                report_cards=rc_list,
                exam_attempts=attempts_list,
                task_history=[{"date": t.date_str, "status": t.status} for t in tasks_progress],
            )
            p.analysis = new_diag
            p.ai_dossier = {
                "analytical_dossier": new_diag.get("confidential_dossier"),
                "subject_breakdowns": new_diag.get("subject_breakdowns"),
                "last_refreshed": new_diag.get("last_refreshed", now.isoformat()),
            }
            refreshed_count += 1

    db.commit()
    return {"ok": True, "refreshed_students": refreshed_count, "timestamp": now.isoformat()}
