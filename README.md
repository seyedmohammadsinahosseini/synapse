# 🎓 Mentor & Student Learning Platform

An enterprise-ready, full-stack educational platform designed to connect students with academic mentors, powered by an AI assistant for intelligent student diagnostics, automated weekly study scheduling, interactive examination management, and real-time audio/text communication.

---

## 🌟 Key Features

### 👨‍🎓 Student Portal
- **Multi-step Onboarding:** Comprehensive academic profile setup including field of study, historical performance, target goals (GPA improvement, subject mastery, or national entrance exams), and optional mentor binding.
- **AI Diagnostics & Study Planner:** Instant academic SWOT analysis generated upon registration with automated personalized weekly study routines.
- **Smart Floating AI Assistant:**
  - Interactive conversational assistant with custom workflows (`/test`, `/exam`, `/plan`).
  - Dynamic test generation based on custom difficulty and question models (Multiple Choice, Essay, Fill-in-the-blank).
  - Persistent conversation history across browser sessions.
- **Interactive Exam Suite:** Timed examinations with auto-grading for objective questions and AI-driven semantic evaluation for essay answers.
- **Real-time Consultation Booking:** Schedule and manage 45-minute 1-on-1 consultation sessions with mentors.
- **Real-time Messaging:** Low-latency text chat and audio voice note exchange with assigned mentors.

### 🧑‍🏫 Mentor Dashboard
- **Student Roster & Performance Analytics:** Real-time visibility into connected students, exam averages, task completion metrics, and AI diagnostic reports.
- **Custom Study Plan Builder:** Create, customize, and push tailored weekly study schedules directly to students.
- **Supervision & Daily Tracking:** 6-block daily agenda tracking to supervise student study consistency.
- **Consultation Window Management:** Define available consultation blocks with automated atomic slot booking.
- **Voice & Direct Messaging:** Real-time two-way communication channel with connected students.

### 🛡️ Admin & Question Bank Management
- **Comprehensive Analytics:** System-wide metrics for user engagement, exam completions, and mentor allocations.
- **Question Bank Engine:** Full CRUD operations on question sets with bulk import capabilities supporting both **JSON** and **Excel (.xlsx)** formats.
- **Role-based Access Control (RBAC):** Granular permissions for Students, Mentors, and Administrators.
- **Support & Feedback Desk:** Integrated issue reporting and support ticket triage.

---

## 🛠️ Architecture & Tech Stack

```text
mentor-panel/
├── backend/                  # FastAPI Application
│   ├── routers/              # Modular API Endpoints
│   ├── ai_service.py         # Pluggable LLM Provider & Fallbacks
│   ├── database.py           # SQLAlchemy DB Engine & Session
│   ├── models.py             # Database Schema Definitions
│   ├── schemas.py            # Pydantic Request/Response Models
│   ├── security.py           # JWT, PBKDF2 Hashing, Rate Limiting & RBAC
│   ├── seed.py               # Database Seeding Script
│   └── main.py               # App Initialization & Middleware
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI Components
│   │   ├── pages/            # View Pages (Dashboard, Exam, Admin, Chat)
│   │   ├── i18n.jsx          # Internationalization Support (EN/FA)
│   │   └── api.js            # API Client Layer
│   └── package.json
└── start_backend.py          # Quick Start Backend Script
```

### Technology Highlights
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, Pydantic v2, PyJWT, WebSockets.
- **Frontend:** React 18, Vite, Modern CSS variables, RTL & LTR responsive layout.
- **Database:** SQLite (default with zero config) / PostgreSQL compatible.
- **AI Engine:** OpenAI-compatible API Gateway (NVIDIA NIM, DeepSeek, OpenAI, Ollama) with deterministic offline fallback.
- **Security:** Rate limiting middleware, PBKDF2 password hashing (120,000 iterations), magic-byte audio validation, JWT bearer tokens, and sanitized inputs.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10 or higher
- Node.js 18.x or higher & npm

---

### 1. Backend Setup

1. Open your terminal in the project root:
   ```bash
   cd /path/to/mentor-panel
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Configure environment variables:
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```env
   APP_SECRET=your-random-secret-key-here
   AI_API_KEY=your-api-key-here
   AI_API_BASE_URL=https://integrate.api.nvidia.com/v1
   AI_MODEL=openai/gpt-oss-120b
   AI_USE_MOCK=0
   CORS_ORIGINS=*
   ```

5. Initialize the database and start the backend:
   ```bash
   python start_backend.py
   ```
   *The API will be available at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).*

---

### 2. Frontend Setup

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   *The web application will be accessible at `http://localhost:5173`.*

---

## 🔑 Default Test Accounts

After running `python start_backend.py`, the following accounts are pre-seeded:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@panel.test` | `admin123` | Full admin & question bank access |
| **Mentor** | `mentor@panel.test` | `mentor123` | Invite Code: `MNT1001` |
| **Student** | *(Register via UI)* | *(Set in form)* | Use `MNT1001` or leave blank for AI mentor |

---

## 🔒 Security Best Practices

- **Zero Hardcoded Secrets:** All credentials and tokens are loaded via environment variables.
- **Rate Limiting:** Built-in IP-based sliding window protection against brute-force attacks on auth and AI endpoints.
- **Audio Upload Protection:** Strict mime type, file size (max 10MB), and binary magic-byte header validation.
- **Strict Role Authorization:** All sensitive endpoints (question management, student deletion, mentor assignment) strictly enforce role checks.

---

## 📄 License
This project is released under the MIT License.
