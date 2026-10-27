"""Database initialization and fixture seeding script."""
from sqlalchemy import text

from .database import Base, SessionLocal, engine
from .models import User
from .security import hash_password
from .seed_data import seed_questions

Base.metadata.create_all(bind=engine)


def _migrate(db):
    """Ensure SQLite schema compatibility across incremental updates."""
    with engine.begin() as conn:
        cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(video_suggestions)")]
        for name, ddl in (
            ("source", "VARCHAR(30) DEFAULT 'youtube'"),
            ("views", "INTEGER DEFAULT 0"),
            ("likes", "INTEGER DEFAULT 0"),
        ):
            if name not in cols:
                conn.exec_driver_sql(f"ALTER TABLE video_suggestions ADD COLUMN {name} {ddl}")

        # Student profile columns
        pcols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(student_profiles)")]
        if "overall_avg" in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles DROP COLUMN overall_avg")
        if "ai_dossier" not in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles ADD COLUMN ai_dossier TEXT DEFAULT ''")
        if "subject_coefficients" not in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles ADD COLUMN subject_coefficients JSON DEFAULT '{}'")
        if "mentor_connection_status" not in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles ADD COLUMN mentor_connection_status VARCHAR(20) DEFAULT 'none'")
        if "pending_mentor_id" not in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles ADD COLUMN pending_mentor_id INTEGER")

        # Plan progress completed_at timestamp
        prog_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(plan_progress)")]
        if "completed_at" not in prog_cols:
            conn.exec_driver_sql("ALTER TABLE plan_progress ADD COLUMN completed_at DATETIME")

        # User profile fields
        ucols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(users)")]
        if "address" not in ucols:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN address VARCHAR(255)")

        # Consultation slot status
        ccols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(consult_slots)")]
        if "status" not in ccols:
            conn.exec_driver_sql("ALTER TABLE consult_slots ADD COLUMN status VARCHAR(10) DEFAULT 'booked'")

        # Support tickets columns
        stcols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(support_tickets)")]
        if "subject" not in stcols:
            conn.exec_driver_sql("ALTER TABLE support_tickets ADD COLUMN subject VARCHAR(200) DEFAULT ''")
        if "status" not in stcols:
            conn.exec_driver_sql("ALTER TABLE support_tickets ADD COLUMN status VARCHAR(20) DEFAULT 'open'")

        # Study plan source tracking
        spcols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(study_plans)")]
        if "source" not in spcols:
            conn.exec_driver_sql("ALTER TABLE study_plans ADD COLUMN source VARCHAR(10) DEFAULT 'ai'")
        if "mentor_id" not in spcols:
            conn.exec_driver_sql("ALTER TABLE study_plans ADD COLUMN mentor_id INTEGER")

        # Cleanup legacy json keys if any
        conn.exec_driver_sql(
            "UPDATE student_profiles SET analysis = json_remove(analysis, '$.overall_avg') "
            "WHERE analysis IS NOT NULL AND json_valid(analysis)"
        )


def _ensure_user(db, role, full_name, email, password, **extra):
    u = db.query(User).filter(User.email == email).first()
    if u:
        if password:
            u.password_hash = hash_password(password)
        u.full_name = full_name
        for k, v in extra.items():
            setattr(u, k, v)
        return u
    u = User(role=role, full_name=full_name, email=email,
             password_hash=hash_password(password), **extra)
    db.add(u)
    return u


