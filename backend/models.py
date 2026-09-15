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
    ai_dossier = Column(JSON, default=dict)               # Long-term comprehensive AI student dossier

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
    source = Column(String(20), default="self")           # self | exam | test | report_card
    year_label = Column(String(40), default="")           # e.g. 1403-1404
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
    """Student <-> AI assistant chat history."""
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
    """Student feedback / bug-report / support request."""
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    category = Column(String(30), default="support")   # support | bug | feedback
    subject = Column(String(160), default="")
    content = Column(Text, nullable=False)
    status = Column(String(20), default="open")        # open | in_progress | resolved
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)

    student = relationship("User", foreign_keys=[student_id])
    messages = relationship("TicketMessage", back_populates="ticket",
                            cascade="all, delete-orphan", order_by="TicketMessage.id.asc()")


class TicketMessage(Base):
    """Message thread within a feedback/support ticket."""
    __tablename__ = "ticket_messages"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    sender_role = Column(String(20), default="student") # student | mentor | admin
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now)

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class StudyPlan(Base):
    __tablename__ = "study_plans"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), unique=True)
    content = Column(JSON, default=dict)                  # plan payload (weekly…)
    source = Column(String(10), default="ai")             # ai | mentor
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class PlanProgress(Base):
    """Daily task check-in with exact completion timestamp."""
    __tablename__ = "plan_progress"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), index=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    date_str = Column(String(10), index=True)             # YYYY-MM-DD
    day_index = Column(Integer, default=0)                # day inside plan.weekly
    task_index = Column(Integer, default=0)               # session index
    status = Column(String(10), default="done")           # done | missed
    completed_at = Column(DateTime, nullable=True)        # Exact timestamp when marked done
    created_at = Column(DateTime, default=now)

    __table_args__ = (
        UniqueConstraint("plan_id", "student_id", "date_str",
                         "day_index", "task_index", name="uq_plan_progress"),
    )


class DailyCapacityAlert(Base):
    """Student daily study constraint or exception."""
    __tablename__ = "daily_capacity_alerts"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    date_str = Column(String(10), index=True)             # YYYY-MM-DD
    max_hours = Column(Float, nullable=False)             # Max hours student can study on this day
    reduced_hours = Column(Float, default=0.0)            # Hours reduced compared to normal
    reason = Column(String(255), default="")              # Reason for capacity constraint
    created_at = Column(DateTime, default=now)

    __table_args__ = (
        UniqueConstraint("student_id", "date_str", name="uq_student_capacity_alert"),
    )


class ReportCard(Base):
    """Uploaded and AI-parsed student report card (e.g. Kheilisabz, Ghalamchi, School)."""
    __tablename__ = "report_cards"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(120), nullable=False)
    provider = Column(String(80), default="خیلی سبز")
    source = Column(String(40), default="kheilisabz")     # kheilisabz | ghalamchi | school | custom
    exam_date = Column(String(20), nullable=True)
    total_traz = Column(Integer, nullable=True)
    overall_rank = Column(Integer, nullable=True)
    file_path = Column(String(255), nullable=True)
    parsed_data = Column(JSON, default=dict)
    ai_insights = Column(JSON, default=dict)
    summary_metrics = Column(JSON, default=list)          # [{subject, score, percentage, traz, class_avg, rank}]
    overall_score = Column(Float, nullable=True)
    overall_traz = Column(Integer, nullable=True)
    ai_dossier = Column(Text, default="")                 # Long-term comprehensive background analysis
    status = Column(String(20), default="analyzed")       # pending | analyzed
    created_at = Column(DateTime, default=now)


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


class ConsultationSession(Base):
    """Detailed consultation session with audio, AI behavioral/academic insights, and advisor directives."""
    __tablename__ = "consultation_sessions"
    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    slot_id = Column(Integer, ForeignKey("consult_slots.id"), nullable=True)
    session_date = Column(String(30), nullable=False)      # e.g. ۱۴۰۵/۰۶/۲۴ or 2026-09-15
    duration_minutes = Column(Integer, default=30)
    consultation_type = Column(String(30), default="تلفنی") # تلفنی | حضوری | آنلاین
    student_evaluation = Column(String(40), default="عالی") # عالی | خوب | متوسط | نیازمند انگیزه | بحرانی
    discussion_topics = Column(Text, default="")
    advisor_recommendations = Column(Text, default="")
    next_session_date = Column(String(40), default="")
    audio_path = Column(String(255), nullable=True)
    ai_diagnostic_notes = Column(Text, default="")
    created_at = Column(DateTime, default=now)

    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])
    slot = relationship("ConsultSlot", foreign_keys=[slot_id])


class CurriculumSource(Base):
    """Textbook curriculum knowledge units for AI analysis and question bank generation."""
    __tablename__ = "curriculum_sources"
    id = Column(Integer, primary_key=True)
    title = Column(String(160), nullable=False)
    grade_level = Column(String(40), nullable=False)      # دهم | یازدهم | دوازدهم
    field_of_study = Column(String(80), nullable=False)   # علوم تجربی | ریاضی و فیزیک | علوم انسانی
    subject = Column(String(80), nullable=False)
    chapter_name = Column(String(160), default="")
    content_json = Column(JSON, default=dict)             # JSON structured concepts, lessons, topics
    summary_text = Column(Text, default="")
    file_path = Column(String(255), nullable=True)
    status = Column(String(30), default="processed")      # pending | processed
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now)

