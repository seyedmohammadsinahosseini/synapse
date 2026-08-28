"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from .security import validate_password


def _pw_validator(v: str) -> str:
    err = validate_password(v)
    if err:
        raise ValueError(err)
    return v


# ── Auth ──────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=128)


class SubjectScore(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    score: float = Field(ge=0, le=20)


class StudentRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=160)
    phone: Optional[str] = Field(default="", max_length=30)
    password: str = Field(max_length=128)
    field_of_study: str = Field(min_length=1, max_length=80)
    grade_level: str = Field(min_length=1, max_length=60)
    last_year_avg: float = Field(ge=0, le=20)
    goal_type: str = Field(max_length=40)  # better_average | specific_subjects | konkur
    goal_subjects: List[str] = []
    subject_scores: List[SubjectScore] = []
    mentor_code: str = Field(default="", max_length=40)  # optional
    lang: str = Field(default="fa", max_length=10)       # UI language (fa | en)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _pw_validator(v)


class UserOut(BaseModel):
    id: int
    role: str
    full_name: str
    email: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    code: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(max_length=128)
    new_password2: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check(cls, v: str) -> str:
        return _pw_validator(v)


class TokenOut(BaseModel):
    token: str
    user: UserOut


# ── Admin ────────────────────────────────────────────────────────────────
class MentorCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(max_length=128)
    code: str = Field(min_length=2, max_length=40)
    phone: Optional[str] = Field(default="", max_length=30)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _pw_validator(v)


class StudentEditRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=30)
    password: Optional[str] = Field(default=None, max_length=128)
    field_of_study: Optional[str] = Field(default=None, max_length=80)
    grade_level: Optional[str] = Field(default=None, max_length=60)
    goal_type: Optional[str] = Field(default=None, max_length=40)
    last_year_avg: Optional[float] = Field(default=None, ge=0, le=20)
    goal_subjects: Optional[List[str]] = None

    @field_validator("password")
    @classmethod
    def _password(cls, v):
        if v:
            return _pw_validator(v)
        return v


class MentorEditRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=30)
    code: Optional[str] = Field(default=None, max_length=40)
    password: Optional[str] = Field(default=None, max_length=128)
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def _password(cls, v):
        if v:
            return _pw_validator(v)
        return v


class QuestionIn(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    type: str = Field(max_length=20)    # mcq | essay | fill
    difficulty: int = Field(ge=1, le=5)
    text: str = Field(min_length=1, max_length=5000)
    options: List[str] = []
    answer: str = Field(min_length=1, max_length=2000)
    explanation: str = Field(default="", max_length=5000)


class QuestionOut(QuestionIn):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Exams ────────────────────────────────────────────────────────────────
class ExamStartRequest(BaseModel):
    kind: str = "test"                # test | exam
    count: int = Field(ge=1, le=60)
    difficulty: int = Field(ge=1, le=4)
    model: str = "random"             # random | essay | fill | mcq


class AnswerIn(BaseModel):
    question_id: int
    choice: Optional[int] = None      # mcq
    text: Optional[str] = Field(default=None, max_length=5000)  # essay / fill


class ExamSubmitRequest(BaseModel):
    answers: List[AnswerIn] = []


# ── Chat ─────────────────────────────────────────────────────────────────
class MessageOut(BaseModel):
    id: int
    student_id: int
    mentor_id: int
    sender_id: int
    receiver_id: int
    kind: str
    text: str
    audio_path: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
