"""Mentor router: student roster management, diagnostic inspections, study plan assignments, and daily supervision."""
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (ConsultSlot, DailyCapacityAlert, ExamAttempt, Grade,
                      PlanProgress, ReportCard, StudentProfile, StudyPlan,
                      SupervisionEntry, User, VideoSuggestion)
from ..routers.plan import (SUPERVISION_PARTS, iran_weekday,
                            normalize_weekly_days, plan_completion,
                            saturday_start, supervision_week,
                            template_days, week_dates)
from ..schemas import StudentEditRequest
from ..security import get_current_user

router = APIRouter(prefix="/api/mentor", tags=["mentor"])


def _mentor_guard(user: User):
    if user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor privileges required")
    return user


@router.get("/students")
def my_students(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _mentor_guard(user)
    profiles = db.query(StudentProfile).filter(StudentProfile.mentor_id == user.id).all()
    out = []
    for p in profiles:
        stu = db.query(User).filter(User.id == p.user_id).first()
        if not stu:
            continue
        attempts = db.query(ExamAttempt).filter(
            ExamAttempt.student_id == p.user_id,
            ExamAttempt.status == "submitted",
        ).all()
        scores = [a.total_score for a in attempts if a.total_score is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else None
        plan = db.query(StudyPlan).filter(StudyPlan.student_id == stu.id).first()
        comp = plan_completion(db, stu.id) if plan else {
            "total": 0, "done": 0, "missed": 0, "pct": None, "color": None,
        }
        report_cards_count = db.query(ReportCard).filter(ReportCard.student_id == stu.id).count()

        out.append({
            "id": stu.id,
            "full_name": stu.full_name,
            "email": stu.email,
            "field_of_study": p.field_of_study,
            "grade_level": p.grade_level,
            "goal_type": p.goal_type,
            "goal_label": p.analysis.get("goal_label") if p.analysis else None,
            "exam_avg": avg,
            "exam_count": len(attempts),
            "report_cards_count": report_cards_count,
            "joined": stu.created_at.isoformat() if stu.created_at else None,
            "analysis_ready": bool(p.analysis),
            "plan_source": plan.source if plan else None,
            "plan_pct": comp["pct"],
            "plan_color": comp["color"],
        })
    return out


@router.get("/students/{student_id}")
def student_detail(student_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")
    stu = db.query(User).filter(User.id == student_id).first()

    attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == student_id)\
                 .order_by(ExamAttempt.started_at.desc()).all()
    grades = db.query(Grade).filter(Grade.student_id == student_id)\
              .order_by(Grade.created_at.desc()).all()
    videos = db.query(VideoSuggestion).filter(VideoSuggestion.student_id == student_id).all()
    report_cards = db.query(ReportCard).filter(ReportCard.student_id == student_id)\
                     .order_by(ReportCard.created_at.desc()).all()

    today = date.today()
    start_sat = saturday_start(today)
    alerts = db.query(DailyCapacityAlert).filter(
        DailyCapacityAlert.student_id == student_id,
        DailyCapacityAlert.date_str >= start_sat.isoformat(),
        DailyCapacityAlert.date_str <= (start_sat + timedelta(days=6)).isoformat(),
    ).all()
    alerts_map = {a.date_str: {"max_hours": a.max_hours, "reason": a.reason} for a in alerts}

    subject_stats = {}
    for g in grades:
        entry = subject_stats.setdefault(g.subject, {"count": 0, "total": 0, "scores": []})
        entry["count"] += 1
        entry["total"] += g.score
        entry["scores"].append(g.score)

    subject_summary = [{
        "subject": k,
        "avg": round(v["total"] / v["count"], 1),
        "count": v["count"],
    } for k, v in subject_stats.items()]

    plan = db.query(StudyPlan).filter(StudyPlan.student_id == student_id).first()
    comp = plan_completion(db, student_id) if plan else {
        "total": 0, "done": 0, "missed": 0, "pct": None, "color": None,
    }

    weekly_normalized = normalize_weekly_days((plan.content or {}).get("weekly")) if plan else []
    # Check each day against capacity alerts
    for i, day_item in enumerate(weekly_normalized):
        day_date = start_sat + timedelta(days=i if i < 7 else 0)
        day_date_str = day_date.isoformat()
        total_dur = sum(t["duration_minutes"] for t in day_item["tasks"])
        alert_info = alerts_map.get(day_date_str)
        day_item["date_str"] = day_date_str
        day_item["total_minutes"] = total_dur
        day_item["capacity_limit"] = alert_info
        day_item["is_over_capacity"] = bool(alert_info and total_dur > (alert_info["max_hours"] * 60))

    return {
        "student": {
            "id": stu.id,
            "full_name": stu.full_name,
            "email": stu.email,
            "phone": stu.phone or "",
            "field_of_study": profile.field_of_study,
            "grade_level": profile.grade_level,
            "last_year_avg": profile.last_year_avg,
            "goal_type": profile.goal_type,
            "goal_subjects": profile.goal_subjects or [],
        },
        "plan": {
            "exists": bool(plan),
            "source": plan.source if plan else None,
            "generated_at": (plan.content or {}).get("generated_at", "") if plan else "",
            "weekly": weekly_normalized,
            "capacity_alerts": alerts_map,
            "completion": comp,
        },
        "analysis": profile.analysis or {},
        "ai_dossier": profile.ai_dossier or {},
        "report_cards": [{
            "id": rc.id,
            "title": rc.title,
            "provider": rc.provider,
            "exam_date": rc.exam_date,
            "total_traz": rc.total_traz,
            "overall_rank": rc.overall_rank,
            "parsed_data": rc.parsed_data,
            "ai_insights": rc.ai_insights,
            "created_at": rc.created_at.isoformat() if rc.created_at else None,
        } for rc in report_cards],
        "reported_subjects": profile.subject_scores or [],
        "attempts": [{
            "id": a.id,
            "kind": a.kind,
            "status": a.status,
            "difficulty": a.difficulty,
            "question_model": a.question_model,
            "total_questions": a.total_questions,
            "total_score": a.total_score,
            "started_at": a.started_at.isoformat() if a.started_at else None,
        } for a in attempts],
        "subject_summary": subject_summary,
        "videos": [{
            "subject": v.subject,
            "title": v.title,
            "url": v.url,
            "reason": v.reason,
            "source": v.source,
            "views": v.views,
            "likes": v.likes,
        } for v in videos],
    }


@router.get("/plans/template")
def plan_template(user: User = Depends(get_current_user)):
    _mentor_guard(user)
    return {"days": template_days()}


class MentorPlanIn(BaseModel):
    days: List[Dict[str, Any]]  # [{label, tasks:[{subject, topic, duration_minutes, study_method, question_count, notes}]}]


@router.put("/students/{student_id}/plan")
def assign_plan(student_id: int, data: MentorPlanIn,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")

    weekly = []
    for i, d in enumerate(data.days):
        label = (d.get("label") or "").strip() or f"Day {i+1}"
        sessions = []
        for j, t in enumerate(d.get("tasks") or []):
            subj = (t.get("subject") or "").strip()
            if not subj:
                continue

            dur = t.get("duration_minutes")
            if dur is None:
                try:
                    dur = round(float(t.get("hours") or 1.5) * 60)
                except (TypeError, ValueError):
                    dur = 90
            else:
                try:
                    dur = int(dur)
                except (TypeError, ValueError):
                    dur = 90

            dur = max(15, min(360, dur))  # between 15 mins and 6 hours
            study_method = str(t.get("study_method") or "study").strip().lower()
            if study_method not in ("test", "essay", "study", "review"):
                study_method = "study"

            q_cnt = t.get("question_count")
            if q_cnt is not None:
                try:
                    q_cnt = int(q_cnt)
                except (TypeError, ValueError):
                    q_cnt = None

            sessions.append({
                "id": t.get("id") or f"sess_{i}_{j}_{int(datetime.utcnow().timestamp())}",
                "subject": subj,
                "topic": (t.get("topic") or t.get("focus") or "").strip(),
                "duration_minutes": dur,
                "study_method": study_method,
                "question_count": q_cnt,
                "notes": (t.get("notes") or "").strip(),
            })
        weekly.append({"day": label, "sessions": sessions})

    content = {
        "weekly": weekly,
        "summary": f"Study plan configured by mentor {user.full_name}",
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "mentor_plan": True,
    }

    plan = db.query(StudyPlan).filter(StudyPlan.student_id == student_id).first()
    if plan:
        plan.content = content
        plan.source = "mentor"
        plan.mentor_id = user.id
    else:
        plan = StudyPlan(
            student_id=student_id,
            content=content,
            source="mentor",
            mentor_id=user.id,
        )
        db.add(plan)

    db.commit()
    return {"ok": True, "source": "mentor"}


@router.get("/stats")
def mentor_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _mentor_guard(user)
    profiles = db.query(StudentProfile).filter(StudentProfile.mentor_id == user.id).all()
    plans_given = 0
    colors = {"ok": 0, "mid": 0, "low": 0, "none": 0}
    for p in profiles:
        sp = db.query(StudyPlan).filter(StudyPlan.student_id == p.user_id).first()
        if sp and sp.source == "mentor":
            plans_given += 1
        c = plan_completion(db, p.user_id)["color"]
        colors[c if c else "none"] += 1

    today = date.today()
    end = today + timedelta(days=7)
    booked = (db.query(ConsultSlot)
              .filter(ConsultSlot.mentor_id == user.id,
                      ConsultSlot.student_id.isnot(None),
                      ConsultSlot.date_str >= today.isoformat(),
                      ConsultSlot.date_str <= end.isoformat())
              .count())

    return {
        "students": len(profiles),
        "plans_given": plans_given,
        "color_counts": colors,
        "booked_week": booked,
    }


class SupervDayIn(BaseModel):
    date_str: str
    parts: list


@router.put("/students/{student_id}/supervision/day")
def save_supervision_day(student_id: int, data: SupervDayIn,
                         user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")
    try:
        date.fromisoformat(data.date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    for item in data.parts:
        raw = item.get("part")
        part = int(raw) if raw is not None else -1
        if part < 0 or part > 5:
            raise HTTPException(status_code=400, detail="Invalid time block index (0 to 5 expected)")
        text = (item.get("text") or "").strip()
        entry = (db.query(SupervisionEntry)
                 .filter(SupervisionEntry.student_id == student_id,
                         SupervisionEntry.date_str == data.date_str,
                         SupervisionEntry.part == part)
                 .first())
        if not text:
            if entry:
                db.delete(entry)
            continue
        if entry:
            entry.text = text
        else:
            db.add(SupervisionEntry(
                student_id=student_id,
                mentor_id=user.id,
                date_str=data.date_str,
                part=part,
                text=text,
            ))

    db.commit()
    return {"ok": True}


@router.get("/students/{student_id}/supervision")
def get_supervision(student_id: int, start: str | None = None,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")
    start_date = None
    if start:
        try:
            start_date = date.fromisoformat(start)
            start_date = saturday_start(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    return {
        "start": (start_date or saturday_start(date.today())).isoformat(),
        "days": supervision_week(db, student_id, start_date),
    }


@router.get("/students/{student_id}/analysis")
def performance_analysis(student_id: int, lang: str = "fa", user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")

    today = date.today()
    start = today - timedelta(days=13)

    def _stats_for(day: date):
        ds = day.isoformat()
        pr = db.query(PlanProgress).filter(
            PlanProgress.student_id == student_id,
            PlanProgress.date_str == ds,
        ).all()
        su = db.query(SupervisionEntry).filter(
            SupervisionEntry.student_id == student_id,
            SupervisionEntry.date_str == ds,
            SupervisionEntry.text != "",
            SupervisionEntry.status.in_(["done", "missed"]),
        ).all()
        done = sum(1 for r in pr if r.status == "done") + sum(1 for r in su if r.status == "done")
        missed = sum(1 for r in pr if r.status == "missed") + sum(1 for r in su if r.status == "missed")
        total = done + missed
        return {
            "done": done,
            "missed": missed,
            "pct": round(done * 100 / total) if total else None,
        }

    days = []
    fa_days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"]
    fa_short_days = ["ش", "ی", "د", "س", "چ", "پ", "ج"]
    en_days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
    for i in range(14):
        d = start + timedelta(days=i)
        st = _stats_for(d)
        w_idx = iran_weekday(d)
        days.append({
            "date": d.isoformat(),
            "weekday_index": w_idx,
            "label": en_days[w_idx] if lang == "en" else fa_short_days[w_idx],
            "label_fa": fa_short_days[w_idx],
            "label_fa_full": fa_days[w_idx],
            "label_en": en_days[w_idx],
            **st,
        })
    week = plan_completion(db, student_id)
    return {
        "days": days,
        "week": week,
        "week_start": saturday_start(today).isoformat(),
    }


@router.patch("/students/{student_id}/profile")
def edit_student_profile(student_id: int, data: StudentEditRequest,
                         user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    _mentor_guard(user)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if not profile or profile.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Student is not assigned to your account")
    stu = db.query(User).filter(User.id == student_id).first()

    if data.full_name is not None and data.full_name.strip():
        stu.full_name = data.full_name.strip()
    if data.phone is not None:
        stu.phone = data.phone.strip()
    for field in ("field_of_study", "grade_level", "goal_type"):
        val = getattr(data, field)
        if val is not None and str(val).strip():
            setattr(profile, field, str(val).strip())
    if data.goal_subjects is not None:
        profile.goal_subjects = list(data.goal_subjects)
    if data.last_year_avg is not None:
        try:
            profile.last_year_avg = round(float(data.last_year_avg), 2)
        except (TypeError, ValueError):
            pass

    db.commit()
    return {"ok": True}
