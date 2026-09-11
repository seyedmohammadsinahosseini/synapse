"""FastAPI application entry point and middleware configuration."""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Load configuration from .env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from .database import Base, engine
from .routers import (admin, ai, auth, chat, consult, dashboard,
                       exams, mentor, plan, support)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Student-Mentor Educational Platform", version="1.0.0")

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(exams.router)
app.include_router(mentor.router)
app.include_router(chat.router)
app.include_router(chat.ws_router)
app.include_router(admin.router)
app.include_router(plan.router)
app.include_router(consult.mentor_router)
app.include_router(consult.student_router)
app.include_router(support.router)

MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "mentor-platform-backend"}


@app.get("/")
def root():
    return {"status": "online", "name": "Mentor Platform API", "docs": "/docs"}
