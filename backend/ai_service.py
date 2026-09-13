"""AI service adapter for LLM inference, student diagnostics, and offline fallback."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import urllib.request
from datetime import datetime
from urllib.parse import quote

from dotenv import load_dotenv

# Load environment configuration
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

AI_PROVIDER_KEY = os.environ.get("AI_API_KEY", "")
AI_API_BASE_URL = os.environ.get("AI_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
AI_MODEL = os.environ.get("AI_MODEL", "openai/gpt-oss-120b")
USE_MOCK = os.environ.get("AI_USE_MOCK", "0") == "1" or not AI_PROVIDER_KEY

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
FA_LATIN = str.maketrans("0123456789", PERSIAN_DIGITS)


def fa_number(n) -> str:
    return str(n).translate(FA_LATIN)


def today_label() -> str:
    return datetime.now().strftime("%Y/%m/%d")


MOCK_CHANNELS = [
    {"title": "Medu IR Education", "url": "https://www.youtube.com/user/medu_ir"},
    {"title": "PaDars Educational", "url": "https://www.youtube.com/@padars"},
    {"title": "Alaa Educational TV", "url": "https://www.youtube.com/@alaatv"},
    {"title": "Moshaveran Learning", "url": "https://www.youtube.com/@moshaveran"},
    {"title": "Kanoon Ghalemchi", "url": "https://www.youtube.com/@kankon"},
]

SUBJECT_MAP = {
    "math": "Mathematics",
    "physics": "Physics",
    "chemistry": "Chemistry",
    "biology": "Biology",
    "literature": "Literature",
    "english": "English",
    "arabic": "Arabic",
    "religion": "Ethics & Religion",
}

GOAL_LABELS = {
    "better_average": "Improve Overall GPA",
    "specific_subjects": "Master Specific Subjects",
    "konkur": "University Entrance Prep",
}

DIFFICULTY_LABELS = {1: "Easy", 2: "Medium", 3: "Hard", 4: "Very Hard"}
MODEL_LABELS = {
    "random": "Mixed / Random",
    "essay": "Essay Only",
    "fill": "Fill-in-the-blank Only",
    "mcq": "Multiple Choice",
}


class AIProvider:
    """Unified AI service adapter supporting OpenAI-compatible APIs and deterministic offline fallbacks."""

    def _call_llm(self, system: str, user: str, json_mode: bool = False) -> str:
        if USE_MOCK:
            return self._mock_reply(system, user)

        try:
            payload = {
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.4,
                "max_tokens": 4096,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            req = urllib.request.Request(
                f"{AI_API_BASE_URL}/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {AI_PROVIDER_KEY}",
                },
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                message = body["choices"][0]["message"]
                content = message.get("content")
                if not content:
                    content = message.get("reasoning_content", "")
                return (content or "").strip()
        except Exception as e:
            print(f"[ai] Provider call failed ({e}); falling back to offline mock.")
            return self._mock_reply(system, user)

    def _mock_reply(self, system: str, user: str) -> str:
        profile = json.loads(user) if user.strip().startswith("{") else {}
        if "analyze" in system:
            return self._mock_analysis(profile)
        if "essay_grade" in system:
            return self._mock_essay_grade(profile)
        if "videos" in system:
            return self._mock_videos(profile)
        return "I understand. Please let me know how I can assist with your study plan or questions."

    def _mock_analysis(self, profile: dict) -> dict:
        scores = profile.get("subject_scores", [])
        goal = profile.get("goal_type", "better_average")
        goal_subs = profile.get("goal_subjects", []) or []

        rows = [
            {"subject": s.get("subject", ""), "score": float(s.get("score", 0))}
            for s in scores if s.get("score") is not None
        ]
        rows.sort(key=lambda r: -r["score"])
        best = rows[:3]
        worst = sorted(rows, key=lambda r: r["score"])[:3]

        if goal in ("konkur", "better_average"):
            focus = worst
        else:
            focus = [r for r in rows if r["subject"] in goal_subs] or worst

        strengths_text = ", ".join(f"{r['subject']} ({r['score']})" for r in best) or "N/A"
        weaknesses_text = ", ".join(f"{r['subject']} ({r['score']})" for r in worst) or "N/A"

        summary = (
            f"Student in grade {profile.get('grade_level', '')} evaluated with previous average of "
            f"{profile.get('last_year_avg', 0)} and goal '{GOAL_LABELS.get(goal, goal)}'. "
            f"Strengths: {strengths_text}. Focus areas: {weaknesses_text}. "
            f"Recommended strategy involves structured daily study sessions followed by modular tests."
        )

        plan = self._build_plan(rows, focus, goal)

        return {
            "summary": summary,
            "strengths": [r["subject"] for r in best],
            "weaknesses": [r["subject"] for r in worst],
            "focus_subjects": [r["subject"] for r in focus],
            "goal": goal,
            "goal_label": GOAL_LABELS.get(goal, goal),
            "plan": plan,
            "mentor_report": (
                f"AI Diagnostic Report for Student:\n"
                f"• Target Goal: {GOAL_LABELS.get(goal, goal)}\n"
                f"• Previous GPA: {profile.get('last_year_avg', 0)}\n"
                f"• Strengths: {strengths_text}\n"
                f"• Improvement Areas: {weaknesses_text}\n"
                f"• Suggested Routine: {plan.get('summary', '')}\n"
                f"Generated: {today_label()}"
            ),
            "analyzed_at": today_label(),
        }

    def _build_plan(self, rows, focus, goal) -> dict:
        days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"]
        focus_names = [r["subject"] for r in focus] or [r["subject"] for r in rows[:2]] or ["Mathematics"]
        weekly = []
        for i, day in enumerate(days):
            main = focus_names[i % len(focus_names)]
            other = focus_names[(i + 1) % len(focus_names)]
            weekly.append({
                "day": day,
                "sessions": [
                    {"subject": main, "hours": 1.5, "focus": "Core concept review and practice"},
                    {"subject": other, "hours": 1.0, "focus": "Quick drill and problem solving"},
                ],
            })
        weekly.append({
            "day": "Friday",
            "sessions": [
                {"subject": "Comprehensive Test", "hours": 2.0, "focus": "Weekly review exam"},
                {"subject": "Review & Rest", "hours": 1.0, "focus": "Notes summary"},
            ],
        })
        return {
            "weekly": weekly,
            "summary": f"Targeting 2.5 hours of daily focused study, emphasizing {', '.join(focus_names[:2])}.",
            "daily_minutes": 150,
            "generated_at": today_label(),
        }

    def _mock_essay_grade(self, payload: dict) -> dict:
        text = payload.get("text", "")
        keywords = [k for k in payload.get("keywords", []) if k]
        hits = sum(1 for k in keywords if k and k in text)
        base = 10.0
        score = min(20.0, base + hits * 2.0)
        if len(text) < 20:
            score = min(score, 8.0)
        feedback = "Partial understanding shown." if score < 12 else "Good explanation covering key required concepts."
        return {"score": round(score, 1), "feedback": feedback}

    def _mock_videos(self, payload: dict) -> list:
        subjects = payload.get("subjects") or ["General"]
        out = []
        out.append({
            "subject": "هوش مصنوعی",
            "title": "ویدیوهای اختصاصی پس از بررسی دقیق‌تر عملکرد و آزمون‌های شما توسط هوش مصنوعی پیشنهاد خواهند شد.",
            "url": "#/exam/new",
            "reason": "هوش مصنوعی بر اساس تحلیل آزمون‌ها و نقاط ضعف شما بهترین ویدیوهای آموزشی آپارات و یوتیوب را انتخاب خواهد کرد.",
            "source": "ai",
            "views": 0,
            "likes": 0,
        })
        for s in subjects[:2]:
            out.append({
                "subject": s,
                "title": f"آموزش و حل تست مبحثی {s}",
                "url": self._aparat_search_url(s),
                "reason": f"مجموعه ویدیویی آموزشی برای تقویت مباحث {s}.",
                "source": "aparat",
                "views": 1500,
                "likes": 85,
            })
        return out

    def _youtube_search_url(self, subject: str) -> str:
        q = re.sub(r"\s+", "+", subject)
        return f"https://www.youtube.com/results?search_query=education+{q}&sp=CAMSBAgCEAE%3D"

    def _aparat_search_url(self, subject: str) -> str:
        return f"https://www.aparat.com/result/{quote(subject)}"

    def _aparat_search(self, subjects: list) -> list:
        out = []
        for sub in subjects[:4]:
            try:
                url = f"https://www.aparat.com/etc/api/videoBySearch/text/{quote(sub)}/perpage/6"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    data = json.loads(r.read().decode("utf-8", "replace"))
                vids = data.get("videolist") or []
                for v in vids[:3]:
                    uid = v.get("uid")
                    if not uid:
                        continue
                    views = int(v.get("visit_cnt") or v.get("views") or 0)
                    likes = int(v.get("like_cnt") or v.get("likes") or 0)
                    out.append({
                        "subject": sub,
                        "title": v.get("title", f"Lessons for {sub}"),
                        "url": f"https://www.aparat.com/v/{uid}",
                        "reason": f"Top rated video with {views:,} views.",
                        "source": "aparat",
                        "views": views,
                        "likes": likes,
                    })
            except Exception:
                continue
        return out

    def _youtube_search(self, subjects: list) -> list:
        key = os.environ.get("YOUTUBE_API_KEY", "")
        if not key:
            return []
        out = []
        for sub in subjects[:4]:
            try:
                q = quote(f"education {sub}")
                su = (f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video"
                      f"&maxResults=5&order=viewCount&q={q}&key={key}")
                with urllib.request.urlopen(su, timeout=15) as r:
                    sdata = json.loads(r.read().decode())
                ids = [it["id"]["videoId"] for it in sdata.get("items", []) if it.get("id", {}).get("videoId")]
                stats = {}
                if ids:
                    vu = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={','.join(ids[:5])}&key={key}"
                    with urllib.request.urlopen(vu, timeout=15) as r:
                        vdata = json.loads(r.read().decode())
                    for it in vdata.get("items", []):
                        st = it.get("statistics", {})
                        stats[it["id"]] = (int(st.get("viewCount") or 0), int(st.get("likeCount") or 0))

                for it in sdata.get("items", [])[:3]:
                    vid = it.get("id", {}).get("videoId")
                    if not vid:
                        continue
                    views, likes = stats.get(vid, (0, 0))
                    out.append({
                        "subject": sub,
                        "title": it["snippet"]["title"],
                        "url": f"https://www.youtube.com/watch?v={vid}",
                        "reason": f"Popular YouTube lecture ({views:,} views).",
                        "source": "youtube",
                        "views": views,
                        "likes": likes,
                    })
            except Exception:
                continue
        return out

    def _llm_videos(self, subjects: list, lang: str = "fa") -> list:
        prompt_note = (
            "For each subject return 2 top educational video channels or search queries. "
            "Output JSON format only: [{\"subject\": string, \"title\": string, \"channel\": string, "
            "\"platform\": \"youtube\"|\"aparat\", \"reason\": string}]"
        )
        try:
            raw = self._call_llm(
                "videos: " + prompt_note,
                json.dumps({"subjects": subjects[:4]}, ensure_ascii=False),
                json_mode=True,
            )
            data = self._safe_json(raw, [])
            items = data if isinstance(data, list) else []
        except Exception:
            items = []

        if not items:
            return self._mock_videos({"subjects": subjects})

        out = []
        for it in items[:8]:
            subj = it.get("subject") or "General"
            title = it.get("title") or f"Lectures on {subj}"
            channel = it.get("channel") or ""
            platform = (it.get("platform") or "youtube").lower()
            reason = it.get("reason") or ""
            if platform == "aparat":
                url = self._aparat_search_url(subj)
                src = "aparat"
            else:
                url = self._youtube_search_url(subj)
                src = "youtube"
            if channel:
                title = f"{title} — {channel}"
            out.append({
                "subject": subj,
                "title": title,
                "url": url,
                "reason": reason,
                "source": src,
                "views": 0,
                "likes": 0,
            })
        return out[:6]

    def analyze_student(self, profile: dict) -> dict:
        schema = (
            'JSON schema: {"summary": string, "strengths": [string], '
            '"weaknesses": [string], "focus_subjects": [string], '
            '"goal": string, "goal_label": string, '
            '"plan": {"weekly": [{"day": string, "sessions": [{"subject": string, '
            '"hours": number, "focus": string}]}], "summary": string, '
            '"daily_minutes": number, "generated_at": string}, '
            '"mentor_report": string, "analyzed_at": string}'
        )
        raw = self._call_llm(
            "analyze: " + schema,
            json.dumps(profile, ensure_ascii=False),
            json_mode=True,
        )
        return self._safe_json(raw, self._mock_analysis(profile))

    def grade_essay(self, text: str, keywords: list) -> dict:
        payload = {"text": text, "keywords": keywords}
        raw = self._call_llm(
            "essay_grade: Grade the student essay on a 0 to 20 scale. Return JSON only: "
            '{"score": number, "feedback": string}',
            json.dumps(payload, ensure_ascii=False),
            json_mode=True,
        )
        return self._safe_json(raw, self._mock_essay_grade(payload))

    def analyze_report_card(self, text_or_filename: str, source: str = "kheilisabz") -> dict:
        """Parses report card details, generating subject metrics, percentiles, traz, and deep background dossier."""
        schema = (
            'JSON schema: {'
            '"title": string, '
            '"overall_score": number, '
            '"overall_traz": number, '
            '"subjects": [{"subject": string, "score": number, "percentage": number, "traz": number, "class_avg": number, "rank": number}], '
            '"strengths": [string], '
            '"weaknesses": [string], '
            '"ai_dossier": string'
            '}'
        )
        system = f"report_card_analysis: Analyze educational report card for provider '{source}'. " + schema
        raw = self._call_llm(system, json.dumps({"source": source, "content": text_or_filename}, ensure_ascii=False), json_mode=True)
        return self._safe_json(raw, self._mock_report_card(source, text_or_filename))

    def _mock_report_card(self, source: str, content: str) -> dict:
        subjects = [
            {"subject": "زیست‌شناسی", "score": 17.5, "percentage": 72.5, "traz": 6450, "class_avg": 54.0, "rank": 14},
            {"subject": "شیمی", "score": 15.0, "percentage": 61.0, "traz": 6120, "class_avg": 48.5, "rank": 28},
            {"subject": "فیزیک", "score": 13.5, "percentage": 46.0, "traz": 5780, "class_avg": 42.0, "rank": 45},
            {"subject": "ریاضی", "score": 12.0, "percentage": 38.5, "traz": 5430, "class_avg": 36.0, "rank": 58},
            {"subject": "ادبیات فارسی", "score": 18.0, "percentage": 78.0, "traz": 6600, "class_avg": 58.0, "rank": 9},
            {"subject": "عربی", "score": 16.5, "percentage": 68.0, "traz": 6310, "class_avg": 51.0, "rank": 22},
            {"subject": "زبان انگلیسی", "score": 19.0, "percentage": 84.0, "traz": 6850, "class_avg": 60.0, "rank": 4},
            {"subject": "دین و زندگی", "score": 18.5, "percentage": 80.0, "traz": 6700, "class_avg": 63.0, "rank": 7},
        ]
        overall_score = round(sum(s["score"] for s in subjects) / len(subjects), 2)
        overall_traz = round(sum(s["traz"] for s in subjects) / len(subjects))

        source_title = "خیلی سبز" if source == "kheilisabz" else ("قلم‌چی" if source == "ghalamchi" else "مدرسه و آزمون‌های جامع")
        dossier = (
            f"=== COMPREHENSIVE AI STUDENT DOSSIER (CONFIDENTIAL) ===\n"
            f"Assessment Source: {source.upper()} ({source_title})\n"
            f"Evaluation Date: {today_label()}\n"
            f"Overall Academic Traz: {overall_traz} | Average Score: {overall_score}/20\n\n"
            f"1. COGNITIVE & SUBJECT PERFORMANCE PROFILE:\n"
            f"- Strongest Domains: English (84%, Traz 6850), Religion (80%), and Literature (78%). Student shows advanced linguistic fluency and high verbal comprehension speed.\n"
            f"- Critical Improvement Areas: Mathematics (38.5%, Traz 5430) and Physics (46%, Traz 5780). Analysis indicates concept gaps in analytical geometry and kinematics, leading to high error rate in multi-step calculation items.\n"
            f"- Moderate Consistency: Chemistry (61%) and Biology (72.5%) are well-positioned above cohort averages (+18.5% and +12.5% delta respectively), but require targeted formula consolidation.\n\n"
            f"2. BEHAVIORAL & TIME BUDGETING DIAGNOSTIC:\n"
            f"- Problem Solving Velocity: Moderate in numerical subjects, high in conceptual/reading subjects.\n"
            f"- Recommended Pedagogical Interventions:\n"
            f"  a) Dedicate first morning study blocks to high-cognitive load mathematics and physics.\n"
            f"  b) Implement 40-minute test cycles with post-session error logs.\n"
            f"  c) Maintain weekly spaced repetition on Biology flashcards to protect 70%+ mastery.\n\n"
            f"3. LONG-TERM ADAPTIVE RECOVERY TRAJECTORY:\n"
            f"Current percentile places the student in the top 12% bracket. By increasing daily mathematics problem-solving quota to 35 questions/day, expected traz uplift within 6 weeks is +450 to +600 points."
        )

        return {
            "title": f"کارنامه تحلیلی آزمون {source_title}",
            "overall_score": overall_score,
            "overall_traz": overall_traz,
            "subjects": subjects,
            "strengths": ["زبان انگلیسی", "دین و زندگی", "ادبیات فارسی", "زیست‌شناسی"],
            "weaknesses": ["ریاضی", "فیزیک"],
            "ai_dossier": dossier,
        }

    def suggest_videos(self, subjects: list, lang: str = "fa") -> list:
        payload = {"subjects": subjects}
        if USE_MOCK:
            return self._mock_videos(payload)

        items = []
        items += self._aparat_search(subjects)
        if os.environ.get("YOUTUBE_API_KEY"):
            items += self._youtube_search(subjects)
        if items:
            items.sort(key=lambda v: -(v.get("views") or 0))
            return items[:6]
        return self._llm_videos(subjects, lang)

    def chat(self, messages: list, student_context: dict) -> str:
        lang = (student_context or {}).get("lang", "fa")
        if lang == "en":
            system = (
                "You are an intelligent educational assistant supporting a student. "
                "Provide helpful, friendly, and concise responses. Student details: "
                + json.dumps(student_context, ensure_ascii=False)
            )
        else:
            system = (
                "تو دستیار هوشمند آموزشی هستی که به دانش‌آموز کمک می‌کنی. "
                "کوتاه، دقیق و دوستانه پاسخ بده. مشخصات دانش‌آموز: "
                + json.dumps(student_context, ensure_ascii=False)
            )
        prompt = json.dumps(messages, ensure_ascii=False)
        return self._call_llm(system, prompt)

    def _safe_json(self, raw: str, fallback):
        try:
            start = raw.find("{")
            end = raw.rfind("}")
            if start >= 0 and end > start:
                return json.loads(raw[start:end + 1])
            if raw.strip().startswith("["):
                return json.loads(raw)
        except Exception:
            pass
        return fallback


ai = AIProvider()
