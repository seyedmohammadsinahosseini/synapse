"""Study plan and supervision router: daily tasks progress tracking and schedule templates."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (PlanProgress, StudentProfile, StudyPlan,
                      SupervisionEntry, User)
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


DEFAULT_TEMPLATE = {
    "weekly": [
        {"day": "شنبه", "sessions": [
            {"subject": "ریاضی", "hours": 2, "focus": "حل تمرین و مرور فرمول‌ها"},
            {"subject": "فیزیک", "hours": 1.5, "focus": "مرور فصل جاری و تست آموزشی"},
        ]},
        {"day": "یکشنبه", "sessions": [
            {"subject": "شیمی", "hours": 2, "focus": "خواندن درس + تست"},
            {"subject": "زبان انگلیسی", "hours": 1, "focus": "لغات و گرامر"},
        ]},
        {"day": "دوشنبه", "sessions": [
            {"subject": "ریاضی", "hours": 1.5, "focus": "تمرین نکات مهم"},
            {"subject": "زیست‌شناسی", "hours": 2, "focus": "مطالعه و مرور"},
        ]},
        {"day": "سه‌شنبه", "sessions": [
            {"subject": "فیزیک", "hours": 1.5, "focus": "حل مسئله"},
            {"subject": "ادبیات فارسی", "hours": 1, "focus": "آرایه‌ها و قرابت معنایی"},
        ]},
        {"day": "چهارشنبه", "sessions": [
            {"subject": "شیمی", "hours": 1.5, "focus": "تست و جمع‌بندی"},
            {"subject": "عربی", "hours": 1, "focus": "قواعد و ترجمه"},
        ]},
        {"day": "پنجشنبه", "sessions": [
            {"subject": "مرور هفتگی", "hours": 2, "focus": "جمع‌بندی دروس هفته"},
        ]},
        {"day": "جمعه", "sessions": [
            {"subject": "آزمون و استراحت", "hours": 1, "focus": "آزمون آزمایشی یا مرور سبک"},
        ]},
    ],
}


def template_days():
    return [{"label": w["day"], "tasks": list(w["sessions"])} for w in DEFAULT_TEMPLATE["weekly"]]


def get_student_plan(db: Session, student_id: int) -> StudyPlan | None:
    return db.query(StudyPlan).filter(StudyPlan.student_id == student_id).first()


def _today_range() -> tuple[date, date]:
    end = date.today()
    start = end - timedelta(days=6)
    return start, end


def plan_completion(db: Session, student_id: int, days: int = 7):
    """Calculate task completion percentage over the given trailing days."""
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
            tasks.append({
                "index": j,
                "subject": s.get("subject", ""),
                "hours": s.get("hours", 1),
                "focus": s.get("focus", ""),
            })
        out.append({"label": label, "tasks": tasks, "weekday": weekday_of_label(label)})
    return out


# ── Student Endpoints ──────────────────────────────────────────────────────
@router.get("/plan")
def my_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    plan = get_student_plan(db, user.id)
    today = date.today()
    t_idx = iran_weekday(today)
    base = {
        "plan_exists": bool(plan),
        "source": plan.source if plan else None,
        "mentor_name": None,
        "date_str": today.isoformat(),
        "today_index": t_idx,
        "days": [],
        "week": {"total": 0, "done": 0, "missed": 0, "pct": None, "color": None},
    }
    if not plan:
        return base

    mentor = db.query(User).filter(User.id == plan.mentor_id).first() if plan.mentor_id else None
    content = plan.content or {}
    days = normalize_weekly_days(content.get("weekly"))
    base["mentor_name"] = mentor.full_name if mentor else None

    done_map = {}
    today_rows = (db.query(PlanProgress)
                  .filter(PlanProgress.plan_id == plan.id,
                          PlanProgress.student_id == user.id,
                          PlanProgress.date_str == today.isoformat())
                  .all())
    for r in today_rows:
        done_map[(r.day_index, r.task_index)] = r.status

    out_days = []
    for i, d in enumerate(days):
        is_today = (d["weekday"] == t_idx)
        tasks = []
        for task in d["tasks"]:
            st = done_map.get((i, task["index"]))
            tasks.append({**task, "status": st if is_today else None})
        out_days.append({"index": i, "label": d["label"], "is_today": is_today, "tasks": tasks})

    base["days"] = out_days
    base["week"] = plan_completion(db, user.id)
    base["supervision_week"] = supervision_week(db, user.id)
    base["summary"] = content.get("summary", "")
    base["generated_at"] = content.get("generated_at", "")
    return base


class TaskIn(BaseModel):
    day_index: int = 0
    task_index: int = 0
    status: str = ""       # "done" | "missed" | "" (clear)


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

    date_str = date.today().isoformat()
    row = (db.query(PlanProgress)
           .filter(PlanProgress.plan_id == plan.id,
                   PlanProgress.student_id == user.id,
                   PlanProgress.date_str == date_str,
                   PlanProgress.day_index == data.day_index,
                   PlanProgress.task_index == data.task_index)
           .first())

    if data.status == "":
        if row:
            db.delete(row)
            db.commit()
        return {"ok": True, "status": None}

    if not row:
        row = PlanProgress(
            plan_id=plan.id,
            student_id=user.id,
            date_str=date_str,
            day_index=data.day_index,
            task_index=data.task_index,
            status=data.status,
        )
        db.add(row)
    else:
        row.status = data.status

    db.commit()
    return {"ok": True, "status": data.status}


SUPERVISION_PARTS = [
    {"part": 0, "from": "08:00", "to": "09:30"},
    {"part": 1, "from": "09:45", "to": "11:15"},
    {"part": 2, "from": "11:30", "to": "13:00"},
    {"part": 3, "from": "16:00", "to": "17:30"},
    {"part": 4, "from": "17:45", "to": "19:15"},
    {"part": 5, "from": "19:30", "to": "21:00"},
]


def saturday_start(day: date) -> date:
    return day - timedelta(days=iran_weekday(day))


def week_dates(start: date) -> list[date]:
    return [start + timedelta(days=i) for i in range(7)]


def persian_day_label(d: date) -> str:
    return PERSIAN_DAYS[iran_weekday(d)]


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
    status: str = ""          # done | missed | "" (reset)


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
