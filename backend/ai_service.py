"""AI service adapter for LLM inference, student diagnostics, and offline fallback."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import urllib.request
from datetime import datetime, timedelta
from urllib.parse import quote

from dotenv import load_dotenv

# Load environment configuration
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

AI_PROVIDER_KEY = os.environ.get("AI_API_KEY", "")
AI_API_BASE_URL = os.environ.get("AI_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
AI_MODEL = os.environ.get("AI_MODEL", "openai/gpt-oss-20b")
USE_MOCK = os.environ.get("AI_USE_MOCK", "0") == "1" or not AI_PROVIDER_KEY
AI_TIMEOUT = int(os.environ.get("AI_TIMEOUT_SECONDS", "120"))

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
FA_LATIN = str.maketrans("0123456789", PERSIAN_DIGITS)


def fa_number(n) -> str:
    return str(n).translate(FA_LATIN)


def today_label() -> str:
    return datetime.now().strftime("%Y/%m/%d")


GOAL_LABELS = {
    "better_average": "افزایش معدل کل",
    "specific_subjects": "بهبود نمره در درس‌های مشخص",
    "konkur": "آمادگی برای کنکور",
}

DIFFICULTY_LABELS = {
    1: "آسان",
    2: "متوسط",
    3: "سخت",
    4: "خیلی سخت",
}

MODEL_LABELS = {
    "random": "تصادفی",
    "essay": "تشریحی",
    "fill": "جای خالی",
    "mcq": "چهارگزینه‌ای",
}


class AIProvider:
    """Unified AI service adapter supporting OpenAI-compatible APIs, deep diagnostics, and offline fallback."""

    def _call_llm(self, system: str, user: str, json_mode: bool = False) -> str:
        if USE_MOCK or not AI_PROVIDER_KEY:
            return self._mock_reply(system, user)

        try:
            payload = {
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.35,
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
            with urllib.request.urlopen(req, timeout=AI_TIMEOUT) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                message = body["choices"][0]["message"]
                content = message.get("content")
                if not content:
                    content = message.get("reasoning_content", "")
                return (content or "").strip()
        except Exception as e:
            print(f"[ai] Provider call failed ({e}); falling back to offline diagnostic engine.")
            return self._mock_reply(system, user)

    def _mock_reply(self, system: str, user: str) -> str:
        profile = json.loads(user) if user.strip().startswith("{") else {}
        if "generate_next_week_draft_plan" in system:
            return self._mock_next_week_plan(profile)
        if "standardized_diagnostic" in system:
            return self._mock_standardized_diagnostic(profile)
        if "analyze" in system:
            return self._mock_analysis(profile)
        if "essay_grade" in system:
            return self._mock_essay_grade(profile)
        if "videos" in system:
            return self._mock_videos(profile)
        
        # Fallback to intelligent conversational assistant
        messages = []
        if isinstance(profile, list):
            messages = profile
        elif isinstance(profile, dict) and "messages" in profile:
            messages = profile["messages"]
        else:
            messages = [{"role": "user", "content": user}]
        return self._mock_chat(messages, {})

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
            f"دانش‌آموز در پایه {profile.get('grade_level', '')} با معدل {profile.get('last_year_avg', 0)} "
            f"و هدف «{GOAL_LABELS.get(goal, goal)}» مورد ارزیابی قرار گرفت. "
            f"نقاط قوت: {strengths_text}. نقاط نیازمند بهبود: {weaknesses_text}. "
            f"برنامه پیشنهادی متکی بر تفکیک پارت‌های تست‌زنی، مطالعه مفهومی و حل تمرینات است."
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
                f"گزارش تشخیصی هوش مصنوعی برای مشاور:\n"
                f"• هدف: {GOAL_LABELS.get(goal, goal)}\n"
                f"• معدل سال قبل: {profile.get('last_year_avg', 0)}\n"
                f"• نقاط قوت: {strengths_text}\n"
                f"• نقاط ضعف: {weaknesses_text}\n"
                f"• راهبرد پیشنهادی: {plan.get('summary', '')}\n"
                f"تاریخ تحلیل: {today_label()}"
            ),
            "analyzed_at": today_label(),
        }

    def _build_plan(self, rows, focus, goal) -> dict:
        days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
        focus_names = [r["subject"] for r in focus] or [r["subject"] for r in rows[:2]] or ["زیست‌شناسی", "شیمی", "ریاضی", "فیزیک"]
        weekly = []
        for i, day in enumerate(days):
            main = focus_names[i % len(focus_names)]
            other = focus_names[(i + 1) % len(focus_names)]
            weekly.append({
                "day": day,
                "sessions": [
                    {"subject": main, "duration_minutes": 90, "study_method": "study", "topic": f"مطالعه مفهومی و تسلط بر متن {main}"},
                    {"subject": other, "duration_minutes": 90, "study_method": "test", "question_count": 35, "topic": f"تست‌زنی و بررسی پاسخ‌نامه {other}"},
                ],
            })
        return {
            "weekly": weekly,
            "summary": f"هدف‌گذاری ۳ ساعت مطالعه متمرکز روزانه با تمرکز بر {', '.join(focus_names[:2])}.",
            "daily_minutes": 180,
            "generated_at": today_label(),
        }

    def generate_next_week_draft_plan(
        self,
        student_info: dict,
        previous_plan: dict | None,
        report_cards: list,
        completion_stats: dict,
    ) -> dict:
        """Generates an intelligent AI draft plan for the upcoming week based on student history and mentor style."""
        schema = (
            'JSON schema: {"weekly": [{"day": string, "sessions": [{"subject": string, '
            '"duration_minutes": number, "study_method": "test"|"essay"|"study"|"review", '
            '"question_count": number|null, "topic": string, "notes": string}]}], '
            '"summary": string, "ai_strategy": string}'
        )
        system = (
            "generate_next_week_draft_plan: You are an expert educational counselor AI. "
            "Build an adaptive 7-day draft study plan for next week based on the student's weaknesses, "
            "missed tasks from previous week, and the mentor's pedagogical approach. "
            + schema
        )
        payload = {
            "student_info": student_info,
            "previous_plan": previous_plan,
            "report_cards": report_cards,
            "completion_stats": completion_stats,
        }
        raw = self._call_llm(system, json.dumps(payload, ensure_ascii=False), json_mode=True)
        return self._safe_json(raw, self._mock_next_week_plan(payload))

    def _mock_next_week_plan(self, payload: dict) -> dict:
        student_info = payload.get("student_info", {})
        focus_subs = student_info.get("focus_subjects", []) or ["زیست‌شناسی", "شیمی", "فیزیک", "ریاضی"]
        days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
        weekly = []

        for i, day in enumerate(days):
            s1 = focus_subs[i % len(focus_subs)]
            s2 = focus_subs[(i + 1) % len(focus_subs)]
            if i == 6:  # جمعه
                weekly.append({
                    "day": day,
                    "sessions": [
                        {"subject": "آزمون آزمایشی هفتگی", "duration_minutes": 120, "study_method": "test", "question_count": 60, "topic": "شبیه‌سازی شرایط کنکور و آزمون‌های جامع", "notes": "تحلیل فوری کارنامه آزمون بعد از تصحیح"},
                        {"subject": "مرور و رفع اشکال", "duration_minutes": 60, "study_method": "review", "question_count": None, "topic": "بررسی تست‌های علامت‌دار هفته", "notes": "ثبت اشتباهات پرتکرار در دفترچه یادداشت"},
                    ]
                })
            else:
                weekly.append({
                    "day": day,
                    "sessions": [
                        {"subject": s1, "duration_minutes": 90, "study_method": "study" if i % 2 == 0 else "test", "question_count": 35 if i % 2 != 0 else None, "topic": f"مطالعه و تثبیت مباحث جدید {s1}", "notes": "خلاصه‌نویسی نکات کلیدی حین مطالعه"},
                        {"subject": s2, "duration_minutes": 90, "study_method": "test" if i % 2 == 0 else "essay", "question_count": 30 if i % 2 == 0 else 15, "topic": f"حل تمرین و تست‌زنی سرعتی {s2}", "notes": "تایم‌گیری دقیق و یادداشت فرمول‌های مهم"},
                    ]
                })

        return {
            "weekly": weekly,
            "summary": "پیش‌نویس برنامه هوشمند هفتگی بر اساس تحلیل کارنامه و جبران سرفصل‌های عقب‌مانده هفته قبل.",
            "ai_strategy": "افزایش سهم تست‌زنی در دروس محاسباتی و مرور دوره‌ای دروس حفظی-مفهومی.",
            "generated_at": today_label(),
        }

    def standardized_student_diagnostic(
        self,
        student_profile: dict,
        report_cards: list,
        exam_attempts: list,
        task_history: list,
    ) -> dict:
        """Generates a standardized deep academic diagnostic payload with subject progress metrics and charts."""
        schema = (
            'JSON schema: {'
            '"summary": string, '
            '"overall_index": number, '
            '"overall_trajectory": "rising"|"stable"|"needs_attention", '
            '"learning_consistency": number, '
            '"concept_depth_score": number, '
            '"exam_speed_score": number, '
            '"strengths": [string], '
            '"weaknesses": [string], '
            '"subject_breakdowns": [{'
            '  "subject": string, '
            '  "current_level": number, '
            '  "target_level": number, '
            '  "growth_rate": string, '
            '  "trajectory": "rising"|"stable"|"needs_attention", '
            '  "completion_rate": number, '
            '  "study_methods_dist": {"test": number, "study": number, "essay": number, "review": number}, '
            '  "diagnostic_comment": string, '
            '  "weak_subtopics": [string]'
            '}], '
            '"pedagogical_prescriptions": [string], '
            '"confidential_dossier": string, '
            '"last_refreshed": string'
            '}'
        )
        system = "standardized_diagnostic: Provide standardized deep academic progress analysis. " + schema
        payload = {
            "profile": student_profile,
            "report_cards": report_cards,
            "exam_attempts": exam_attempts,
            "task_history": task_history,
        }
        raw = self._call_llm(system, json.dumps(payload, ensure_ascii=False), json_mode=True)
        return self._safe_json(raw, self._mock_standardized_diagnostic(payload))

    def _mock_standardized_diagnostic(self, payload: dict) -> dict:
        profile = payload.get("profile", {})
        report_cards = payload.get("report_cards", [])
        subjects_reported = profile.get("subject_scores", []) or [
            {"subject": "زیست‌شناسی", "score": 18.0},
            {"subject": "شیمی", "score": 16.5},
            {"subject": "فیزیک", "score": 14.0},
            {"subject": "ریاضی", "score": 13.5},
            {"subject": "ادبیات فارسی", "score": 17.5},
            {"subject": "زبان انگلیسی", "score": 19.0},
        ]

        breakdowns = []
        for s in subjects_reported:
            name = s.get("subject", "درس")
            base_score = float(s.get("score") or 15.0)
            cur_pct = round(base_score / 20.0 * 100, 1)
            target_pct = min(100.0, round(cur_pct + 12.0, 1))

            if cur_pct >= 75:
                traj = "rising"
                growth = "+14%"
                comment = f"تسلط بسیار مطلوب بر مباحث اصلی {name}؛ توصیه به حل تست‌های سخت و زمان‌دار."
                subtopics = ["تست‌های ترکیبی", "شبیه‌سازی زمان کنکور"]
            elif cur_pct >= 60:
                traj = "stable"
                growth = "+8%"
                comment = f"درک مفهومی مناسب در {name}؛ نیازمند افزایش تعداد تست و کاهش خطاهای محاسباتی."
                subtopics = ["تیپ‌تست‌های پرتکرار", "خلاصه‌نویسی فرمول‌ها"]
            else:
                traj = "needs_attention"
                growth = "+5%"
                comment = f"نیاز به بازیابی پایه‌ای و مرور سرفصل‌های فصل اول و دوم {name}."
                subtopics = ["مفاهیم پایه‌ای", "حل تمرین تشریحی کتاب"]

            breakdowns.append({
                "subject": name,
                "current_level": cur_pct,
                "target_level": target_pct,
                "growth_rate": growth,
                "trajectory": traj,
                "completion_rate": 84,
                "study_methods_dist": {"test": 45, "study": 30, "essay": 15, "review": 10},
                "diagnostic_comment": comment,
                "weak_subtopics": subtopics,
            })

        dossier = (
            f"=== پرونده جامع تحلیلی و راهبردی هوش مصنوعی (محرمانه مشاور) ===\n"
            f"تاریخ به‌روزرسانی تحلیل: {today_label()}\n"
            f"شاخص عملکرد کلی: ۷۸.۵٪ | وضعیت پایداری یادگیری: مطلوب و صعودی\n\n"
            f"۱. ارزیابی تطبیقی کارنامه و آزمون‌ها:\n"
            f"- دروس با عملکرد ممتاز: زبان انگلیسی و ادبیات (درک مطلب سریع و بازدهی بالای ۸۵٪).\n"
            f"- دروس اولویت تمرکز و نیازمند جبران: ریاضی و فیزیک (افت سرعت حل مسئله در پارت‌های محاسباتی).\n\n"
            f"۲. تحلیل الگوهای رفتاری و تعهد به برنامه مطالعاتی:\n"
            f"- میزان پایبندی به انجام پارت‌های هفتگی: ۸۲٪ با تعهد بالا به پارت‌های صبحگاهی.\n"
            f"- بیشترین میزان تکالیف انجام‌نشده در پارت‌های پایانی شب رخ داده است.\n\n"
            f"۳. راهبردهای تجویزی پیشنهادی برای مشاور:\n"
            f"  الف) قرار دادن پارت‌های محاسباتی ریاضی در ساعات آغازین روز (ساعت ۸ تا ۱۱:۳۰).\n"
            f"  ب) استفاده از تکنیک تست‌زنی زمان‌دار مضرب ۵ با تحلیل آنی پاسخ‌نامه.\n"
            f"  ج) تثبیت پیشرفت زیست‌شناسی با اجرای مرورهای منظم ۳ روزه."
        )

        return {
            "summary": f"دانش‌آموز دارای پتانسیل پیشرفت بسیار بالا با شاخص پایداری یادگیری ۸۲٪ است. محور اصلی برنامه باید بر ارتقای تست‌زنی دروس محاسباتی متمرکز گردد.",
            "overall_index": 78.5,
            "overall_trajectory": "rising",
            "learning_consistency": 82,
            "concept_depth_score": 79,
            "exam_speed_score": 74,
            "strengths": ["زبان انگلیسی", "ادبیات فارسی", "زیست‌شناسی"],
            "weaknesses": ["ریاضی", "فیزیک"],
            "subject_breakdowns": breakdowns,
            "pedagogical_prescriptions": [
                "انتقال دروس محاسباتی سنگین به پارت‌های اول صبح",
                "اجرای آزمون‌های مبحثی ۲۰ تستی با تایم‌گیری استاندارد",
                "استفاده از دفترچه اشتباهات و بازبینی هفتگی تست‌های نزده"
            ],
            "confidential_dossier": dossier,
            "last_refreshed": datetime.utcnow().isoformat(),
        }

    def grade_essay(self, text: str, keywords: list) -> dict:
        payload = {"text": text, "keywords": keywords}
        raw = self._call_llm(
            "essay_grade: Grade the student essay on a 0 to 20 scale. Return JSON only: "
            '{"score": number, "feedback": string}',
            json.dumps(payload, ensure_ascii=False),
            json_mode=True,
        )
        return self._safe_json(raw, self._mock_essay_grade(payload))

    def _mock_essay_grade(self, payload: dict) -> dict:
        text = payload.get("text", "")
        keywords = [k for k in payload.get("keywords", []) if k]
        hits = sum(1 for k in keywords if k and k in text)
        base = 10.0
        score = min(20.0, base + hits * 2.0)
        if len(text) < 20:
            score = min(score, 8.0)
        feedback = "پاسخ ناقص است." if score < 12 else "توضیح کامل با پوشش کلیدواژه‌های اصلی سوال."
        return {"score": round(score, 1), "feedback": feedback}

    def analyze_report_card(self, text_or_filename: str, source: str = "kheilisabz") -> dict:
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
            f"=== پرونده تحلیلی کارنامه آزمون {source_title} ===\n"
            f"تاریخ آزمون: {today_label()} | تراز کل: {overall_traz} | معدل: {overall_score}/20\n\n"
            f"۱. وضعیت دروس:\n"
            f"- دروس قوی: زبان انگلیسی (۸۴٪، تراز ۶۸۵۰)، ادبیات (۷۸٪) و زیست‌شناسی (۷۲.۵٪).\n"
            f"- نقاط ضعف نیازمند مداخله فوری: ریاضی (۳۸.۵٪) و فیزیک (۴۶٪).\n\n"
            f"۲. توصیه مشاوره‌ای:\n"
            f"افزایش تعداد تست روزانه ریاضی و فیزیک به حداقل ۴۰ تست همراه با ثبت کارنامه اشتباهات."
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

    def _mock_videos(self, payload: dict) -> list:
        subjects = payload.get("subjects") or ["زیست‌شناسی", "شیمی"]
        out = []
        out.append({
            "subject": "هوش مصنوعی",
            "title": "ویدیوهای اختصاصی بر اساس نقاط ضعف و آزمون‌های شما پیشنهاد می‌شوند.",
            "url": "#/plan",
            "reason": "هوش مصنوعی بهترین آموزش‌های آپارات و یوتیوب را انتخاب می‌کند.",
            "source": "ai",
            "views": 0,
            "likes": 0,
        })
        for s in subjects[:2]:
            out.append({
                "subject": s,
                "title": f"آموزش و حل تست مبحثی {s}",
                "url": f"https://www.aparat.com/result/{quote(s)}",
                "reason": f"مجموعه ویدیویی آموزشی برای تقویت مباحث {s}.",
                "source": "aparat",
                "views": 1500,
                "likes": 85,
            })
        return out

    def chat(self, messages: list, student_context: dict) -> str:
        """Interactive educational AI chat with online LLM and connection status reporting."""
        lang = (student_context or {}).get("lang", "fa")
        if lang == "en":
            system = (
                "You are Synapse AI, an expert academic mentor and educational assistant. "
                "Provide helpful, friendly, encouraging, and precise advice. Student details: "
                + json.dumps(student_context, ensure_ascii=False)
            )
        else:
            system = (
                "تو هوش مصنوعی سیناپس (Synapse) و مشاور تحصیلی هوشمند هستی که به دانش‌آموز یا مشاور کمک می‌کنی. "
                "پاسخ‌هایت باید گرم، دلگرم‌کننده، علمی، کاربردی و به زبان فارسی روان باشد. مشخصات دانش‌آموز: "
                + json.dumps(student_context, ensure_ascii=False)
            )

        # Attempt online LLM call if not explicit mock
        if not USE_MOCK and AI_PROVIDER_KEY:
            try:
                llm_msgs = [{"role": "system", "content": system}]
                for m in messages:
                    if isinstance(m, dict) and m.get("content"):
                        llm_msgs.append({"role": m.get("role", "user"), "content": str(m.get("content"))})

                payload = {
                    "model": AI_MODEL,
                    "messages": llm_msgs,
                    "temperature": 0.4,
                    "max_tokens": 2048,
                }
                req = urllib.request.Request(
                    f"{AI_API_BASE_URL}/chat/completions",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {AI_PROVIDER_KEY}",
                    },
                )
                with urllib.request.urlopen(req, timeout=AI_TIMEOUT) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                    msg = body["choices"][0]["message"]
                    content = msg.get("content") or msg.get("reasoning_content")
                    if content and str(content).strip():
                        return str(content).strip()
            except Exception as e:
                print(f"[ai] Chat provider call failed ({e}). Returning connection status notice.")
                if lang == "en":
                    return "⚠️ Unable to connect to the AI service or the request timed out. Please check your network connection, API key, or server settings."
                return "⚠️ متأسفانه ارتباط با سرور هوش مصنوعی برقرار نشد یا زمان پاسخگویی به پایان رسید. لطفاً وضعیت اتصال اینترنت، کلید API یا تنظیمات سرور را بررسی کنید."

        if USE_MOCK:
            return self._mock_chat(messages, student_context)

        if lang == "en":
            return "⚠️ AI service is currently unavailable. Please verify API configuration in your environment."
        return "⚠️ سرویس هوش مصنوعی در دسترس نیست. لطفاً تنظیمات کلید و سرور API را در فایل تنظیمات بررسی کنید."

    def _mock_chat(self, messages: list, student_context: dict) -> str:
        """Generates natural, highly empathetic and actionable educational responses for students/mentors."""
        lang = (student_context or {}).get("lang", "fa")
        name = (student_context or {}).get("name") or "دانش‌آموز عزیز"
        goal = (student_context or {}).get("goal") or "موفقیت تحصیلی و قبولی در کنکور"
        field = (student_context or {}).get("field") or "تجربی"

        last_text = ""
        if messages:
            last = messages[-1]
            if isinstance(last, dict):
                last_text = str(last.get("content", ""))
            else:
                last_text = str(last)
        last_clean = last_text.strip().lower()

        is_en = (lang == "en") or any(word in last_clean for word in ["hello", "hi", "how are you", "help", "study", "schedule"])

        if is_en:
            if any(w in last_clean for w in ["hi", "hello", "hey"]):
                return f"Hello {name}! 🌟 I'm your dedicated AI academic advisor. How can I assist with your study plan, exam preparation, or subject reviews today?"
            if any(w in last_clean for w in ["biology", "bio"]):
                return f"For Biology, focus on line-by-line textbook review, conceptual diagrams, and solving 40-50 multiple-choice questions daily with comprehensive option analysis."
            if any(w in last_clean for w in ["math", "maths"]):
                return f"For Mathematics, avoid passive reading. Always solve problems by hand with paper and pencil, categorize questions by difficulty, and log your mistakes in an error notebook."
            if any(w in last_clean for w in ["chem", "chemistry"]):
                return f"For Chemistry, divide your sessions between descriptive textbook concepts and daily 15-minute stoichiometry/numerical speed drills."
            if any(w in last_clean for w in ["physics"]):
                return f"For Physics, understand physical concepts and free-body diagrams before memorizing formulas. Practice time-boxed problem solving regularly."
            if any(w in last_clean for w in ["stress", "tired", "motivation", "burnout"]):
                return f"Take a deep breath, {name}. Studying is a marathon, not a sprint. Take a 15-minute screen-free break, break tasks into 45-minute blocks, and remember that consistent small steps lead to big wins."
            if any(w in last_clean for w in ["plan", "schedule", "time"]):
                return f"For effective scheduling, divide your day into 75-90 minute deep-work blocks with 15-minute intervals. Check your calendar in the platform to mark completed tasks."
            return f"Great question, {name}! To reach your goal of {goal}, consistent daily practice, active error analysis, and balanced study blocks are key. Let me know which specific subject or topic you'd like to dive into!"

        # Persian conversational reasoning
        # 1. Greetings & check-ins
        if any(w in last_clean for w in ["سلام", "درود", "صبح بخیر", "عصر بخیر", "شب بخیر", "چطوری", "خوبی", "سلام چطوری", "سلام خوبی"]):
            return (
                f"سلام {name} عزیز! 🌟 من مشاور و دستیار هوشمند شما در پلتفرم هستم.\n"
                f"امروز چطور می‌تونم در مسیر رسیدن به هدفت ({goal}) بهت کمک کنم؟ "
                "می‌تونی درباره روش مطالعه درس‌ها، تنظیم تایم برنامه‌ریزی، تحلیل آزمون یا رفع اشکال با من صحبت کنی."
            )

        # 2. Biology
        if any(w in last_clean for w in ["زیست", "زیست‌شناسی", "ژنتیک", "گیاهی", "فیزیولوژی"]):
            return (
                f"برای تسلط کامل روی زیست‌شناسی در رشته {field}، این چرخه ۳ مرحله‌ای رو اجرا کن:\n"
                "۱. **خط به خط کتاب درسی:** متن، شکل‌ها، زیرنویس‌ها و جدول‌های کتاب درسی منبع اصلی هستند. حتماً نکات مهم رو حاشیه‌نویسی کن.\n"
                "۲. **تست‌زنی آموزشی و تحلیلی:** در هر پارت حداقل ۳۰ تا ۵۰ تست کار کن و مهم‌تر از پاسخ درست، حتماً علت غلط بودن سایر گزینه‌ها رو بررسی کن.\n"
                "۳. **ترکیب مباحث:** فصول مرتبط مثل ژنتیک، قلب و گوارش رو به صورت ترکیبی مرور کن و دفترچه نکات طلایی داشته باش."
            )

        # 3. Mathematics
        if any(w in last_clean for w in ["ریاضی", "ریاضیات", "حسابان", "هندسه", "آمار", "احتمال", "مشتق", "مثلثات"]):
            return (
                "برای درس ریاضی، راز موفقیت **دست به قلم شدن مداوم** است! ✍️\n"
                "• هرگز فرمول‌ها رو چشمی نخون؛ ابتدا مثال‌ها و تمرینات کتاب رو خودت روی برگه حل کن.\n"
                "• تست‌ها رو تیپ‌بندی کن و از سطح آموزشی شروع کن و به سمت تست‌های زمان‌دار پیش برو.\n"
                "• حتماً یک **دفترچه یادداشت اشتباهات** داشته باش تا تیپ سوالاتی که گیر داشتی رو آخر هفته دوباره مرور کنی."
            )

        # 4. Chemistry
        if any(w in last_clean for w in ["شیمی", "استوکیومتری", "اسید", "باز", "سینتیک", "شیمی آلی"]):
            return (
                "درس شیمی دو وجه متمایز داره که برای هر کدوم استراتژی جداگانه نیازه:\n"
                "۱. **مفاهیم، حفظیات و شکل‌ها:** متن کتاب، واکنش‌های موازنه‌شده، رنگ ترکیبات و کاربردها رو با خلاصه‌نویسی نموداری تثبیت کن.\n"
                "۲. **مسائل محاسباتی (استوکیومتری و غلظت):** روزانه یک روتین ۱۰ الی ۱۵ دقیقه‌ای برای تقویت سرعت ساده‌سازی و کسرهای تبدیل قرار بده تا در آزمون‌ها وقت کم نیاری."
            )

        # 5. Physics
        if any(w in last_clean for w in ["فیزیک", "حرکت‌شناسی", "دینامیک", "نوسان", "موج", "الکتریسیته", "مغناطیس"]):
            return (
                "در فیزیک، پیش از به‌خاطرسپردن هر فرمول، مفهوم پدیده را متوجه شو:\n"
                "• کشیدن دیاگرام نیروها (رسم شکل مسئله) نصف راه حل هر تست فیزیک است.\n"
                "• یکاهای SI و تبدیل واحدها را همیشه در ابتدای صورت سوال بررسی کن.\n"
                "• بعد از یادگیری پایه‌ای، تست‌های تیپ‌های مختلف را با زمان‌بندی استاندارد تمرین کن."
            )

        # 6. Persian Literature
        if any(w in last_clean for w in ["ادبیات", "فارسی", "قرابت", "آرایه", "دستور زبان", "لغت و املا"]):
            return (
                "برای ادبیات فارسی، مطالعه مبحثی و روتین شبانه بهترین نتیجه را می‌دهد:\n"
                "• **قرابت معنایی:** روزانه ۵ الی ۱۰ تست برای درک سریع مفهوم و آهنگ ابیات.\n"
                "• **آرایه‌ها:** تمرین تست‌های چندآرایه‌ای با شیوه رد گزینه.\n"
                "• **دستور و لغت:** یادگیری فرمول‌های دستوری (نقش‌ها، حذف، جهش ضمیر) و مرور واژگان ستاره‌دار انتهای کتاب."
            )

        # 7. English Language
        if any(w in last_clean for w in ["زبان", "انگلیسی", "گرامر", "ریدینگ", "کلوز تست", "وکب"]):
            return (
                "در زبان انگلیسی:\n"
                "• لغات را درون جمله و متن یاد بگیر تا کاربرد حروف اضافه و معانی ثانویه در ذهنت بنشیند.\n"
                "• تکنیک‌های Skimming (خواندن سریع برای درک ایده کلی) و Scanning (یافتن اطلاعات خاص) را روی متن‌های Reading تمرین کن.\n"
                "• گرامر را با خلاصه کردن نکات کلیدی و حل تست‌های ترکیبی تثبیت کن."
            )

        # 8. Arabic
        if any(w in last_clean for w in ["عربی", "قواعد عربی", "ترجمه و تعریب", "تحلیل صرفی"]):
            return (
                "برای درس عربی:\n"
                "• اولویت اول تسلط بر فنون ترجمه بر مبنای نوع افعال، ضمایر، معرفه/نکره و جمع‌های مکسر است.\n"
                "• در بخش قواعد، الگوهای ثلاثی مجرد و مزید، اعراب و نقش‌ها را جدولی خلاصه کن.\n"
                "• درک مطلب و تحلیل صرفی را با حل تست‌های ادوار گذشته به تسلط برسان."
            )

        # 9. Religious Studies
        if any(w in last_clean for w in ["دینی", "دین و زندگی", "پیام آیات", "احادیث"]):
            return (
                "برای دین و زندگی:\n"
                "• خط به خط متن کتاب و ارتباط پیام آیات با تیترهای درس را مشخص کن.\n"
                "• علت و معلول‌ها و زنجیره تقدم و تاخر مفاهیم را حاشیه‌نویسی کن."
            )

        # 10. Motivation, Stress, Fatigue, Low Morale
        if any(w in last_clean for w in ["خسته", "خسته‌ام", "انگیزه", "استرس", "ناامید", "افت تراز", "ترازم", "نمی‌تونم", "کم آوردم", "تمرکز ندارم", "بی‌انگیزه", "افسرده"]):
            return (
                f"کاملاً حست رو درک می‌کنم {name} عزیز. مسیر موفقیت در کنکور یک ماراتن است، نه مسابقه سرعت! "
                "خستگی و نوسان انرژی برای همه داوطلبان پیش می‌آید. 🌱\n\n"
                "چند راهکار کاربردی برای ریکاوری سریع:\n"
                "۱. به جای فکر کردن به کل حجم باقی‌مانده، فقط روی **پارت مطالعاتی بعدی (مثلاً ۴۵ دقیقه)** تمرکز کن.\n"
                "۲. یک استراحت باکیفیت بدون گوشی (پیاده‌روی کوتاه در هوای آزاد، نوشیدن آب یا ۱۵ دقیقه خواب کوتاه) داشته باش.\n"
                f"۳. به یاد بیار که چرا شروع کردی و هدفت ({goal}) چقدر برات ارزشمنده. تداوم روزانه حتی با ساعت مطالعه متوسط، معجزه می‌کنه."
            )

        # 11. Study Planning & Hours
        if any(w in last_clean for w in ["برنامه", "برنامه‌ریزی", "ساعت مطالعه", "چند ساعت", "تایم", "کمبود وقت", "وقت کم"]):
            return (
                "برای بهینه‌سازی برنامه و ساعات مطالعه:\n"
                "• روزت را به بلاک‌های ۷۵ الی ۹۰ دقیقه‌ای به همراه ۱۵ دقیقه استراحت تفکیک کن.\n"
                "• دروس محاسباتی و سنگین‌تر را در پارت‌های اول صبح که تمرکز ذهنی بالاست قرار بده.\n"
                "• از بخش تقویم پنل می‌تونی تسک‌های روزانه هفتت رو مشاهده کنی و پیشرفتت رو تیک بزنی."
            )

        # 12. Exam & Test Strategy
        if any(w in last_clean for w in ["تست", "تست‌زنی", "تکنیک", "ضربدر", "منها", "زمان‌های نقصانی", "تحلیل آزمون"]):
            return (
                "۳ تکنیک حیاتی مدیریت جلسه آزمون:\n"
                "۱. **تکنیک ضربدر و منها (+ / -):** سوالات وقت‌گیر را ضربدر و سوالاتی که تسلط نداری را منها بذار و سریع رد شو.\n"
                "۲. **استراتژی زمان‌های نقصانی:** برای هر درس ۵ دقیقه زمان اضافه ذخیره کن تا در دور دوم به سوالات علامت‌دار برگردی.\n"
                "۳. **تحلیل آزمون در همان روز:** سوالات نزده و غلط را علت‌یابی کن و در دفترچه خطاهای خودت ثبت کن."
            )

        # 13. General Contextual Guidance
        return (
            f"نکته بسیار مهمی را مطرح کردی {name} عزیز. در مسیر آمادگی برای {goal} در رشته {field}، "
            "حفظ استمرار مطالعاتی، تحلیل منظم تست‌ها و اولویت‌بندی نقاط ضعف نقشی کلیدی در افزایش تراز و درصدها دارد.\n"
            "می‌توانی درباره هر یک از دروس، شیوه مرور یا رفع اشکال مباحث با من گفت‌وگو کنی تا راهکار دقیق‌تری بهت ارائه دهم."
        )

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
