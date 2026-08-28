"""SQLAlchemy models for the Student-Mentor platform."""
from datetime import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, ForeignKey,
                        Integer, String, Text, UniqueConstraint)
from sqlalchemy.orm import relationship

from .database import Base


def now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    role = Column(String(20), nullable=False)          # student | mentor | admin
    full_name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    code = Column(String(40), unique=True, nullable=True)   # mentor invite code
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)

    profile = relationship("StudentProfile", back_populates="user",
                           uselist=False, cascade="all, delete-orphan",
                           foreign_keys="StudentProfile.user_id")


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    field_of_study = Column(String(80), nullable=False)   # Major / Branch of study
    grade_level = Column(String(40), nullable=False)      # Academic grade level

    last_year_avg = Column(Float, nullable=False)         # Previous GPA / Academic average
    goal_type = Column(String(40), nullable=False)        # better_average | specific_subjects | konkur
    goal_subjects = Column(JSON, default=list)            # Targeted subjects
    subject_scores = Column(JSON, default=list)           # [{subject, score}]
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    analysis = Column(JSON, nullable=True)                # AI diagnostic payload

    user = relationship("User", back_populates="profile",
                        foreign_keys=[user_id])
    mentor = relationship("User", foreign_keys=[mentor_id])


class Grade(Base):
    """A single subject grade (self-reported baseline or exam-derived)."""
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    subject = Column(String(80), nullable=False)
    score = Column(Float, nullable=False)                 # scale 0..20
    source = Column(String(20), default="self")           # self | exam | test
    year_label = Column(String(40), default="")           # e.g. ۱۴۰۳-۱۴۰۴
    created_at = Column(DateTime, default=now)


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    subject = Column(String(80), index=True, nullable=False)
    type = Column(String(20), nullable=False)             # mcq | essay | fill
    difficulty = Column(Integer, default=2)               # 1..5
    text = Column(Text, nullable=False)
    options = Column(JSON, default=list)                  # mcq only: [..4..]
    answer = Column(Text, nullable=False)                 # index / text / keywords
    explanation = Column(Text, default="")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now)


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    kind = Column(String(20), default="test")             # test | exam
    status = Column(String(20), default="in_progress")    # in_progress | submitted
    difficulty = Column(Integer, default=2)
    question_model = Column(String(20), default="random") # random | essay | fill | mcq
    total_questions = Column(Integer, default=0)
    time_limit_seconds = Column(Integer, default=0)
    total_score = Column(Float, nullable=True)            # 0..20
    started_at = Column(DateTime, default=now)
    submitted_at = Column(DateTime, nullable=True)
    details = Column(JSON, default=dict)                  # per-question grading info

    questions = relationship("ExamQuestion", back_populates="attempt",
                             cascade="all, delete-orphan")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    order = Column(Integer, default=0)
    user_answer = Column(JSON, nullable=True)             # {"choice": i} / {"text": "..."} 
    score = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    feedback = Column(Text, default="")

    attempt = relationship("ExamAttempt", back_populates="questions")
    question = relationship("Question")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    kind = Column(String(20), default="text")             # text | voice
    text = Column(Text, default="")
    audio_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=now)


class AiChatMessage(Base):
    """Student <-> AI assistant chat history — persisted so the chat is
    never lost when the student navigates away or reloads the page."""
    __tablename__ = "ai_chat_messages"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    role = Column(String(10), nullable=False)             # user | ai
    content = Column(Text, default="")
    created_at = Column(DateTime, default=now)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    text = Column(Text, nullable=False)
    link = Column(String(255), default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)


class SupportTicket(Base):
    """Student feedback / bug-report / support request seen by admins."""
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    category = Column(String(30), default="support")   # support | bug | feedback
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)


class StudyPlan(Base):
    __tablename__ = "study_plans"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), unique=True)
    content = Column(JSON, default=dict)                  # plan payload (weekly…)
    source = Column(String(10), default="ai")             # ai | mentor
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class PlanProgress(Base):
    """Daily task check-in: the student marks each planned session of a day
    as done / missed. Keyed to the calendar date + plan day/task index so
    every week restarts fresh."""
    __tablename__ = "plan_progress"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), index=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    date_str = Column(String(10), index=True)             # YYYY-MM-DD (the day the task belongs to)
    day_index = Column(Integer, default=0)                # row inside plan.weekly
    task_index = Column(Integer, default=0)               # session inside the day
    status = Column(String(10), default="done")           # done | missed
    created_at = Column(DateTime, default=now)

    __table_args__ = (
        UniqueConstraint("plan_id", "student_id", "date_str",
                         "day_index", "task_index", name="uq_plan_progress"),
    )


class VideoSuggestion(Base):
    __tablename__ = "video_suggestions"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    subject = Column(String(80))
    title = Column(String(255))
    url = Column(String(500))
    reason = Column(Text, default="")
    source = Column(String(30), default="youtube")   # youtube | aparat | search
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)


class ConsultSlot(Base):
    """One 45-minute consultation slot. The mentor defines free windows on a
    day (duration must be a multiple of 45 min, half-hour boundaries); each
    window is split into consecutive 45-min slots. A slot is free until a
    student books it — the first student to claim it (atomic UPDATE on the
    NULL student_id) wins."""
    __tablename__ = "consult_slots"
    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), index=True)
    date_str = Column(String(10), index=True)         # YYYY-MM-DD
    start_min = Column(Integer, default=0)            # minutes since midnight
    duration_min = Column(Integer, default=45)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    booked_at = Column(DateTime, nullable=True)       # claim timestamp
    status = Column(String(10), default="booked")     # booked | done (held)
    created_at = Column(DateTime, default=now)

    __table_args__ = (
        UniqueConstraint("mentor_id", "date_str", "start_min",
                         name="uq_consult_slot"),
    )


class SupervisionEntry(Base):
    """Mentor supervision program: for a given student+day one short text per
    time part (8-9:30 … 19:30-21). The student sees these inside the study-plan
    page and marks each as done / couldn't (status) — feeding weekly stats."""
    __tablename__ = "supervision_entries"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    date_str = Column(String(10), index=True)         # YYYY-MM-DD
    part = Column(Integer, default=0)                 # 0..5 fixed time parts
    text = Column(Text, default="")
    status = Column(String(10), default="todo")       # todo | done | missed
    updated_at = Column(DateTime, default=now, onupdate=now)

    __table_args__ = (
        UniqueConstraint("student_id", "date_str", "part",
                         name="uq_supervision_entry"),
    )
