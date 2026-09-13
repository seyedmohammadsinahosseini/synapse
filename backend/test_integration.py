"""Comprehensive integration tests for the Mentor & Student Platform."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["AI_USE_MOCK"] = "1"
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine, SessionLocal
from backend.models import User, StudentProfile
from backend.security import hash_password

client = TestClient(app)

class TestPlatformIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        # Seed test mentor if not exists
        mentor = db.query(User).filter(User.email == "test_mentor@platform.com").first()
        if not mentor:
            mentor = User(
                role="mentor",
                full_name="استاد احمدی",
                email="test_mentor@platform.com",
                password_hash=hash_password("Password123!"),
                code="MENTOR777"
            )
            db.add(mentor)
            db.commit()
            db.refresh(mentor)
        cls.mentor_code = mentor.code
        db.close()

    def test_01_health_and_root(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_02_register_and_login_student(self):
        # Register student connected to mentor
        student_data = {
            "full_name": "علی رضایی",
            "email": "ali_student_test@platform.com",
            "password": "Password123!",
            "phone": "09123456789",
            "grade_level": "دوازدهم",
            "field_of_study": "tajrobi",
            "last_year_avg": 18.5,
            "goal_type": "konkur",
            "goal_subjects": ["Biology", "Chemistry"],
            "subject_scores": [
                {"subject": "زیست‌شناسی", "score": 18.0},
                {"subject": "شیمی", "score": 16.5},
                {"subject": "ریاضی", "score": 14.0},
                {"subject": "فیزیک", "score": 13.0}
            ],
            "mentor_code": self.mentor_code,
            "lang": "fa"
        }
        r_s = client.post("/api/auth/register/student", json=student_data)
        self.assertIn(r_s.status_code, [200, 400])

        r_login_s = client.post("/api/auth/login", json={"email": "ali_student_test@platform.com", "password": "Password123!"})
        self.assertEqual(r_login_s.status_code, 200)
        self.assertIn("token", r_login_s.json())

    def test_03_report_card_analysis_and_pdf(self):
        r_login_s = client.post("/api/auth/login", json={"email": "ali_student_test@platform.com", "password": "Password123!"})
        token = r_login_s.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Manual report card entry
        rc_payload = {
            "title": "کارنامه آزمون آزمایشی خیلی سبز",
            "provider": "خیلی سبز",
            "source": "kheilisabz",
            "subjects": [
                {"subject": "زیست‌شناسی", "score": 18.5, "percentage": 78.0, "traz": 6620, "class_avg": 54.0, "rank": 12},
                {"subject": "شیمی", "score": 16.0, "percentage": 65.0, "traz": 6280, "class_avg": 49.0, "rank": 22},
                {"subject": "ریاضی", "score": 12.5, "percentage": 42.0, "traz": 5510, "class_avg": 38.0, "rank": 52}
            ]
        }
        r_save = client.post("/api/report-card/manual", json=rc_payload, headers=headers)
        self.assertEqual(r_save.status_code, 200)
        card_id = r_save.json()["id"]

        # List report cards
        r_list = client.get("/api/report-card/list", headers=headers)
        self.assertEqual(r_list.status_code, 200)
        self.assertTrue(len(r_list.json()) > 0)

        # Download PDF Dossier
        r_pdf = client.get(f"/api/report-card/pdf/{card_id}", headers=headers)
        self.assertEqual(r_pdf.status_code, 200)
        self.assertEqual(r_pdf.headers["content-type"], "application/pdf")
        self.assertTrue(len(r_pdf.content) > 1000)

    def test_04_study_calendar_planning_and_capacity_alerts(self):
        # Login mentor
        r_login_m = client.post("/api/auth/login", json={"email": "test_mentor@platform.com", "password": "Password123!"})
        self.assertEqual(r_login_m.status_code, 200)
        m_headers = {"Authorization": f"Bearer {r_login_m.json()['token']}"}

        # Get student ID
        r_students = client.get("/api/mentor/students", headers=m_headers)
        self.assertEqual(r_students.status_code, 200)
        students = r_students.json()
        student_id = students[0]["id"] if students else 1

        # Mentor updates calendar plan with study methods, questions, and duration
        plan_content = {
            "days": [
                {
                    "label": "شنبه",
                    "tasks": [
                        {"subject": "زیست‌شناسی", "duration_minutes": 120, "study_method": "test", "question_count": 40, "topic": "تست‌زنی گوارش و تنظیم عصبی", "notes": "بررسی پاسخ‌نامه تشریحی"},
                        {"subject": "شیمی", "duration_minutes": 90, "study_method": "study", "question_count": None, "topic": "مبحث استوکیومتری و واکنش‌ها"}
                    ]
                },
                {
                    "label": "یکشنبه",
                    "tasks": [
                        {"subject": "ریاضی", "duration_minutes": 150, "study_method": "essay", "question_count": 25, "topic": "حل تمرینات تشریحی فصل مشتق"}
                    ]
                }
            ]
        }

        r_assign = client.put(
            f"/api/mentor/students/{student_id}/plan",
            json=plan_content,
            headers=m_headers
        )
        self.assertEqual(r_assign.status_code, 200)

        # Student checks their plan
        r_login_s = client.post("/api/auth/login", json={"email": "ali_student_test@platform.com", "password": "Password123!"})
        s_headers = {"Authorization": f"Bearer {r_login_s.json()['token']}"}

        r_plan = client.get("/api/plan", headers=s_headers)
        self.assertEqual(r_plan.status_code, 200)
        self.assertTrue(r_plan.json()["plan_exists"])
        self.assertTrue(len(r_plan.json()["days"]) > 0)

        # Set task completed
        r_task = client.post("/api/plan/task", json={"day_index": 0, "task_index": 0, "status": "done"}, headers=s_headers)
        self.assertEqual(r_task.status_code, 200)

        # Set capacity alert
        r_alert = client.post("/api/plan/capacity-alert", json={"date_str": "2026-09-14", "max_hours": 3.0, "reason": "کلاس کنکور بعدازظهر"}, headers=s_headers)
        self.assertEqual(r_alert.status_code, 200)

    def test_05_ai_chat_and_video_suggestions(self):
        r_login_s = client.post("/api/auth/login", json={"email": "ali_student_test@platform.com", "password": "Password123!"})
        s_headers = {"Authorization": f"Bearer {r_login_s.json()['token']}"}

        # AI Chat
        r_chat = client.post("/api/ai/chat", json={"message": "سلام، لطفا نکاتی برای مطالعه ریاضی بگو", "lang": "fa"}, headers=s_headers)
        self.assertEqual(r_chat.status_code, 200)
        self.assertTrue(len(r_chat.json()["reply"]) > 0)

        # AI Chat History
        r_hist = client.get("/api/ai/chat/history", headers=s_headers)
        self.assertEqual(r_hist.status_code, 200)

if __name__ == "__main__":
    unittest.main()