def _seed_ali_ahmadi(db, mentor):
    """Seed comprehensive realistic mock data for student Ali Ahmadi."""
    ali = _ensure_user(
        db,
        role="student",
        full_name="Ali Ahmadi",
        email="ali@test.com",
        password="ali123",
        phone="09123456789",
        address="Tehran, North Kargar St., Mehr Alley, No. 14",
    )
    db.flush()

    # Student Profile
    from .models import StudentProfile, StudyPlan, PlanProgress, ReportCard, ConsultationSession, ConsultSlot, SupervisionEntry, Message

    prof = db.query(StudentProfile).filter(StudentProfile.user_id == ali.id).first()
    if not prof:
        prof = StudentProfile(user_id=ali.id)
        db.add(prof)

    prof.grade_level = "دوازدهم"
    prof.field_of_study = "علوم تجربی"
    prof.goal_type = "konkur"
    prof.last_year_avg = 19.45
    prof.goal_subjects = ["زیست‌شناسی", "شیمی", "فیزیک", "ریاضی"]
    prof.mentor_id = mentor.id
    prof.mentor_connection_status = "approved"
    prof.pending_mentor_id = None
    prof.ai_dossier = (
        "دانش‌آموز Ali Ahmadi دارای سطح تسلط علمی بسیار بالا در مفاهیم زیست‌شناسی و شیمی کنکور است. "
        "با ساعت مطالعه میانگین ۴۸ ساعت در هفته، پتانسیل کسب رتبه زیر ۳۰۰ کشوری در کنکور تجربی را داراست. "
        "تمرکز بر سرعت تست‌زنی ریاضی و تکنیک ضربدر منها در جلسات مشاوره توصیه شده است."
    )
    prof.analysis = {
        "strengths": [
            "زیست‌شناسی دوازدهم (ژنتیک مولکولی و همانندسازی)",
            "شیمی پایه و استوکیومتری واکنش‌ها",
            "پایبندی منظم به برنامه هفتگی و ثبت تیک پیشرفت",
        ],
        "weaknesses": [
            "فیزیک حرکت‌شناسی و دینامیک نیوتونی",
            "ریاضیات کاربردی و مشتق",
        ],
        "daily_target_hours": 7.5,
        "ai_summary": (
            "روند ترازهای آزمایشی بسیار صعودی و ممتاز است. با ثبات در تمرین تست‌های زمان‌دار فیزیک، "
            "تراز بالای ۷۲۰۰ در آزمون‌های کانون و رتبه برتر کنکور کاملاً تثبیت خواهد شد."
        ),
    }

    # Study Plan
    weekly_plan = [
        {
            "day": "شنبه",
            "sessions": [
                {"subject": "زیست‌شناسی", "topic": "گفتار ۱ و ۲ فصل اول دوازدهم (مولکول‌های اطلاعاتی)", "duration": 120, "method": "آموزشی", "questions": 40},
                {"subject": "شیمی", "topic": "استوکیومتری واکنش‌ها و مسائل بازده درصدی", "duration": 90, "method": "تستی", "questions": 30},
                {"subject": "فیزیک", "topic": "حرکت‌شناسی با شتاب ثابت و نمودارها", "duration": 90, "method": "تثبیتی", "questions": 25},
                {"subject": "ادبیات فارسی", "topic": "آرایه‌های ادبی و قرابت معنایی درس ۱ تا ۳", "duration": 60, "method": "تستی", "questions": 20},
            ],
        },
        {
            "day": "یکشنبه",
            "sessions": [
                {"subject": "ریاضی", "topic": "تابع، دامنه، برد و ترکیب توابع", "duration": 100, "method": "آموزشی", "questions": 35},
                {"subject": "زیست‌شناسی", "topic": "مرور نکات کنکوری شکل‌های فصل اول و دوم", "duration": 90, "method": "مروری", "questions": 30},
                {"subject": "عربی", "topic": "قواعد ثلاثی مجرد و مزید و ترجمه فعل", "duration": 60, "method": "تثبیتی", "questions": 20},
                {"subject": "شیمی", "topic": "ترمودینامیک شیمیایی و آنتالپی پیوند", "duration": 90, "method": "تستی", "questions": 25},
            ],
        },
        {
            "day": "دوشنبه",
            "sessions": [
                {"subject": "زیست‌شناسی", "topic": "فصل دوم دوازدهم - همانندسازی و رونویسی دنا", "duration": 120, "method": "آموزشی", "questions": 45},
                {"subject": "فیزیک", "topic": "دینامیک، قوانین نیوتون و اصطکاک سطوح", "duration": 100, "method": "تستی", "questions": 30},
                {"subject": "زبان انگلیسی", "topic": "گرامر زمان‌ها و ریدینگ کنکور سال‌های اخیر", "duration": 60, "method": "تستی", "questions": 25},
                {"subject": "ریاضی", "topic": "معادلات و نامعادلات قدرمطلقی", "duration": 80, "method": "تثبیتی", "questions": 20},
            ],
        },
        {
            "day": "سه‌شنبه",
            "sessions": [
                {"subject": "شیمی", "topic": "محلول‌ها، درصد جرمی و غلظت مولار", "duration": 110, "method": "آموزشی", "questions": 35},
                {"subject": "زیست‌شناسی", "topic": "تست‌های چندموردی و شمارشی فصل ۲ دوازدهم", "duration": 90, "method": "تستی", "questions": 40},
                {"subject": "دین و زندگی", "topic": "پیام آیات و ارتباط مفهومی درس ۱ تا ۴", "duration": 60, "method": "مروری", "questions": 25},
                {"subject": "فیزیک", "topic": "تست‌های علامت‌دار حرکت‌شناسی", "duration": 80, "method": "تثبیتی", "questions": 20},
            ],
        },
        {
            "day": "چهارشنبه",
            "sessions": [
                {"subject": "ریاضی", "topic": "مثلثات، اتحادها و روابط کمان‌های دوبرابر", "duration": 100, "method": "آموزشی", "questions": 30},
                {"subject": "شیمی", "topic": "شیمی آلی، ساختار لوویس و گروه‌های عاملی", "duration": 90, "method": "تستی", "questions": 30},
                {"subject": "زیست‌شناسی", "topic": "آزمون مبحثی زیست‌شناسی مولکولی (۵۰ تست)", "duration": 90, "method": "تستی", "questions": 50},
                {"subject": "ادبیات فارسی", "topic": "دستور زبان فارسی و نقش‌های دستوری", "duration": 60, "method": "تثبیتی", "questions": 20},
            ],
        },
        {
            "day": "پنج‌شنبه",
            "sessions": [
                {"subject": "زیست‌شناسی", "topic": "مرور جامع و جمع‌بندی نکات طلایی هفته", "duration": 120, "method": "مروری", "questions": 40},
                {"subject": "شیمی", "topic": "آزمون زمان‌دار شیمی محاسباتی (۳۵ تست استاندارد)", "duration": 90, "method": "تستی", "questions": 35},
                {"subject": "فیزیک", "topic": "مرور فرمول‌ها و تحلیل تست‌های چالشی", "duration": 90, "method": "تثبیتی", "questions": 25},
                {"subject": "ریاضی", "topic": "حل تست‌های سراسری داخل و خارج سال‌های اخیر", "duration": 90, "method": "تستی", "questions": 30},
            ],
        },
        {
            "day": "جمعه",
            "sessions": [
                {"subject": "آزمون شبیه‌ساز کنکور", "topic": "برگزاری آزمون جامع اختصاصی زمان‌دار", "duration": 180, "method": "تستی", "questions": 120},
                {"subject": "تحلیل آزمون", "topic": "تحلیل سوالات غلط و نزده در دفتر خودآموز", "duration": 120, "method": "مروری", "questions": 0},
                {"subject": "جلسه با مشاور", "topic": "بررسی کارنامه، ارزیابی پیشرفت و تنظیم برنامه هفته آینده", "duration": 60, "method": "مروری", "questions": 0},
            ],
        },
    ]

    plan = db.query(StudyPlan).filter(StudyPlan.student_id == ali.id).first()
    if not plan:
        plan = StudyPlan(student_id=ali.id)
        db.add(plan)
    plan.source = "mentor"
    plan.mentor_id = mentor.id
    plan.content = {
        "summary": "برنامه راهبردی کنکور تجربی - فاز تثبیت و مرور ترکیبی (تدوین توسط دکتر رضایی)",
        "weekly": weekly_plan,
    }
    db.flush()

    # Plan Progress (checkmarks for current week)
    import datetime
    from .models import now
    base_date = datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())
    for d_idx in range(3):
        cur_date_str = (base_date + datetime.timedelta(days=d_idx)).isoformat()
        for t_idx in range(3):
            prog = db.query(PlanProgress).filter(
                PlanProgress.plan_id == plan.id,
                PlanProgress.student_id == ali.id,
                PlanProgress.date_str == cur_date_str,
                PlanProgress.day_index == d_idx,
                PlanProgress.task_index == t_idx,
            ).first()
            if not prog:
                prog = PlanProgress(
                    plan_id=plan.id,
                    student_id=ali.id,
                    date_str=cur_date_str,
                    day_index=d_idx,
                    task_index=t_idx,
                    status="done",
                    completed_at=now(),
                )
                db.add(prog)

    # Report Cards
    rc1 = db.query(ReportCard).filter(ReportCard.student_id == ali.id, ReportCard.title == "آزمون جامع خیلی سبز (مرحله ۳)").first()
    if not rc1:
        rc1 = ReportCard(
            student_id=ali.id,
            title="آزمون جامع خیلی سبز (مرحله ۳)",
            provider="خیلی سبز",
            source="kheilisabz",
            exam_date="۱۴۰۵/۰۵/۲۸",
            total_traz=6890,
            overall_rank=310,
            overall_score=70.5,
            summary_metrics=[
                {"subject": "زیست‌شناسی", "score": 78.5, "percentage": 78.5, "traz": 7250, "class_avg": 45.0, "rank": 180},
                {"subject": "شیمی", "score": 69.0, "percentage": 69.0, "traz": 6800, "class_avg": 42.0, "rank": 290},
                {"subject": "فیزیک", "score": 58.0, "percentage": 58.0, "traz": 6200, "class_avg": 38.0, "rank": 420},
                {"subject": "ریاضی", "score": 54.5, "percentage": 54.5, "traz": 6050, "class_avg": 35.0, "rank": 480},
                {"subject": "ادبیات فارسی", "score": 72.0, "percentage": 72.0, "traz": 6900, "class_avg": 50.0, "rank": 260},
                {"subject": "عربی", "score": 80.0, "percentage": 80.0, "traz": 7300, "class_avg": 48.0, "rank": 150},
                {"subject": "زبان انگلیسی", "score": 82.5, "percentage": 82.5, "traz": 7400, "class_avg": 52.0, "rank": 130},
                {"subject": "دین و زندگی", "score": 86.0, "percentage": 86.0, "traz": 7600, "class_avg": 58.0, "rank": 95},
            ],
            ai_insights={
                "strengths": ["عملکرد درخشان در زیست‌شناسی و دروس عمومی با تراز بالای ۷۲۰۰", "درک عمیق از مباحث استوکیومتری و شیمی توصیفی"],
                "weaknesses": ["فیزیک پایه و به ویژه تست‌های زمان‌بر حرکت‌شناسی نیاز به حل تمرین بیشتری دارد"],
                "summary": "تراز کل ۶۸۹۰ نمایانگر پایه علمی بسیار مستحکم است. با ارتقای میانگین ریاضی و فیزیک به بالای ۶۵ درصد، رتبه دورقمی منطقه در دسترس است.",
            },
        )
        db.add(rc1)

    rc2 = db.query(ReportCard).filter(ReportCard.student_id == ali.id, ReportCard.title == "آزمون مرحله‌ای قلم‌چی (مرحله ۵)").first()
    if not rc2:
        rc2 = ReportCard(
            student_id=ali.id,
            title="آزمون مرحله‌ای قلم‌چی (مرحله ۵)",
            provider="قلم‌چی",
            source="ghalamchi",
            exam_date="۱۴۰۵/۰۶/۱۴",
            total_traz=7140,
            overall_rank=145,
            overall_score=75.8,
            summary_metrics=[
                {"subject": "زیست‌شناسی", "score": 84.0, "percentage": 84.0, "traz": 7450, "class_avg": 47.0, "rank": 95},
                {"subject": "شیمی", "score": 74.5, "percentage": 74.5, "traz": 7180, "class_avg": 44.0, "rank": 135},
                {"subject": "فیزیک", "score": 66.0, "percentage": 66.0, "traz": 6750, "class_avg": 40.0, "rank": 210},
                {"subject": "ریاضی", "score": 62.0, "percentage": 62.0, "traz": 6580, "class_avg": 36.0, "rank": 240},
                {"subject": "ادبیات فارسی", "score": 76.0, "percentage": 76.0, "traz": 7100, "class_avg": 51.0, "rank": 190},
                {"subject": "عربی", "score": 85.0, "percentage": 85.0, "traz": 7550, "class_avg": 49.0, "rank": 85},
                {"subject": "زبان انگلیسی", "score": 88.0, "percentage": 88.0, "traz": 7700, "class_avg": 53.0, "rank": 70},
                {"subject": "دین و زندگی", "score": 90.0, "percentage": 90.0, "traz": 7850, "class_avg": 60.0, "rank": 60},
            ],
            ai_insights={
                "strengths": ["پیشرفت چشمگیر در تراز کل (۲۵۰ واحد افزایش)", "بهبود چشمگیر در درس فیزیک و تسلط بر زیست دوازدهم"],
                "weaknesses": ["تداوم تثبیت سرعت حل مسائل ریاضی و مدیریت دفترچه دوم کنکور"],
                "summary": "روند پیشرفت دانش‌آموز Ali Ahmadi بسیار برجسته بوده و ورود به باشگاه تراز بالای ۷۱۰۰ نشان‌دهنده اثربخشی کامل برنامه مطالعاتی مشاور است.",
            },
        )
        db.add(rc2)

    # Consultation Sessions
    cs1 = db.query(ConsultationSession).filter(ConsultationSession.student_id == ali.id, ConsultationSession.session_date == "۱۴۰۵/۰۵/۳۰").first()
    if not cs1:
        cs1 = ConsultationSession(
            mentor_id=mentor.id,
            student_id=ali.id,
            session_date="۱۴۰۵/۰۵/۳۰",
            duration_minutes=45,
            consultation_type="تلفنی",
            student_evaluation="عالی",
            discussion_topics="تحلیل آزمون خیلی سبز، تنظیم ساعت مطالعه هفتگی روی ۴۵ ساعت، رفع استرس دروس محاسباتی",
            advisor_recommendations="استفاده از روش حل تست زمان‌دار در شیمی و مرور زیست‌شناسی هر شب قبل از خواب",
            next_session_date="۱۴۰۵/۰۶/۱۶",
            ai_diagnostic_notes="دانش‌آموز روحیه و اشتیاق بسیار بالایی دارد و هدف‌گذاری رشته پزشکی دانشگاه تهران را با انگیزه پیگیری می‌کند.",
        )
        db.add(cs1)

    cs2 = db.query(ConsultationSession).filter(ConsultationSession.student_id == ali.id, ConsultationSession.session_date == "۱۴۰۵/۰۶/۱۶").first()
    if not cs2:
        cs2 = ConsultationSession(
            mentor_id=mentor.id,
            student_id=ali.id,
            session_date="۱۴۰۵/۰۶/۱۶",
            duration_minutes=50,
            consultation_type="آنلاین",
            student_evaluation="عالی",
            discussion_topics="بررسی نتایج درخشان آزمون قلم‌چی (تراز ۷۱۴۰)، برنامه‌ریزی برای فاز مرورهای پاییزی، تنظیم تکالیف فیزیک",
            advisor_recommendations="حل حداقل ۵۰ تست روزانه از مباحث ترکیبی و شرکت در آزمون‌های شبیه‌ساز پنج‌شنبه‌ها",
            next_session_date="۱۴۰۵/۰۶/۳۰",
            ai_diagnostic_notes="ثبات روانی و تسلط علمی دانش‌آموز در بالاترین سطح ارزیابی شد. ادامه این روند متضمن رتبه برتر است.",
        )
        db.add(cs2)

    # Supervision Entries
    for p in range(6):
        sup = db.query(SupervisionEntry).filter(
            SupervisionEntry.student_id == ali.id,
            SupervisionEntry.date_str == datetime.date.today().isoformat(),
            SupervisionEntry.part == p,
        ).first()
        if not sup:
            sup = SupervisionEntry(
                student_id=ali.id,
                mentor_id=mentor.id,
                date_str=datetime.date.today().isoformat(),
                part=p,
                text=f"پارت {p+1}: مطالعه زیست و حل تست شیمی",
                status="done" if p < 3 else "todo",
            )
            db.add(sup)

    # Consult Slot
    cslot = db.query(ConsultSlot).filter(ConsultSlot.student_id == ali.id).first()
    if not cslot:
        cslot = ConsultSlot(
            mentor_id=mentor.id,
            student_id=ali.id,
            date_str=datetime.date.today().isoformat(),
            start_min=17 * 60,
            duration_min=45,
            status="booked",
        )
        db.add(cslot)

    # Messages
    msg = db.query(Message).filter(Message.student_id == ali.id).first()
    if not msg:
        m1 = Message(
            student_id=ali.id,
            mentor_id=mentor.id,
            sender_id=ali.id,
            receiver_id=mentor.id,
            kind="text",
            text="استاد رضایی عزیز، کارنامه مرحله ۵ قلم‌چی را آپلود کردم و تراز به ۷۱۴۰ رسید. برای تست‌های فیزیک نیاز به راهنمایی دارم.",
        )
        m2 = Message(
            student_id=ali.id,
            mentor_id=mentor.id,
            sender_id=mentor.id,
            receiver_id=ali.id,
            kind="text",
            text="آفرین علی جان! نتیجه فوق‌العاده بوده. در جلسه آنلاین پیش رو دقیقاً روش‌های افزایش درصد فیزیک را مرور می‌کنیم.",
        )
        db.add_all([m1, m2])


def main():
    db = SessionLocal()
    try:
        _migrate(db)
        # Default Admin
        admin = _ensure_user(db, "admin", "System Administrator", "admin@panel.test", "admin123")
        db.flush()

        # Default Demo Mentor
        mentor = _ensure_user(db, "mentor", "Dr. Rezaei", "mentor@panel.test",
                              "mentor123", code="MNT1001")
        db.flush()

        # Seed Ali Ahmadi Mock Data
        _seed_ali_ahmadi(db, mentor)

        n_q = seed_questions(db)
        db.commit()
        print(f"[*] Admin account ready: admin@panel.test / admin123")
        print(f"[*] Mentor account ready: mentor@panel.test / mentor123 (Invite Code: MNT1001)")
        print(f"[*] Ali Ahmadi student account ready: ali@test.com / ali123 (Linked to MNT1001)")
        print(f"[*] Successfully populated question bank with {n_q} seed items.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
