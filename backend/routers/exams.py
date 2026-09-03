"""Examination engine router: test construction, timing, submission, and automated grading."""
from datetime import datetime
from difflib import SequenceMatcher
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..ai_service import ai
from ..database import get_db
from ..models import ExamAttempt, ExamQuestion, Grade, Question, User
from ..schemas import ExamStartRequest, ExamSubmitRequest
from ..security import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["exams"])

MODEL_FILTERS = {
    "random": None,
    "essay": "essay",
    "fill": "fill",
    "mcq": "mcq",
}

# Time budget per question by difficulty (in seconds)
DIFF_TIME = {1: 60, 2: 90, 3: 120, 4: 150}


def build_attempt(db: Session, user: User, kind: str, count: int,
                  difficulty: int, model: str) -> ExamAttempt:
    qtype = MODEL_FILTERS.get(model)
    query = db.query(Question)
    if qtype:
        query = query.filter(Question.type == qtype)
    if model != "random":
        query = query.filter(Question.difficulty <= difficulty + 1)

    bank = query.all()
    pool = [q for q in bank if q.difficulty <= difficulty + 1 and q.difficulty >= max(1, difficulty - 1)]
    if len(pool) < count:
        pool = bank
    if len(pool) < count:
        raise HTTPException(status_code=400, detail="Insufficient questions in the question bank for the selected criteria")

    selected = random.sample(pool, count)
    per_question = DIFF_TIME.get(difficulty, 90)
    attempt = ExamAttempt(
        student_id=user.id,
        kind=kind,
        status="in_progress",
        difficulty=difficulty,
        question_model=model,
        total_questions=count,
        time_limit_seconds=count * per_question,
    )
    db.add(attempt)
    db.flush()

    for i, q in enumerate(selected):
        db.add(ExamQuestion(attempt_id=attempt.id, question_id=q.id, order=i + 1))

    db.commit()
    db.refresh(attempt)
    return attempt


def _public_question(q: Question) -> dict:
    d = {
        "id": q.id,
        "subject": q.subject,
        "type": q.type,
        "difficulty": q.difficulty,
        "text": q.text,
    }
    if q.type == "mcq":
        d["options"] = q.options or []
    return d


def _normalize(s: str) -> str:
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


