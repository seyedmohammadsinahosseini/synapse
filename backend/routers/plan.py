"""Study plan and supervision router: drag-and-drop planning, capacity alerts, and multi-week completion tracking."""
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (DailyCapacityAlert, PlanProgress, StudentProfile,
                      StudyPlan, SupervisionEntry, User)
from ..security import get_current_user

router = APIRouter(prefix="/api", tags=["plan"])

PERSIAN_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
_EN_DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]


def iran_weekday(d: date) -> int:
    return (d.weekday() + 2) % 7  # Python Mon=0 -> Iran Sat=0


def weekday_of_label(label: str):
    if not label:
        return None
    lab = str(label).strip().lower().replace(" ", "").replace("\u200c", "")
    for i, d in enumerate(PERSIAN_DAYS):
        canon = d.replace(" ", "").replace("\u200c", "")
        if lab == canon:
            return i
    if lab in _EN_DAYS:
        return _EN_DAYS.index(lab)
    return None


def saturday_start(day: date) -> date:
    return day - timedelta(days=iran_weekday(day))


def week_dates(start: date) -> list[date]:
    return [start + timedelta(days=i) for i in range(7)]


def persian_day_label(d: date) -> str:
    return PERSIAN_DAYS[iran_weekday(d)]


DEFAULT_TEMPLATE = {
    "weekly": [
        {"day": "شنبه", "sessions": [
            {"subject": "ریاضی", "topic": "حل تمرین و مرور فرمول‌ها", "duration_minutes": 90, "study_method": "study", "notes": ""},
            {"subject": "فیزیک", "topic": "مرور فصل جاری و تست آموزشی", "duration_minutes": 90, "study_method": "test", "question_count": 30, "notes": "کتاب تست خیلی سبز"},
        ]},
        {"day": "یکشنبه", "sessions": [
            {"subject": "شیمی", "topic": "خواندن درس + تست", "duration_minutes": 100, "study_method": "test", "question_count": 25, "notes": ""},
            {"subject": "زبان انگلیسی", "topic": "لغات و گرامر", "duration_minutes": 60, "study_method": "review", "notes": ""},
        ]},
        {"day": "دوشنبه", "sessions": [
            {"subject": "ریاضی", "topic": "تمرین نکات مهم", "duration_minutes": 90, "study_method": "essay", "question_count": 15, "notes": ""},
            {"subject": "زیست‌شناسی", "topic": "مطالعه و مرور متن کتاب", "duration_minutes": 120, "study_method": "study", "notes": "نکته‌برداری در حاشیه"},
        ]},
        {"day": "سه‌شنبه", "sessions": [
            {"subject": "فیزیک", "topic": "حل مسئله", "duration_minutes": 90, "study_method": "study", "notes": ""},
            {"subject": "ادبیات فارسی", "topic": "آرایه‌ها و قرابت معنایی", "duration_minutes": 60, "study_method": "review", "notes": ""},
        ]},
        {"day": "چهارشنبه", "sessions": [
            {"subject": "شیمی", "topic": "تست و جمع‌بندی", "duration_minutes": 90, "study_method": "test", "question_count": 30, "notes": ""},
            {"subject": "عربی", "topic": "قواعد و ترجمه", "duration_minutes": 60, "study_method": "study", "notes": ""},
        ]},
        {"day": "پنجشنبه", "sessions": [
            {"subject": "مرور هفتگی", "topic": "جمع‌بندی دروس هفته", "duration_minutes": 120, "study_method": "review", "notes": ""},
        ]},
        {"day": "جمعه", "sessions": [
            {"subject": "آزمون آزمایشی", "topic": "آزمون جامع هفتگی", "duration_minutes": 90, "study_method": "test", "question_count": 50, "notes": ""},
        ]},
    ],
}


def template_days():
    return [{"label": w["day"], "tasks": list(w["sessions"])} for w in DEFAULT_TEMPLATE["weekly"]]


def get_student_plan(db: Session, student_id: int) -> StudyPlan | None:
    return db.query(StudyPlan).filter(StudyPlan.student_id == student_id).first()


