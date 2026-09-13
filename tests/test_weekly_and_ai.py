import pytest
import json
from datetime import datetime, date
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import get_db, SessionLocal, Base, engine
from backend.models import User, StudentProfile, StudyPlan, PlanProgress, ReportCard
from backend.security import hash_password, create_token
from backend.routers.plan import saturday_start

client = TestClient(app)

def setup_module():
    Base.metadata.create_all(bind=engine)

def test_multi_week_and_ai_endpoints():
    db = SessionLocal()
    
    # 1. Create student and mentor
    mentor = db.query(User).filter(User.email == "test_mentor@example.com").first()
    if not mentor:
        mentor = User(
            email="test_mentor@example.com",
            password_hash=hash_password("Pass1234"),
            role="mentor",
            full_name="دکتر علیرضا کاظمی",
            code="MENTOR99"
        )
        db.add(mentor)
        db.commit()
        db.refresh(mentor)

    student = db.query(User).filter(User.email == "test_student@example.com").first()
    if not student:
        student = User(
            email="test_student@example.com",
            password_hash=hash_password("Pass1234"),
            role="student",
            full_name="سارا حسینی",
            phone="09121234567"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        
        prof = StudentProfile(
            user_id=student.id,
            mentor_id=mentor.id,
            grade_level="12th",
            field_of_study="experimental",
            last_year_avg=19.2,
            goal_type="پزشکی سراسری دانشگاه تهران",
            subject_scores=[
                {"subject": "زیست‌شناسی", "score": 85},
                {"subject": "شیمی", "score": 78},
                {"subject": "فیزیک", "score": 62},
                {"subject": "ریاضیات تجربی", "score": 58}
            ]
        )
        db.add(prof)
        db.commit()

    mentor_token = create_token(mentor)
    student_token = create_token(student)

    target_sat = saturday_start(date.today()).isoformat()
    next_sat = (saturday_start(date.today()) + datetime.resolution * 7).isoformat() if hasattr(datetime, "resolution") else (date.fromisoformat(target_sat)).isoformat()
    
    from datetime import timedelta
    next_sat = (date.fromisoformat(target_sat) + timedelta(days=7)).isoformat()
    future_sat = (date.fromisoformat(target_sat) + timedelta(days=28)).isoformat()

    # Test 1: Fetch student detail with week offset
    r = client.get(
        f"/api/mentor/students/{student.id}?week_start={target_sat}",
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "student" in data
    assert "plan" in data
    print("✓ Student detail with week offset fetched successfully")

    # Test 2: Mentor assigns multi-week plan for specific week
    week_plan_payload = {
        "title": "برنامه هفته جاری",
        "week_start": target_sat,
        "days": [
            {
                "label": "شنبه",
                "tasks": [
                    {
                        "id": "task-1",
                        "subject": "زیست‌شناسی",
                        "topic": "گفتار ۱ فصل اول دوازدهم",
                        "study_method": "test",
                        "question_count": 45,
                        "duration_minutes": 90,
                        "notes": "حل تست‌های سراسری ۹۸ تا ۱۴۰۲"
                    }
                ]
            }
        ]
    }
    r = client.put(
        f"/api/mentor/students/{student.id}/plan",
        json=week_plan_payload,
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    print(f"✓ Plan assigned for week {target_sat}")

    # Test 3: Fetch student view of the plan for the specified week
    r = client.get(
        f"/api/plan?week_start={target_sat}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 200, r.text
    student_plan = r.json()
    assert student_plan["plan_exists"] is True
    assert len(student_plan["days"]) == 7
    assert sum(len(d["tasks"]) for d in student_plan["days"]) > 0
    print("✓ Student retrieved correct week-specific plan with tasks")

    # Test 4: Fetch unassigned week displays empty
    r = client.get(
        f"/api/plan?week_start={future_sat}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 200
    res_unassigned = r.json()
    assert res_unassigned["plan_exists"] is False
    assert sum(len(d["tasks"]) for d in res_unassigned["days"]) == 0
    print("✓ Unassigned future week returns empty plan")

    # Test 5: Generate AI Draft Plan for upcoming week
    r = client.post(
        f"/api/mentor/students/{student.id}/generate-ai-plan?next_week_start={next_sat}",
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert r.status_code == 200, r.text
    draft_res = r.json()
    assert draft_res["status"] == "draft_ai"
    assert draft_res["is_draft"] is True
    assert len(draft_res["days"]) == 7
    print("✓ AI Draft Plan for upcoming week generated with status draft_ai")

    # Test 6: Verify student does not see AI draft until mentor publishes it
    r = client.get(
        f"/api/plan?week_start={next_sat}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 200
    plan_draft_check = r.json()
    assert plan_draft_check["plan_exists"] is False
    assert sum(len(d["tasks"]) for d in plan_draft_check["days"]) == 0
    print("✓ AI Draft is confidential and hidden from student until published")

    # Test 7: Trigger Live AI Student Diagnostic and Neon Chart Breakdown
    r = client.post(
        f"/api/mentor/students/{student.id}/trigger-ai-analysis",
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert r.status_code == 200, r.text
    diag = r.json()["analysis"]
    assert "subject_breakdowns" in diag
    assert "confidential_dossier" in diag
    assert "overall_index" in diag or "total_capacity_score" in diag
    print("✓ AI Live Diagnostic analysis executed successfully with subject breakdowns")

    # Test 8: AI Chatbot interactions (/plan command and free conversation)
    r_plan = client.post(
        "/api/ai/chat",
        json={"message": "/plan", "lang": "fa"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r_plan.status_code == 200, r_plan.text
    assert "برنامهٔ مطالعهٔ شما" in r_plan.json()["reply"]
    print("✓ AI Chatbot /plan handled correctly without KeyError")

    r_chat = client.post(
        "/api/ai/chat",
        json={"message": "سلام! وضعیت برنامه من چطوره؟", "lang": "fa"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r_chat.status_code == 200, r_chat.text
    assert "reply" in r_chat.json()
    print("✓ AI Chatbot free message conversation handled successfully")

    # Test 9: Admin bi-weekly nightly sync
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            password_hash=hash_password("AdminPass123"),
            role="admin",
            full_name="مدیر کل سامانه"
        )
        db.add(admin)
        db.commit()
    admin_token = create_token(admin)
    r = client.post(
        "/api/admin/ai/nightly-sync",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r.status_code == 200, r.text
    print("✓ AI nightly bi-weekly sync executed atomically")

    db.close()

if __name__ == "__main__":
    setup_module()
    test_multi_week_and_ai_endpoints()
    print("\n🎉 ALL MULTI-WEEK AND AI TESTS PASSED PERFECTLY! 🎉")
