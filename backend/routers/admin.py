"""Admin endpoints: accounts management, question bank CRUD, and system analytics."""
import io
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openpyxl import load_workbook
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..ai_service import ai
from ..database import get_db
from ..models import (CurriculumSource, ExamAttempt, Message, Question,
                      StudentProfile, User, VideoSuggestion)
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
def _clean_question(item: dict, row_label: str, default_subject: str = "زیست‌شناسی"):
    """Normalize input question dictionary into a valid Question instance."""
    subject = str(item.get("subject") or default_subject or "زیست‌شناسی").strip()
    text = str(item.get("text") or item.get("question_text") or "").strip()
    qtype = str(item.get("type") or item.get("question_type") or "mcq").strip().lower()
    
    raw_ans = item.get("answer")
    if raw_ans is None:
        raw_ans = item.get("correct_answer")
    if raw_ans is None:
        raw_ans = item.get("correct_option")
    if raw_ans is None:
        raw_ans = item.get("correct")
    answer = str(raw_ans if raw_ans is not None else "0").strip()

    if not text:
        return None, f"{row_label}: متن سؤال الزامی است"

    options: List[str] = []
    raw_opt = item.get("options") or item.get("choices")
    if isinstance(raw_opt, list):
        options = [str(o).strip() for o in raw_opt if str(o).strip()]
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

    if options and qtype != "essay":
        qtype = "mcq"

    if qtype not in ("mcq", "essay", "fill"):
        qtype = "mcq" if options else "essay"

    # Difficulty parser
    raw_diff = item.get("difficulty")
    diff = 3
    if isinstance(raw_diff, (int, float)):
        diff = max(1, min(5, int(raw_diff)))
    elif isinstance(raw_diff, str):
        d_lower = raw_diff.lower()
        if "easy" in d_lower or "آسان" in d_lower:
            diff = 1
        elif "hard" in d_lower or "سخت" in d_lower:
            diff = 4
        elif "very" in d_lower or "خیلی" in d_lower:
            diff = 5
        else:
            diff = 3

    # Normalize answer for MCQ (handles 1-based e.g. "1".."4" -> "0".."3")
    if qtype == "mcq" and options:
        valid_indices = [str(i) for i in range(len(options))]
        one_based = [str(i + 1) for i in range(len(options))]
        if answer in one_based and answer not in valid_indices:
            answer = str(int(answer) - 1)
        elif answer in one_based and len(options) <= 4:
            answer = str(int(answer) - 1)
        elif answer not in valid_indices:
            answer = "0"
    elif qtype != "mcq":
        options = []

    explanation = str(item.get("explanation") or item.get("solution") or "").strip()
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
    """Universal JSON question and curriculum batch importer supporting all structured schemas."""
    raw = await file.read()
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فرمت JSON نامعتبر است: {str(e)}")

    added = 0
    errors: List[str] = []

    # Case 1: curriculum_units
    if isinstance(data, dict) and ("curriculum_units" in data or "units" in data):
        units = data.get("curriculum_units") or data.get("units") or []
        for u in units:
            unit_title = u.get("title") or u.get("book_title") or "سرفصل تحلیلی کتاب درسی"
            unit_grade = u.get("grade_level") or "دوازدهم"
            unit_field = u.get("field_of_study") or "علوم تجربی"
            unit_sub = u.get("subject") or "زیست‌شناسی"
            unit_chap = u.get("chapter_name") or u.get("chapter") or ""
            unit_sum = u.get("summary_text") or u.get("core_concepts") or ""

            src = CurriculumSource(
                title=unit_title,
                grade_level=unit_grade,
                field_of_study=unit_field,
                subject=unit_sub,
                chapter_name=unit_chap,
                summary_text=unit_sum if isinstance(unit_sum, str) else json.dumps(unit_sum, ensure_ascii=False),
                content_json=u,
                created_by=user.id,
            )
            db.add(src)

            # Ingest questions
            q_list = u.get("questions") or u.get("generated_questions") or []
            for j, item in enumerate(q_list):
                q, err = _clean_question(item, f"{unit_sub} Q{j+1}", default_subject=unit_sub)
                if err:
                    errors.append(err)
                    continue
                existing = db.query(Question).filter(Question.text == q.text).first()
                if not existing:
                    q.created_by = user.id
                    db.add(q)
                    added += 1

        db.commit()
        return {
            "imported": added,
            "errors": errors[:30],
            "error_count": len(errors),
            "message": f"تعداد {added} سؤال جدید همراه با سرفصل‌های درسی با موفقیت ثبت شدند."
        }

    # Case 2: Direct questions list or wrapped
    items = []
    default_sub = "زیست‌شناسی"
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        default_sub = data.get("subject") or "زیست‌شناسی"
        items = data.get("questions") or data.get("generated_questions") or data.get("items") or []
        if not items and ("text" in data or "question_text" in data):
            items = [data]

    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="هیچ سوال یا سرفصلی در فایل JSON یافت نشد.")

    for i, item in enumerate(items):
        try:
            d = dict(item)
        except Exception:
            errors.append(f"Row {i+1}: Invalid item structure")
            continue
        q, err = _clean_question(d, f"Row {i+1}", default_subject=default_sub)
        if err:
            errors.append(err)
            continue
        existing = db.query(Question).filter(Question.text == q.text).first()
        if not existing:
            q.created_by = user.id
            db.add(q)
            added += 1

    db.commit()
    return {
        "imported": added,
        "errors": errors[:30],
        "error_count": len(errors),
        "message": f"تعداد {added} سوال با موفقیت به بانک سوالات اضافه شد."
    }


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