def plan_completion(db: Session, student_id: int, days: int = 7):
    """Calculate task completion percentage and engagement color."""
    end = date.today()
    start = end - timedelta(days=days - 1)
    rows = (db.query(PlanProgress)
            .filter(PlanProgress.student_id == student_id,
                    PlanProgress.date_str >= start.isoformat(),
                    PlanProgress.date_str <= end.isoformat())
            .all())
    sup = (db.query(SupervisionEntry)
           .filter(SupervisionEntry.student_id == student_id,
                   SupervisionEntry.text != "",
                   SupervisionEntry.status.in_(["done", "missed"]),
                   SupervisionEntry.date_str >= start.isoformat(),
                   SupervisionEntry.date_str <= end.isoformat())
           .all())

    done = sum(1 for r in rows if r.status == "done") + sum(1 for r in sup if r.status == "done")
    missed = sum(1 for r in rows if r.status == "missed") + sum(1 for r in sup if r.status == "missed")
    total = done + missed

    if total == 0:
        return {"total": 0, "done": 0, "missed": 0, "pct": None, "color": None}

    pct = round(done * 100 / total)
    if pct >= 50:
        color = "ok"      # green
    elif pct >= 25:
        color = "mid"     # yellow
    else:
        color = "low"     # red

    return {"total": total, "done": done, "missed": missed, "pct": pct, "color": color}


def normalize_weekly_days(weekly):
    out = []
    for w in (weekly or []):
        label = w.get("day") or w.get("label") or ""
        sess = w.get("sessions") or w.get("tasks") or []
        tasks = []
        for j, s in enumerate(sess):
            dur = s.get("duration_minutes")
            if dur is None:
                dur = round(float(s.get("hours", 1.5)) * 60)
            tasks.append({
                "id": s.get("id") or f"task_{j}_{int(datetime.now().timestamp())}",
                "index": j,
                "subject": s.get("subject", ""),
                "topic": s.get("topic") or s.get("focus") or "",
                "duration_minutes": int(dur),
                "hours": round(int(dur) / 60, 1),
                "study_method": s.get("study_method") or "study",
                "question_count": s.get("question_count"),
                "notes": s.get("notes") or "",
                "priority": s.get("priority") or "medium",
            })
        out.append({"label": label, "tasks": tasks, "weekday": weekday_of_label(label)})
    return out