@router.post("/exams/start")
def start_exam(data: ExamStartRequest, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    attempt = build_attempt(db, user, data.kind, data.count, data.difficulty, data.model)
    qs = db.query(ExamQuestion).filter(ExamQuestion.attempt_id == attempt.id)\
           .order_by(ExamQuestion.order).all()
    return {
        "exam_id": attempt.id,
        "kind": attempt.kind,
        "time_limit_seconds": attempt.time_limit_seconds,
        "total_questions": attempt.total_questions,
        "difficulty": attempt.difficulty,
        "model": attempt.question_model,
        "questions": [_public_question(eq.question) for eq in qs],
    }


@router.get("/exams/{exam_id}")
def get_exam(exam_id: int, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == exam_id, ExamAttempt.student_id == user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam not found")
    if attempt.status == "submitted":
        return _result_payload(db, attempt)

    qs = db.query(ExamQuestion).filter(ExamQuestion.attempt_id == attempt.id)\
           .order_by(ExamQuestion.order).all()
    return {
        "exam_id": attempt.id,
        "kind": attempt.kind,
        "status": attempt.status,
        "time_limit_seconds": attempt.time_limit_seconds,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "total_questions": attempt.total_questions,
        "questions": [_public_question(eq.question) for eq in qs],
    }


@router.post("/exams/{exam_id}/submit")
def submit_exam(exam_id: int, data: ExamSubmitRequest,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == exam_id, ExamAttempt.student_id == user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam not found")
    if attempt.status == "submitted":
        return _result_payload(db, attempt)

    answers = {a.question_id: a for a in data.answers}
    eqs = db.query(ExamQuestion).filter(ExamQuestion.attempt_id == attempt.id).all()
    per_question_score = 20.0 / max(1, len(eqs))
    details = {"per_question": []}
    total = 0.0

    for eq in eqs:
        q = eq.question
        ans = answers.get(q.id)
        if q.type == "mcq":
            choice = ans.choice if ans and ans.choice is not None else None
            correct = False
            try:
                correct = str(choice) == q.answer.strip()
            except Exception:
                correct = False
            score = per_question_score if correct else 0.0
            eq.user_answer = {"choice": choice}
            eq.is_correct = correct
            eq.score = round(score, 1)
            eq.feedback = "Correct answer" if correct else "Incorrect answer"
        elif q.type == "fill":
            given = (ans.text if ans else "") or ""
            expected = q.answer
            ok = (_normalize(given) == _normalize(expected)
                  or (given and expected and
                      _ratio(_normalize(given), _normalize(expected)) >= 0.85))
            score = per_question_score if ok else 0.0
            eq.user_answer = {"text": given}
            eq.is_correct = ok
            eq.score = round(score, 1)
            eq.feedback = "Correct answer" if ok else "Incorrect answer"
        else:  # Subjective essay question evaluated via AI
            given = (ans.text if ans else "") or ""
            keywords = [k.strip() for k in (q.answer or "").split("|") if k.strip()]
            ai_grade = ai.grade_essay(given, keywords)
            score = float(ai_grade.get("score", per_question_score * 0.5))
            score = min(20.0, score * (per_question_score / 20.0))
            eq.user_answer = {"text": given}
            eq.is_correct = score >= per_question_score * 0.6
            eq.score = round(score, 1)
            eq.feedback = ai_grade.get("feedback", "")

        total += eq.score
        details["per_question"].append({
            "question_id": q.id,
            "order": eq.order,
            "subject": q.subject,
            "type": q.type,
            "score": eq.score,
            "max": round(per_question_score, 1),
            "correct": eq.is_correct,
            "feedback": eq.feedback,
        })

    attempt.total_score = round(total, 1)
    attempt.status = "submitted"
    attempt.submitted_at = datetime.utcnow()
    attempt.details = details
    db.commit()

    # Record subject grade entry
    for d in details["per_question"]:
        db.add(Grade(
            student_id=user.id,
            subject=d["subject"],
            score=d["score"],
            source=attempt.kind,
            year_label=f"Exam #{attempt.id}",
        ))
    db.commit()
    return _result_payload(db, attempt)


def _result_payload(db: Session, attempt: ExamAttempt) -> dict:
    eqs = db.query(ExamQuestion).filter(ExamQuestion.attempt_id == attempt.id)\
            .order_by(ExamQuestion.order).all()
    qs = []
    for eq in eqs:
        q = eq.question
        d = _public_question(q)
        d["user_answer"] = eq.user_answer
        d["score"] = eq.score
        d["is_correct"] = eq.is_correct
        d["feedback"] = eq.feedback
        d["correct_answer"] = q.answer
        if q.type == "mcq":
            d["correct_answer_label"] = (q.options or [])[int(q.answer)] if q.answer.isdigit() and int(q.answer) < len(q.options or []) else q.answer
        qs.append(d)

    return {
        "exam_id": attempt.id,
        "kind": attempt.kind,
        "status": attempt.status,
        "total_score": attempt.total_score,
        "total_questions": attempt.total_questions,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": qs,
    }


@router.get("/exams")
def my_exams(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == user.id)\
                 .order_by(ExamAttempt.started_at.desc()).all()
    return [{
        "id": a.id,
        "kind": a.kind,
        "status": a.status,
        "difficulty": a.difficulty,
        "question_model": a.question_model,
        "total_questions": a.total_questions,
        "total_score": a.total_score,
        "started_at": a.started_at.isoformat() if a.started_at else None,
    } for a in attempts]


@router.get("/questions")
def list_questions(subject: str = None, type: str = None, limit: int = 100,
                   user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    q = db.query(Question)
    if subject:
        q = q.filter(Question.subject == subject)
    if type:
        q = q.filter(Question.type == type)
    return [_public_question(x) for x in q.limit(limit).all()]