# ── Admin Curriculum Knowledge Sources & AI Question Bank Generator ────────
class CurriculumSourceIn(BaseModel):
    title: str
    grade_level: str                          # دهم | یازدهم | دوازدهم
    field_of_study: str                       # علوم تجربی | ریاضی و فیزیک | علوم انسانی
    subject: str
    chapter_name: Optional[str] = ""
    summary_text: Optional[str] = ""
    content_json: Optional[dict] = None


class GenerateQuestionsFromSourceIn(BaseModel):
    count: int = 5
    difficulty: str = "medium"                # easy | medium | hard


@router.get("/curriculum")
def list_curriculum_sources(grade_level: Optional[str] = None,
                            field_of_study: Optional[str] = None,
                            subject: Optional[str] = None,
                            user = Depends(_admin),
                            db: Session = Depends(get_db)):
    """Lists all registered textbook/curriculum sources with optional grade and field filtering."""
    q = db.query(CurriculumSource)
    if grade_level:
        q = q.filter(CurriculumSource.grade_level == grade_level)
    if field_of_study:
        q = q.filter(CurriculumSource.field_of_study == field_of_study)
    if subject:
        q = q.filter(CurriculumSource.subject.contains(subject))
    sources = q.order_by(CurriculumSource.created_at.desc()).all()
    return {
        "ok": True,
        "sources": [
            {
                "id": s.id,
                "title": s.title,
                "grade_level": s.grade_level,
                "field_of_study": s.field_of_study,
                "subject": s.subject,
                "chapter_name": s.chapter_name,
                "summary_text": s.summary_text,
                "content_json": s.content_json,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sources
        ]
    }


@router.post("/curriculum")
def create_curriculum_source(data: CurriculumSourceIn,
                             user = Depends(_admin),
                             db: Session = Depends(get_db)):
    """Registers a new curriculum source / chapter concepts for AI question generation."""
    src = CurriculumSource(
        title=data.title.strip(),
        grade_level=data.grade_level.strip(),
        field_of_study=data.field_of_study.strip(),
        subject=data.subject.strip(),
        chapter_name=(data.chapter_name or "").strip(),
        summary_text=(data.summary_text or "").strip(),
        content_json=data.content_json or {},
        created_by=user.id,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return {
        "ok": True,
        "source": {
            "id": src.id,
            "title": src.title,
            "grade_level": src.grade_level,
            "field_of_study": src.field_of_study,
            "subject": src.subject,
            "chapter_name": src.chapter_name,
            "summary_text": src.summary_text,
            "created_at": src.created_at.isoformat() if src.created_at else None,
        }
    }


@router.delete("/curriculum/{source_id}")
def delete_curriculum_source(source_id: int,
                             user = Depends(_admin),
                             db: Session = Depends(get_db)):
    """Deletes a curriculum source."""
    src = db.query(CurriculumSource).filter(CurriculumSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Curriculum source not found")
    db.delete(src)
    db.commit()
    return {"ok": True}


@router.post("/curriculum/{source_id}/generate-questions")
def generate_questions_from_source(source_id: int,
                                   data: GenerateQuestionsFromSourceIn,
                                   user = Depends(_admin),
                                   db: Session = Depends(get_db)):
    """Uses AI to generate MCQ questions directly from curriculum source and saves them to Question Bank."""
    src = db.query(CurriculumSource).filter(CurriculumSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Curriculum source not found")

    content_summary = src.summary_text or (json.dumps(src.content_json, ensure_ascii=False) if src.content_json else f"سرفصل {src.chapter_name} از درس {src.subject}")
    generated_raw = ai.generate_curriculum_questions(
        grade_level=src.grade_level,
        field_of_study=src.field_of_study,
        subject=src.subject,
        chapter_name=src.chapter_name or src.title,
        content_summary=content_summary,
        count=max(1, min(data.count, 20)),
        difficulty=data.difficulty or "medium",
    )

    diff_map = {"easy": 1, "medium": 3, "hard": 5}
    diff_val = diff_map.get(data.difficulty, 3)

    saved_questions = []
    for item in generated_raw:
        q_text = item.get("question_text") or ""
        options = item.get("options") or []
        correct_ans = str(item.get("correct_answer") or "1")
        explanation = item.get("explanation") or ""

        if not q_text or len(options) < 4:
            continue

        q = Question(
            subject=src.subject,
            type="mcq",
            difficulty=diff_val,
            text=q_text,
            options=options,
            answer=correct_ans,
            explanation=explanation,
            created_by=user.id,
        )
        db.add(q)
        saved_questions.append(q)

    db.commit()
    return {
        "ok": True,
        "count_generated": len(saved_questions),
        "source_title": src.title,
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "subject": q.subject,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
            }
            for q in saved_questions
        ]
    }


@router.post("/curriculum/sync-to-bank")
def sync_all_curriculum_questions_to_bank(user = Depends(_admin), db: Session = Depends(get_db)):
    """Extracts all embedded pre-analyzed textbook questions from curriculum knowledge units and inserts non-duplicate items into Question Bank."""
    sources = db.query(CurriculumSource).all()
    added_count = 0
    skipped_count = 0

    for src in sources:
        c_json = src.content_json or {}
        q_list = c_json.get("questions") or c_json.get("generated_questions") or c_json.get("mcq_bank") or []
        for item in q_list:
            q_text = (item.get("question_text") or item.get("text") or "").strip()
            if not q_text:
                continue

            existing = db.query(Question).filter(Question.text == q_text).first()
            if existing:
                skipped_count += 1
                continue

            options = item.get("options") or []
            if len(options) < 2:
                continue

            correct_ans = str(item.get("correct_answer") or item.get("correct_option") or item.get("answer") or "1")
            explanation = item.get("explanation") or f"مرجع کتاب درسی: {src.title} - سرفصل {src.chapter_name}"
            diff = item.get("difficulty") or 3
            if isinstance(diff, str):
                diff = {"easy": 1, "medium": 3, "hard": 4, "very_hard": 5}.get(diff, 3)

            q = Question(
                subject=src.subject,
                type="mcq",
                difficulty=int(diff),
                text=q_text,
                options=options,
                answer=correct_ans,
                explanation=explanation,
                created_by=user.id,
            )
            db.add(q)
            added_count += 1

    db.commit()
    total_bank = db.query(Question).count()
    return {
        "ok": True,
        "added_count": added_count,
        "skipped_duplicates": skipped_count,
        "total_questions": total_bank,
        "message": f"تعداد {added_count} سؤال جدید از سرفصل‌ها به بانک سؤالات اضافه شد ({skipped_count} مورد تکراری نادیده گرفته شد)."
    }


class BatchImportCurriculumIn(BaseModel):
    batch_json: str


@router.post("/curriculum/import-batch-json")
def import_curriculum_batch_json(data: BatchImportCurriculumIn, user = Depends(_admin), db: Session = Depends(get_db)):
    """Imports structured curriculum JSON batches containing chapter analysis and questions."""
    try:
        payload = json.loads(data.batch_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

    units = payload if isinstance(payload, list) else payload.get("curriculum_units", [payload])
    imported_sources = 0
    imported_questions = 0

    for u in units:
        title = u.get("title") or u.get("book_title") or "سرفصل تحلیلی کتاب درسی"
        grade = u.get("grade_level") or "دوازدهم"
        field = u.get("field_of_study") or "علوم تجربی"
        subject = u.get("subject") or "زیست‌شناسی"
        chapter = u.get("chapter_name") or u.get("chapter") or ""
        summary = u.get("summary_text") or u.get("core_concepts") or ""

        src = CurriculumSource(
            title=title,
            grade_level=grade,
            field_of_study=field,
            subject=subject,
            chapter_name=chapter,
            summary_text=summary if isinstance(summary, str) else json.dumps(summary, ensure_ascii=False),
            content_json=u,
            created_by=user.id,
        )
        db.add(src)
        imported_sources += 1

        # Also ingest questions if included
        q_list = u.get("questions") or u.get("generated_questions") or []
        for q_item in q_list:
            q_text = (q_item.get("question_text") or q_item.get("text") or "").strip()
            if not q_text:
                continue
            existing = db.query(Question).filter(Question.text == q_text).first()
            if existing:
                continue
            options = q_item.get("options") or []
            if len(options) < 2:
                continue
            correct_ans = str(q_item.get("correct_answer") or q_item.get("correct_option") or "1")
            expl = q_item.get("explanation") or f"مرجع: {title} - {chapter}"
            diff = q_item.get("difficulty") or 3
            if isinstance(diff, str):
                diff = {"easy": 1, "medium": 3, "hard": 4, "very_hard": 5}.get(diff, 3)
            q = Question(
                subject=subject,
                type="mcq",
                difficulty=int(diff),
                text=q_text,
                options=options,
                answer=correct_ans,
                explanation=expl,
                created_by=user.id,
            )
            db.add(q)
            imported_questions += 1

    db.commit()
    return {
        "ok": True,
        "imported_sources": imported_sources,
        "imported_questions": imported_questions,
        "total_questions": db.query(Question).count(),
    }

