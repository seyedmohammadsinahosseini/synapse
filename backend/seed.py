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

        # Student profile ai_dossier
        pcols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(student_profiles)")]
        if "overall_avg" in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles DROP COLUMN overall_avg")
        if "ai_dossier" not in pcols:
            conn.exec_driver_sql("ALTER TABLE student_profiles ADD COLUMN ai_dossier TEXT DEFAULT ''")

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
        return u
    u = User(role=role, full_name=full_name, email=email,
             password_hash=hash_password(password), **extra)
    db.add(u)
    return u


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

        n_q = seed_questions(db)
        db.commit()
        print(f"[*] Admin account ready: admin@panel.test / admin123")
        print(f"[*] Mentor account ready: mentor@panel.test / mentor123 (Invite Code: MNT1001)")
        print(f"[*] Successfully populated question bank with {n_q} seed items.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