# ── Student Endpoints ──────────────────────────────────────────────────────
@router.get("/plan")
def my_plan(week_start: Optional[str] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    plan = get_student_plan(db, user.id)
    today = date.today()
    cur_sat = saturday_start(today)

    if week_start:
        try:
            target_sat = saturday_start(date.fromisoformat(week_start))
        except ValueError:
            target_sat = cur_sat
    else:
        target_sat = cur_sat

    target_sat_str = target_sat.isoformat()
    t_idx = iran_weekday(today) if target_sat == cur_sat else -1

    alerts = db.query(DailyCapacityAlert).filter(
        DailyCapacityAlert.student_id == user.id,
        DailyCapacityAlert.date_str >= target_sat_str,
        DailyCapacityAlert.date_str <= (target_sat + timedelta(days=6)).isoformat(),
    ).all()
    alerts_map = {a.date_str: {"max_hours": a.max_hours, "reason": a.reason} for a in alerts}

    base = {
        "plan_exists": False,
        "week_start": target_sat_str,
        "source": None,
        "mentor_name": None,
        "date_str": today.isoformat(),
        "today_index": t_idx,
        "days": [],
        "capacity_alerts": alerts_map,
        "week": {"total": 0, "done": 0, "missed": 0, "pct": None, "color": None},
    }
    if not plan:
        return base

    mentor = db.query(User).filter(User.id == plan.mentor_id).first() if plan.mentor_id else None
    content = plan.content or {}
    base["mentor_name"] = mentor.full_name if mentor else None

    # Check if a plan exists for this specific week_start
    weeks_dict = content.get("weeks", {})
    specific_week_data = weeks_dict.get(target_sat_str)

    weekly_raw = None
    plan_source = plan.source or "mentor"

    if specific_week_data:
        # If it is a draft AI plan, student CANNOT see it until mentor approves!
        if specific_week_data.get("status") == "approved":
            weekly_raw = specific_week_data.get("weekly")
            plan_source = specific_week_data.get("source", "mentor")
            base["plan_exists"] = True
    elif target_sat == cur_sat:
        # Backward compatibility for current week
        weekly_raw = content.get("weekly")
        base["plan_exists"] = bool(weekly_raw and len(weekly_raw) > 0)

    base["source"] = plan_source

    if not weekly_raw:
        # Return empty 7 days for this week
        empty_days = []
        for i, dname in enumerate(PERSIAN_DAYS):
            d_date = target_sat + timedelta(days=i)
            empty_days.append({
                "index": i,
                "label": dname,
                "date_str": d_date.isoformat(),
                "is_today": (target_sat == cur_sat and i == t_idx),
                "total_minutes": 0,
                "is_over_capacity": False,
                "capacity_warning": None,
                "capacity_limit": alerts_map.get(d_date.isoformat()),
                "tasks": [],
            })
        base["days"] = empty_days
        return base

    days = normalize_weekly_days(weekly_raw)

    done_map = {}
    progress_rows = (db.query(PlanProgress)
                     .filter(PlanProgress.plan_id == plan.id,
                             PlanProgress.student_id == user.id,
                             PlanProgress.date_str >= target_sat_str,
                             PlanProgress.date_str <= (target_sat + timedelta(days=6)).isoformat())
                     .all())
    for r in progress_rows:
        done_map[(r.date_str, r.day_index, r.task_index)] = {
            "status": r.status,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }

    # Map normalized days to their weekday index (0..6)
    day_map = {d["weekday"]: d for d in days if d["weekday"] is not None}
    for i, d in enumerate(days):
        if d.get("weekday") is None and i < 7 and i not in day_map:
            day_map[i] = d

    out_days = []
    for i, dname in enumerate(PERSIAN_DAYS):
        day_date = target_sat + timedelta(days=i)
        day_date_str = day_date.isoformat()
        is_today = (target_sat == cur_sat and i == t_idx)

        d = day_map.get(i)
        day_tasks_raw = d["tasks"] if d else []
        total_day_min = sum(t["duration_minutes"] for t in day_tasks_raw)
        alert_info = alerts_map.get(day_date_str)
        is_over_cap = False
        cap_warning = None
        if alert_info and total_day_min > (alert_info["max_hours"] * 60):
            is_over_cap = True
            cap_warning = f"زمان اختصاص داده شده ({round(total_day_min/60, 1)} ساعت) بیشتر از ظرفیت اعلامی شما ({alert_info['max_hours']} ساعت) است."

        tasks = []
        for task in day_tasks_raw:
            st_info = done_map.get((day_date_str, i, task["index"]))
            tasks.append({
                **task,
                "status": st_info["status"] if st_info else None,
                "completed_at": st_info["completed_at"] if st_info else None,
            })

        out_days.append({
            "index": i,
            "label": dname,
            "date_str": day_date_str,
            "is_today": is_today,
            "total_minutes": total_day_min,
            "is_over_capacity": is_over_cap,
            "capacity_warning": cap_warning,
            "capacity_limit": alert_info,
            "tasks": tasks,
        })

    base["days"] = out_days
    base["week"] = plan_completion(db, user.id)
    return base
    base["supervision_week"] = supervision_week(db, user.id, target_sat)
    base["summary"] = content.get("summary", "")
    base["generated_at"] = content.get("generated_at", "")
    return base


class TaskIn(BaseModel):
    day_index: int = 0
    task_index: int = 0
    status: str = ""       # "done" | "missed" | "" (clear)
    date_str: Optional[str] = None


@router.post("/plan/task")
def set_task(data: TaskIn, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    if data.status not in ("done", "missed", ""):
        raise HTTPException(status_code=400, detail="Invalid task status")

    plan = get_student_plan(db, user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not configured")

    target_date_str = data.date_str or date.today().isoformat()
    row = (db.query(PlanProgress)
           .filter(PlanProgress.plan_id == plan.id,
                   PlanProgress.student_id == user.id,
                   PlanProgress.date_str == target_date_str,
                   PlanProgress.day_index == data.day_index,
                   PlanProgress.task_index == data.task_index)
           .first())

    if data.status == "":
        if row:
            db.delete(row)
            db.commit()
        return {"ok": True, "status": None}

    now_ts = datetime.utcnow()
    if not row:
        row = PlanProgress(
            plan_id=plan.id,
            student_id=user.id,
            date_str=target_date_str,
            day_index=data.day_index,
            task_index=data.task_index,
            status=data.status,
            completed_at=now_ts if data.status == "done" else None,
        )
        db.add(row)
    else:
        row.status = data.status
        row.completed_at = now_ts if data.status == "done" else None

    db.commit()
    return {
        "ok": True,
        "status": data.status,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }


# ── Capacity Alerts (Student Time Constraints) ─────────────────────────────
class CapacityAlertIn(BaseModel):
    date_str: str = Field(min_length=10, max_length=10)
    max_hours: float = Field(ge=0.5, le=16.0)
    reason: str = Field(default="", max_length=255)


@router.post("/plan/capacity-alert")
def set_capacity_alert(
    data: CapacityAlertIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    row = db.query(DailyCapacityAlert).filter(
        DailyCapacityAlert.student_id == user.id,
        DailyCapacityAlert.date_str == data.date_str,
    ).first()

    if not row:
        row = DailyCapacityAlert(
            student_id=user.id,
            date_str=data.date_str,
            max_hours=data.max_hours,
            reason=data.reason.strip(),
        )
        db.add(row)
    else:
        row.max_hours = data.max_hours
        row.reason = data.reason.strip()

    db.commit()
    return {
        "ok": True,
        "date_str": data.date_str,
        "max_hours": data.max_hours,
        "reason": data.reason,
    }


@router.delete("/plan/capacity-alert/{date_str}")
def delete_capacity_alert(
    date_str: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    db.query(DailyCapacityAlert).filter(
        DailyCapacityAlert.student_id == user.id,
        DailyCapacityAlert.date_str == date_str,
    ).delete()
    db.commit()
    return {"ok": True}


# ── Supervision Program (Mentor Daily Agenda) ──────────────────────────────
SUPERVISION_PARTS = [
    {"part": 0, "from": "08:00", "to": "09:30"},
    {"part": 1, "from": "09:45", "to": "11:15"},
    {"part": 2, "from": "11:30", "to": "13:00"},
    {"part": 3, "from": "16:00", "to": "17:30"},
    {"part": 4, "from": "17:45", "to": "19:15"},
    {"part": 5, "from": "19:30", "to": "21:00"},
]


def supervision_week(db: Session, student_id: int, start: date | None = None,
                     mentor_id: int | None = None):
    start = start or saturday_start(date.today())
    rows = (db.query(SupervisionEntry)
            .filter(SupervisionEntry.student_id == student_id,
                    SupervisionEntry.date_str >= start.isoformat(),
                    SupervisionEntry.date_str <= (start + timedelta(days=6)).isoformat())
            .order_by(SupervisionEntry.date_str, SupervisionEntry.part)
            .all())

    by_day = {}
    for r in rows:
        by_day.setdefault(r.date_str, {})[r.part] = r

    days = []
    for d in week_dates(start):
        parts = []
        for sp in SUPERVISION_PARTS:
            e = by_day.get(d.isoformat(), {}).get(sp["part"])
            if e and e.text.strip():
                parts.append({
                    "part": sp["part"],
                    "from": sp["from"],
                    "to": sp["to"],
                    "text": e.text,
                    "status": e.status,
                })
        days.append({
            "date_str": d.isoformat(),
            "label": persian_day_label(d),
            "weekday": iran_weekday(d),
            "parts": parts,
        })
    return days


class SupervTaskIn(BaseModel):
    date_str: str = ""
    part: int = 0
    status: str = ""


@router.post("/plan/supervision/task")
def set_supervision(data: SupervTaskIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    if data.status not in ("done", "missed", ""):
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.part < 0 or data.part > 5:
        raise HTTPException(status_code=400, detail="Invalid time block index")

    entry = (db.query(SupervisionEntry)
             .filter(SupervisionEntry.student_id == user.id,
                     SupervisionEntry.date_str == data.date_str,
                     SupervisionEntry.part == data.part)
             .first())
    if not entry or not entry.text.strip():
        return {"ok": True}

    entry.status = data.status or "todo"
    db.commit()
    return {"ok": True, "status": entry.status}
