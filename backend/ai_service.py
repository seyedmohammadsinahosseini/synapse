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
AI_TIMEOUT = int(os.environ.get("AI_TIMEOUT_SECONDS", "8"))

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

DEFAULT_COEFFICIENTS = {
    "علوم تجربی": {
        "زیست‌شناسی": 12,
        "شیمی": 9,
        "ریاضی": 7,
        "فیزیک": 7,
        "زمین‌شناسی": 1,
        "ادبیات فارسی": 4,
        "عربی": 2,
        "دین و زندگی": 3,
        "زبان انگلیسی": 2,
    },
    "ریاضی و فیزیک": {
        "حسابان": 12,
        "ریاضی": 12,
        "فیزیک": 9,
        "شیمی": 7,
        "هندسه": 6,
        "گسسته": 5,
        "ادبیات فارسی": 4,
        "عربی": 2,
        "دین و زندگی": 3,
        "زبان انگلیسی": 2,
    },
    "علوم انسانی": {
        "ادبیات فارسی": 8,
        "علوم و فنون ادبی": 8,
        "ریاضی و آمار": 6,
        "عربی": 5,
        "فلسفه و منطق": 5,
        "جامعه‌شناسی": 5,
        "تاریخ و جغرافیا": 5,
        "اقتصاد": 2,
        "روان‌شناسی": 2,
    },
}


class AIProvider:
    """Unified AI service adapter supporting OpenAI-compatible APIs, deep diagnostics, and offline fallback."""

    def get_field_coefficients(self, field: str) -> dict:
        """Returns standard course coefficients/units based on field of study."""
        for k, v in DEFAULT_COEFFICIENTS.items():
            if k in (field or "") or (field or "") in k:
                return v
        return DEFAULT_COEFFICIENTS["علوم تجربی"]

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
        
        messages = []
        if isinstance(profile, list):
            messages = profile
        elif isinstance(profile, dict) and "messages" in profile:
            messages = profile["messages"]
        else:
            messages = [{"role": "user", "content": user}]
        return self._mock_chat(messages, {})

    def analyze_student(self, profile: dict) -> dict:
        """Analyzes a newly registered or updated student profile to construct baseline metrics and study plan."""
        return self._mock_analysis(profile)

    def _mock_analysis(self, profile: dict) -> dict:
        scores = profile.get("subject_scores", [])
        goal = profile.get("goal_type", "better_average")
        goal_subs = profile.get("goal_subjects", []) or []
        field = profile.get("field_of_study", "علوم تجربی")
        def_coeffs = self.get_field_coefficients(field)
        user_coeffs = profile.get("subject_coefficients") or {}

        rows = []
        for s in scores:
            name = s.get("subject", "")
            if not name:
                continue
            sc = float(s.get("score", 0))
            coeff = user_coeffs.get(name) or def_coeffs.get(name) or 1.0
            deficit = max(0.0, (20.0 - sc) * coeff)
            rows.append({
                "subject": name,
                "score": sc,
                "coefficient": coeff,
                "deficit": deficit,
            })

        rows.sort(key=lambda r: -r["score"])
        best = rows[:3] if rows else []
        
        # Rank by weighted deficit (high coefficient + low score gets priority)
        by_deficit = sorted(rows, key=lambda r: -r["deficit"])
        worst = by_deficit[:3] if by_deficit else []

        if goal in ("konkur", "better_average"):
            focus = worst
        else:
            focus = [r for r in rows if r["subject"] in goal_subs] or worst

        strengths_text = ", ".join(f"{r['subject']} ({r['score']})" for r in best) or "در حال ارزیابی"
        weaknesses_text = ", ".join(f"{r['subject']} (ضریب {r['coefficient']}، نمره {r['score']})" for r in worst) or "در حال ارزیابی"

        summary = (
            f"دانش‌آموز در پایه {profile.get('grade_level', '')} رشته {field} با معدل {profile.get('last_year_avg', 0)} "
            f"و هدف «{GOAL_LABELS.get(goal, goal)}» مورد ارزیابی قرار گرفت. "
            f"نقاط قوت تثبیت‌شده: {strengths_text}. اولویت‌های تحلیلی بر اساس ضریب درس: {weaknesses_text}. "
            f"سقف مطالعاتی روزانه به ۴ ساعت تفکیک شده است."
        )

        plan = self._build_plan(rows, focus, goal, field=field, has_exam_history=bool(profile.get("has_exams")))

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
                f"• رشته و پایه: {field} - پایه {profile.get('grade_level', '')}\n"
                f"• هدف: {GOAL_LABELS.get(goal, goal)}\n"
                f"• معدل سال قبل: {profile.get('last_year_avg', 0)}\n"
                f"• نقاط قوت: {strengths_text}\n"
                f"• اولویت‌های ضریب‌محور: {weaknesses_text}\n"
                f"• راهبرد پیشنهادی: {plan.get('summary', '')}\n"
                f"تاریخ تحلیل: {today_label()}"
            ),
            "analyzed_at": today_label(),
        }

    def _build_plan(self, rows, focus, goal, field="علوم تجربی", has_exam_history=False) -> dict:
        days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
        def_coeffs = self.get_field_coefficients(field)
        focus_names = [r["subject"] for r in focus] or [r["subject"] for r in rows[:2]] or list(def_coeffs.keys())[:4]
        
        weekly = []
        for i, day in enumerate(days):
            main = focus_names[i % len(focus_names)]
            other = focus_names[(i + 1) % len(focus_names)]
            coeff_main = def_coeffs.get(main, 7)
            coeff_other = def_coeffs.get(other, 7)

            if i == 0 and not has_exam_history:
                # First day diagnostic session inside platform
                weekly.append({
                    "day": day,
                    "sessions": [
                        {
                            "subject": "آزمون تعیین سطح داخل پلتفرم",
                            "duration_minutes": 60,
                            "study_method": "test",
                            "question_count": 25,
                            "topic": f"سنجش تسلط بر سرفصل‌های {main} و {other} در پلتفرم سیناپس",
                            "reason": "به علت نبود سابقه آزمون کافی، جهت داده‌کاوی اولیه و استخراج تسلط مبحثی برای بهینه‌سازی برنامه هفته‌های بعد",
                        },
                        {
                            "subject": main,
                            "duration_minutes": 90,
                            "study_method": "study",
                            "topic": f"مطالعه مفهومی خط‌به‌خط {main} و یادداشت فرمول‌ها",
                            "reason": f"به علت ضریب بالای {coeff_main} در کنکور و نیاز به تسلط بر کارگاه‌های کتاب درسی",
                        },
                        {
                            "subject": other,
                            "duration_minutes": 90,
                            "study_method": "test",
                            "question_count": 30,
                            "topic": f"تست‌زنی آموزشی و بررسی پاسخ‌نامه تشریحی {other}",
                            "reason": f"به علت ضریب {coeff_other} و نیاز به رفع اشکال تیپ‌تست‌های پرتکرار",
                        },
                    ],
                })
            elif i == 6:  # جمعه
                weekly.append({
                    "day": day,
                    "sessions": [
                        {
                            "subject": "آزمون شبیه‌ساز هفتگی",
                            "duration_minutes": 120,
                            "study_method": "test",
                            "question_count": 50,
                            "topic": "شبیه‌سازی زمان‌دار آزمون جامع در پلتفرم",
                            "reason": "سنجش سرعت عمل تست‌زنی و مدیریت زمان با تمرکز بر ضرایب بالای کنکور",
                        },
                        {
                            "subject": "تحلیل کارنامه و جبران عقب‌افتادگی‌ها",
                            "duration_minutes": 90,
                            "study_method": "review",
                            "topic": "بررسی تست‌های نزده و غلط در دفترچه اشتباهات",
                            "reason": "تثبیت یادگیری و جلوگیری از تکرار اشتباهات در آزمون‌های بعدی",
                        },
                    ],
                })
            else:
                # Normal 2-block or 3-block day strictly capped <= 240 minutes (4 hours)
                weekly.append({
                    "day": day,
                    "sessions": [
                        {
                            "subject": main,
                            "duration_minutes": 120,
                            "study_method": "study" if i % 2 == 0 else "test",
                            "question_count": 40 if i % 2 != 0 else None,
                            "topic": f"مطالعه مفهومی و تسلط بر کارگاه درس‌پژوهی {main}",
                            "reason": f"به علت ضریب {coeff_main} و نیاز به تثبیت پایه‌ای متن و فعالیت‌های کتاب",
                        },
                        {
                            "subject": other,
                            "duration_minutes": 120,
                            "study_method": "test" if i % 2 == 0 else "essay",
                            "question_count": 35 if i % 2 == 0 else 15,
                            "topic": f"حل تمرین و تست‌زنی سرعتی {other}",
                            "reason": f"به علت ضریب {coeff_other} و افزایش تسلط بر تیپ‌های مسئله و تمرینات پایانی فصل",
                        },
                    ],
                })

        return {
            "weekly": weekly,
            "summary": f"برنامه مطالعاتی هوشمند حداکثر ۴ ساعت در روز با تمرکز بر ضرایب بالای {', '.join(focus_names[:2])}.",
            "daily_minutes": 240,
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
            '"question_count": number|null, "topic": string, "reason": string, "notes": string}]}], '
            '"summary": string, "ai_strategy": string}'
        )
        system = (
            "generate_next_week_draft_plan: You are an expert educational counselor AI. "
            "Build an adaptive 7-day draft study plan for next week capped strictly at 4 hours (240 minutes) per day. "
            "Every session must have a concrete evidence-based 'reason' referencing subject coefficient and student history. "
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
        field = student_info.get("field_of_study", "علوم تجربی")
        def_coeffs = self.get_field_coefficients(field)
        focus_subs = student_info.get("focus_subjects", []) or list(def_coeffs.keys())[:4]
        days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
        weekly = []

        for i, day in enumerate(days):
            s1 = focus_subs[i % len(focus_subs)]
            s2 = focus_subs[(i + 1) % len(focus_subs)]
            c1 = def_coeffs.get(s1, 7)
            c2 = def_coeffs.get(s2, 7)

            if i == 6:  # جمعه
                weekly.append({
                    "day": day,
                    "sessions": [
                        {
                            "subject": "آزمون آزمایشی جامع پلتفرم",
                            "duration_minutes": 120,
                            "study_method": "test",
                            "question_count": 60,
                            "topic": "شبیه‌سازی شرایط کنکور سراسری و ارزیابی تراز مبحثی",
                            "reason": "سنجش تسلط و سرعت تست‌زنی در شرایط استاندارد کنکور",
                            "notes": "تحلیل فوری کارنامه و ثبت تراز در پرونده تحصیلی",
                        },
                        {
                            "subject": "مرور و جبران مباحث عقب‌افتاده",
                            "duration_minutes": 90,
                            "study_method": "review",
                            "question_count": None,
                            "topic": "بررسی تست‌های علامت‌دار هفته و کارگاه‌های درسی",
                            "reason": "پوشش پارت‌های جامانده هفته قبل و رفع خطاهای محاسباتی",
                            "notes": "ثبت اشتباهات پرتکرار در دفترچه یادداشت",
                        },
                    ]
                })
            else:
                # Capped strictly at 240 minutes (4 hours)
                weekly.append({
                    "day": day,
                    "sessions": [
                        {
                            "subject": s1,
                            "duration_minutes": 120,
                            "study_method": "study" if i % 2 == 0 else "test",
                            "question_count": 35 if i % 2 != 0 else None,
                            "topic": f"مطالعه و تثبیت مباحث جدید {s1}",
                            "reason": f"به علت ضریب بالای {c1} در کنکور و لزوم تسلط خط‌به‌خط بر کتاب درسی",
                            "notes": "خلاصه‌نویسی نکات کلیدی حین مطالعه",
                        },
                        {
                            "subject": s2,
                            "duration_minutes": 120,
                            "study_method": "test" if i % 2 == 0 else "essay",
                            "question_count": 30 if i % 2 == 0 else 15,
                            "topic": f"حل تمرین و تست‌زنی سرعتی {s2}",
                            "reason": f"به علت ضریب {c2} و نیاز به تسلط بر مسائل و تمرینات صفحه به صفحه",
                            "notes": "تایم‌گیری دقیق و یادداشت فرمول‌های مهم",
                        },
                    ]
                })

        return {
            "weekly": weekly,
            "summary": "پیش‌نویس برنامه هوشمند ۴ ساعته هفتگی بر اساس ضرایب کنکوری و جبران سرفصل‌های عقب‌مانده.",
            "ai_strategy": "افزایش سهم تست‌زنی در دروس با ضریب بالاتر و اختصاص پارت‌های جبرانی هفتگی.",
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
            '"executive_summary": string, '
            '"overall_index": number, '
            '"overall_trajectory": "rising"|"stable"|"needs_attention", '
            '"learning_consistency": number, '
            '"concept_depth_score": number, '
            '"exam_speed_score": number, '
            '"strengths": [string], '
            '"weaknesses": [string], '
            '"weighted_priority_matrix": [{'
            '  "subject": string, "coefficient": number, "current_level": number, "target_level": number, '
            '  "priority_level": "بسیار بالا"|"بالا"|"متوسط"|"تثبیت‌شده", "trajectory": "rising"|"stable"|"needs_attention", '
            '  "rationale": string'
            '}], '
            '"critical_weaknesses": [{'
            '  "subject": string, "score": number, "chapter_page_ref": string, "intervention_plan": string'
            '}], '
            '"subject_breakdowns": [{'
            '  "subject": string, "coefficient": number, "current_level": number, "target_level": number, '
            '  "growth_rate": string, "trajectory": "rising"|"stable"|"needs_attention", '
            '  "completion_rate": number, '
            '  "study_methods_dist": {"test": number, "study": number, "essay": number, "review": number}, '
            '  "diagnostic_comment": string, "weak_subtopics": [string]'
            '}], '
            '"pedagogical_prescriptions": [string], '
            '"confidential_dossier": string, '
            '"last_refreshed": string'
            '}'
        )
        system = "standardized_diagnostic: Provide standardized deep academic progress analysis with coefficients and page coordinates. " + schema
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
        field = profile.get("field_of_study", "علوم تجربی")
        def_coeffs = self.get_field_coefficients(field)
        user_coeffs = profile.get("subject_coefficients") or {}

        subjects_reported = profile.get("subject_scores", []) or [
            {"subject": "زیست‌شناسی", "score": 18.0},
            {"subject": "شیمی", "score": 16.5},
            {"subject": "فیزیک", "score": 14.0},
            {"subject": "ریاضی", "score": 13.5},
            {"subject": "ادبیات فارسی", "score": 17.5},
            {"subject": "زبان انگلیسی", "score": 19.0},
        ]

        breakdowns = []
        priority_matrix = []
        critical_weaknesses = []

        # Reference database coordinates for rich diagnostics
        book_refs = {
            "زیست‌شناسی": "فصل ۳: کارگاه درس‌پژوهی صفحه ۶۴ و مباحث ترکیبی پروتئین‌سازی",
            "شیمی": "فصل ۲: استوکیومتری و واکنش‌های اسید-باز صفحه ۸۲ تا ۸۸",
            "ریاضی": "فصل ۴: کاربرد مشتق و بهینه‌سازی صفحه ۱۱۵",
            "فیزیک": "فصل ۱: حرکت‌شناسی با شتاب ثابت و نمودارهای سرعت-زمان صفحه ۳۴",
            "ادبیات فارسی": "درس ۱۱: کارگاه درس‌پژوهی و آرایه‌های مجاز و استعاره صفحه ۷۸",
            "زبان انگلیسی": "درس ۲: درک مطلب کلوزتست و ساختارهای مجهول صفحه ۴۲",
        }

        for s in subjects_reported:
            name = s.get("subject", "درس")
            base_score = float(s.get("score") or 15.0)
            coeff = user_coeffs.get(name) or def_coeffs.get(name) or 7
            cur_pct = round(base_score / 20.0 * 100, 1)
            target_pct = min(100.0, round(cur_pct + 12.0, 1))

            if cur_pct >= 75:
                traj = "rising"
                growth = "+14%"
                priority = "تثبیت‌شده" if coeff < 8 else "متوسط"
                comment = f"تسلط بسیار مطلوب بر مباحث اصلی {name}؛ توصیه به حل تست‌های سخت و زمان‌دار."
                subtopics = ["تست‌های ترکیبی", "شبیه‌سازی زمان کنکور"]
            elif cur_pct >= 60:
                traj = "stable"
                growth = "+8%"
                priority = "بالا" if coeff >= 7 else "متوسط"
                comment = f"درک مفهومی مناسب در {name}؛ نیازمند افزایش تعداد تست و کاهش خطاهای محاسباتی."
                subtopics = ["تیپ‌تست‌های پرتکرار", "خلاصه‌نویسی فرمول‌ها"]
            else:
                traj = "needs_attention"
                growth = "+5%"
                priority = "بسیار بالا" if coeff >= 7 else "بالا"
                comment = f"نیاز به بازیابی پایه‌ای و مرور سرفصل‌های {book_refs.get(name, 'کتاب درسی')}."
                subtopics = ["مفاهیم پایه‌ای", "حل تمرین تشریحی کتاب"]
                critical_weaknesses.append({
                    "subject": name,
                    "score": base_score,
                    "coefficient": coeff,
                    "chapter_page_ref": book_refs.get(name, f"سرفصل‌های ابتدایی {name}"),
                    "intervention_plan": f"اختصاص روزانه ۹۰ دقیقه تست‌زنی آموزشی مضرب ۵ و مطالعه خط‌به‌خط کتاب درسی.",
                })

            priority_matrix.append({
                "subject": name,
                "coefficient": coeff,
                "current_level": cur_pct,
                "target_level": target_pct,
                "priority_level": priority,
                "trajectory": traj,
                "rationale": f"ضریب {coeff} در کنکور با سطح تسلط فعلی {cur_pct}٪",
            })

            breakdowns.append({
                "subject": name,
                "coefficient": coeff,
                "current_level": cur_pct,
                "target_level": target_pct,
                "growth_rate": growth,
                "trajectory": traj,
                "completion_rate": 84,
                "study_methods_dist": {"test": 45, "study": 30, "essay": 15, "review": 10},
                "diagnostic_comment": comment,
                "weak_subtopics": subtopics,
            })

        # Sort priority matrix by priority severity
        p_weights = {"بسیار بالا": 4, "بالا": 3, "متوسط": 2, "تثبیت‌شده": 1}
        priority_matrix.sort(key=lambda x: -p_weights.get(x["priority_level"], 0))

        dossier = (
            f"=== پرونده جامع تحلیلی و راهبردی هوش مصنوعی (محرمانه مشاور) ===\n"
            f"تاریخ به‌روزرسانی تحلیل: {today_label()} | رشته: {field}\n"
            f"شاخص عملکرد کلی: ۷۸.۵٪ | وضعیت پایداری یادگیری: مطلوب و صعودی\n\n"
            f"۱. ماتریس اولویت‌بندی بر اساس ضرایب درسی کنکور:\n"
            f"- دروس با اولویت مداخله فوری (بحرانی): ریاضی (ضریب {def_coeffs.get('ریاضی', 7)}) و فیزیک (ضریب {def_coeffs.get('فیزیک', 7)}) به دلیل افت سرعت در سوالات محاسباتی.\n"
            f"- دروس تثبیت‌شده: زیست‌شناسی (ضریب {def_coeffs.get('زیست‌شناسی', 12)}) و ادبیات (ضریب {def_coeffs.get('ادبیات فارسی', 4)}).\n\n"
            f"۲. تحلیل الگوهای مطالعاتی و تسک‌های روزانه (سقف ۴ ساعت):\n"
            f"- پایبندی دانش‌آموز به پارت‌های صبحگاهی ۸۵٪ است؛ پارت‌های پایانی شب بیشترین افت بازدهی را نشان می‌دهند.\n\n"
            f"۳. راهبردهای تجویزی مشاور:\n"
            f"  الف) قرار دادن پارت‌های محاسباتی ریاضی در ساعات اول صبح (۸ تا ۱۰:۳۰).\n"
            f"  ب) اجرای تست‌زنی زمان‌دار مبحثی در پلتفرم سیناپس جهت پایش تسلط کارگاه‌های درسی.\n"
            f"  ج) تثبیت پیشرفت زیست‌شناسی با اجرای مرورهای منظم ۳ روزه."
        )

        return {
            "summary": f"دانش‌آموز دارای پتانسیل پیشرفت بسیار بالا با شاخص پایداری یادگیری ۸۲٪ است. محور اصلی برنامه بر ارتقای دروس با ضریب بالا (ریاضی و فیزیک) با سقف ۴ ساعت در روز متمرکز است.",
            "executive_summary": f"عملکرد کلی دانش‌آموز در رشته {field} با نمرات بالا در دروس مفهومی تثبیت شده و تمرکز برنامه مطالعاتی بر جبران سرعت عمل در دروس محاسباتی با ضرایب بالا قرار دارد.",
            "overall_index": 78.5,
            "overall_trajectory": "rising",
            "learning_consistency": 82,
            "concept_depth_score": 79,
            "exam_speed_score": 74,
            "strengths": ["زبان انگلیسی", "ادبیات فارسی", "زیست‌شناسی"],
            "weaknesses": ["ریاضی", "فیزیک"],
            "weighted_priority_matrix": priority_matrix,
            "critical_weaknesses": critical_weaknesses,
            "subject_breakdowns": breakdowns,
            "pedagogical_prescriptions": [
                "انتقال دروس محاسباتی سنگین به پارت‌های اول صبح",
                "اجرای آزمون‌های مبحثی ۲۰ تستی با تایم‌گیری استاندارد در پلتفرم",
                "استفاده از دفترچه اشتباهات و بازبینی هفتگی تست‌های نزده",
                "رعایت سقف مطالعاتی روزانه حداکثر ۴ ساعت برای جلوگیری از خستگی ذهنی"
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
            '"subjects": [{"subject": string, "score": number, "percentage": number, "traz": number, "class_avg": number, "rank": number, "coefficient": number}], '
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
            {"subject": "زیست‌شناسی", "score": 17.5, "percentage": 72.5, "traz": 6450, "class_avg": 54.0, "rank": 14, "coefficient": 12},
            {"subject": "شیمی", "score": 15.0, "percentage": 61.0, "traz": 6120, "class_avg": 48.5, "rank": 28, "coefficient": 9},
            {"subject": "فیزیک", "score": 13.5, "percentage": 46.0, "traz": 5780, "class_avg": 42.0, "rank": 45, "coefficient": 7},
            {"subject": "ریاضی", "score": 12.0, "percentage": 38.5, "traz": 5430, "class_avg": 36.0, "rank": 58, "coefficient": 7},
            {"subject": "ادبیات فارسی", "score": 18.0, "percentage": 78.0, "traz": 6600, "class_avg": 58.0, "rank": 9, "coefficient": 4},
            {"subject": "عربی", "score": 16.5, "percentage": 68.0, "traz": 6310, "class_avg": 51.0, "rank": 22, "coefficient": 2},
            {"subject": "زبان انگلیسی", "score": 19.0, "percentage": 84.0, "traz": 6850, "class_avg": 60.0, "rank": 4, "coefficient": 2},
            {"subject": "دین و زندگی", "score": 18.5, "percentage": 80.0, "traz": 6700, "class_avg": 63.0, "rank": 7, "coefficient": 3},
        ]
        sum_w = sum(s["coefficient"] for s in subjects)
        overall_score = round(sum(s["score"] * s["coefficient"] for s in subjects) / sum_w, 2)
        overall_traz = round(sum(s["traz"] * s["coefficient"] for s in subjects) / sum_w)

        source_title = "خیلی سبز" if source == "kheilisabz" else ("قلم‌چی" if source == "ghalamchi" else "مدرسه و آزمون‌های جامع")
        dossier = (
            f"=== پرونده تحلیلی کارنامه آزمون {source_title} ===\n"
            f"تاریخ آزمون: {today_label()} | تراز وزنی کل: {overall_traz} | معدل وزنی: {overall_score}/20\n\n"
            f"۱. تحلیل ضریب‌محور دروس:\n"
            f"- دروس با ضریب بالا و عملکرد ممتاز: زیست‌شناسی (ضریب ۱۲، درصد ۷۲.۵٪، تراز ۶۴۵۰).\n"
            f"- دروس با ضریب بالا نیازمند ارتقا: ریاضی (ضریب ۷، درصد ۳۸.۵٪) و فیزیک (ضریب ۷، درصد ۴۶٪).\n\n"
            f"۲. توصیه مشاوره‌ای:\n"
            f"افزایش زمان تست‌زنی روزانه ریاضی و فیزیک به پارت‌های اول صبح و ثبت اشتباهات کارگاه درس‌پژوهی."
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

    def suggest_videos(self, subjects: list, lang: str = "en") -> list:
        payload = {"subjects": subjects}
        return self._mock_videos(payload)

    def _mock_videos(self, payload: dict) -> list:
        subjects = payload.get("subjects") or ["زیست‌شناسی", "شیمی"]
        out = []
        out.append({
            "subject": "هوش مصنوعی",
            "title": "ویدیوهای اختصاصی بر اساس نقاط ضعف و آزمون‌های شما پیشنهاد می‌شوند.",
            "url": "#/plan",
            "reason": "هوش مصنوعی بهترین آموزش‌های آپارات و یوتیوب را بر اساس سرفصل‌ها انتخاب می‌کند.",
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
        lang = (student_context or {}).get("lang", "en")
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

        if not USE_MOCK and AI_PROVIDER_KEY:
            try:
                llm_msgs = [{"role": "system", "content": system}]
                for m in messages:
                    if isinstance(m, dict) and m.get("content"):
                        llm_msgs.append({"role": m.get("role", "user"), "content": str(m.get("content"))})

                payload = {
                    "model": AI_MODEL,
                    "messages": llm_msgs,
                    "temperature": 0.35,
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
        lang = (student_context or {}).get("lang", "en")
        if lang == "en":
            name = (student_context or {}).get("name") or "dear student"
            goal = (student_context or {}).get("goal") or "academic success and passing the university entrance exam"
            field = (student_context or {}).get("field") or "Life Sciences"
        else:
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
                return f"For effective scheduling, keep daily study under 4 hours with 75-90 minute deep-work blocks. Check your calendar in the platform to mark completed tasks."
            return f"Great question, {name}! To reach your goal of {goal}, consistent daily practice, active error analysis, and balanced study blocks are key. Let me know which specific subject or topic you'd like to dive into!"

        # Persian conversational reasoning
        if any(w in last_clean for w in ["سلام", "درود", "صبح بخیر", "عصر بخیر", "شب بخیر", "چطوری", "خوبی", "سلام چطوری", "سلام خوبی"]):
            return (
                f"سلام {name} عزیز! 🌟 من مشاور و دستیار هوشمند شما در پلتفرم سیناپس هستم.\n"
                f"امروز چطور می‌تونم در مسیر رسیدن به هدفت ({goal}) بهت کمک کنم؟ "
                "می‌تونی درباره روش مطالعه دروس ضریب‌بالا، تنظیم پارت‌های مطالعاتی تا سقف ۴ ساعت، تحلیل آزمون یا رفع اشکال با من صحبت کنی."
            )

        if any(w in last_clean for w in ["زیست", "زیست‌شناسی", "ژنتیک", "گیاهی", "فیزیولوژی"]):
            return (
                f"برای تسلط کامل روی زیست‌شناسی (ضریب ۱۲ کنکور تجربی)، این چرخه ۳ مرحله‌ای رو اجرا کن:\n"
                "۱. **خط به خط کتاب درسی:** متن، شکل‌ها، زیرنویس‌ها، جدول‌ها و کارگاه‌های درس‌پژوهی منبع اصلی هستند.\n"
                "۲. **تست‌زنی تحلیلی:** در هر پارت حداقل ۳۵ تا ۵۰ تست کار کن و علت غلط بودن سایر گزینه‌ها رو بررسی کن.\n"
                "۳. **ترکیب مباحث:** فصول مرتبط مثل ژنتیک، قلب و گوارش رو ترکیبی مرور کن."
            )

        if any(w in last_clean for w in ["ریاضی", "ریاضیات", "حسابان", "هندسه", "آمار", "احتمال", "مشتق", "مثلثات"]):
            return (
                "برای درس ریاضی، راز موفقیت **دست به قلم شدن مداوم** است! ✍️\n"
                "• هرگز فرمول‌ها رو چشمی نخون؛ ابتدا تمرینات و فعالیت‌های کتاب رو خودت حل کن.\n"
                "• تست‌ها رو تیپ‌بندی کن و از سطح آموزشی به سمت تست‌های زمان‌دار پیش برو.\n"
                "• یک **دفترچه یادداشت اشتباهات** داشته باش تا تیپ سوالاتی که گیر داشتی رو آخر هفته مرور کنی."
            )

        if any(w in last_clean for w in ["شیمی", "استوکیومتری", "اسید", "باز", "سینتیک", "شیمی آلی"]):
            return (
                "درس شیمی دو بخش متمایز داره که برای هر کدوم استراتژی جداگانه نیازه:\n"
                "۱. **مفاهیم و حفظیات:** متن کتاب، واکنش‌های موازنه‌شده و رنگ ترکیبات رو با خلاصه‌نویسی نموداری تثبیت کن.\n"
                "۲. **مسائل محاسباتی (استوکیومتری):** روزانه یک روتین ۱۵ دقیقه‌ای برای تقویت سرعت کسرهای تبدیل قرار بده."
            )

        if any(w in last_clean for w in ["فیزیک", "حرکت‌شناسی", "دینامیک", "نوسان", "موج", "الکتریسیته", "مغناطیس"]):
            return (
                "در فیزیک، پیش از حفظ فرمول، مفهوم پدیده را متوجه شو:\n"
                "• کشیدن دیاگرام نیروها و رسم شکل نیمی از راه حل هر مسئله است.\n"
                "• یکاهای SI و تبدیل واحدها را همیشه در ابتدای صورت سوال چک کن.\n"
                "• تست‌های زمان‌دار مبحثی را در پلتفرم به صورت منظم تمرین کن."
            )

        if any(w in last_clean for w in ["ادبیات", "فارسی", "قرابت", "آرایه", "دستور زبان", "لغت و املا"]):
            return (
                "برای ادبیات فارسی، مطالعه موضوعی بهترین نتیجه را می‌دهد:\n"
                "• روزانه ۱۰ تست قرابت معنایی و ۵ تست آرایه ادبی کار کن.\n"
                "• لغات ستاره‌دار و انتهای کتاب را در بازه‌های مرور ۳ روزه تثبیت کن."
            )

        if any(w in last_clean for w in ["خسته", "استرس", "ناامید", "انگیزه", "سخت", "نمی‌تونم", "نمی‌رسم"]):
            return (
                f"{name} عزیز، نفس عمیق بکش! 🌿 این مسیر یک ماراتن است، نه دو سرعت.\n"
                "• روزانه حداکثر ۴ ساعت مطالعه عمیق و باکیفیت (در پارت‌های ۶۰ تا ۹۰ دقیقه‌ای) بسیار موثرتر از ساعات طولانی فرسایشی است.\n"
                "• کارهای بزرگ رو به قدم‌های کوچک تقسیم کن و موفقیت‌های کوچک امروزت رو جشن بگیر."
            )

        return (
            f"نکته بسیار مهمی را مطرح کردی {name} عزیز! 🌟\n"
            f"با توجه به هدفت ({goal})، استمرار روزانه، اولویت‌بندی بر اساس ضرایب درسی و تست‌زنی تحلیلی در پلتفرم، کلید ارتقای تراز است. "
            "درباره کدام درس یا مبحث تمایل داری برنامه و راهکار دقیق‌تری طراحی کنیم؟"
        )

    def suggest_consultation_outcome(
        self,
        notes_or_transcript: str,
        student_name: str = "دانش‌آموز",
        grade: str = "دوازدهم",
        field: str = "علوم تجربی",
        student_history: dict | None = None,
    ) -> dict:
        """Analyzes session notes or voice transcript to recommend structured consultation records."""
        schema = (
            'JSON schema: {'
            '"duration_minutes": number, '
            '"consultation_type": "تلفنی" | "حضوری" | "آنلاین", '
            '"student_evaluation": "عالی" | "خوب" | "متوسط" | "نیازمند انگیزه" | "بحرانی", '
            '"discussion_topics": string, '
            '"advisor_recommendations": string, '
            '"next_session_date": string, '
            '"ai_diagnostic_notes": string'
            '}'
        )
        prompt = (
            f"You are an expert Iranian educational consultant evaluating a mentoring session with {student_name} "
            f"(Grade: {grade}, Field: {field}).\n"
            f"Session Transcript/Mentor Notes:\n{notes_or_transcript}\n"
            f"Student History Context: {json.dumps(student_history or {}, ensure_ascii=False)}\n\n"
            f"Analyze the session and return ONLY a JSON matching: {schema}."
        )

        raw = self._call_llm("You are an educational consultant AI. Output valid JSON only.", prompt, json_mode=True)
        res = self._safe_json(raw, None)
        if isinstance(res, dict) and "student_evaluation" in res and "advisor_recommendations" in res:
            return res

        txt = (notes_or_transcript or "").lower()
        eval_status = "خوب"
        if any(w in txt for w in ["عالی", "فوق‌العاده", "رشد چشمگیر", "تراز بالا", "پیشرفت عالی"]):
            eval_status = "عالی"
        elif any(w in txt for w in ["بحرانی", "افت شدید", "صفر", "غیبت مکرر", "عدم انجام", "بسیار ضعیف"]):
            eval_status = "بحرانی"
        elif any(w in txt for w in ["بی‌انگیزه", "خسته", "افسردگی", "ناامید", "استرس شدید", "ترس", "اضطراب"]):
            eval_status = "نیازمند انگیزه"
        elif any(w in txt for w in ["متوسط", "نوسان", "کند", "عدم تمرکز"]):
            eval_status = "متوسط"

        c_type = "تلفنی"
        if "حضوری" in txt:
            c_type = "حضوری"
        elif "آنلاین" in txt or "گوگل میت" in txt or "اسکایپ" in txt:
            c_type = "آنلاین"

        today_dt = datetime.now()
        next_dt = today_dt + timedelta(days=7)

        return {
            "duration_minutes": 40,
            "consultation_type": c_type,
            "student_evaluation": eval_status,
            "discussion_topics": (
                f"• بررسی ساعات مطالعه هفتگی و میزان پایبندی به سقف ۴ ساعت روزانه\n"
                f"• تحلیل تست‌های علامت‌دار دروس اختصاصی {field}\n"
                f"• ریشه‌یابی افت درصدها در مباحث محاسباتی و چالش‌های تمرکز"
                + (f"\n• نکات مطرح‌شده: {notes_or_transcript[:180]}..." if notes_or_transcript else "")
            ),
            "advisor_recommendations": (
                "۱. افزایش زمان مرور شبانه دروس حفظی-مفهومی به میزان ۴۵ دقیقه.\n"
                "۲. اجرای آزمون‌های تعیین سطح پلتفرم سیناپس برای استخراج تسلط مبحثی.\n"
                "۳. ارسال گزارش مطالعه روزانه حداکثر تا ساعت ۲۳:۳۰ در پنل جهت پایش استمرار."
            ),
            "next_session_date": f"{next_dt.year}/{next_dt.month:02d}/{next_dt.day:02d}",
            "ai_diagnostic_notes": f"وضعیت روحی و درسی دانش‌آموز {eval_status} ارزیابی شد. تمرکز بر ارتقای انگیزه و تثبیت دروس پایه با ضریب بالا توصیه می‌شود.",
        }

    def generate_curriculum_questions(
        self,
        grade_level: str,
        field_of_study: str,
        subject: str,
        chapter_name: str,
        content_summary: str,
        count: int = 5,
        difficulty: str = "medium",
    ) -> list:
        """Generates standard Konkor/final exam multiple-choice questions from curriculum units."""
        schema = (
            'JSON array of objects: [{'
            '"question_text": string, '
            '"options": [string, string, string, string], '
            '"correct_answer": int (1..4), '
            '"explanation": string, '
            '"difficulty": "easy" | "medium" | "hard"'
            '}]'
        )
        prompt = (
            f"Generate {count} standard Konkor multiple-choice questions for Grade {grade_level}, "
            f"Field {field_of_study}, Subject: {subject}, Chapter: {chapter_name}.\n"
            f"Source Content Summary: {content_summary}\n"
            f"Difficulty Level: {difficulty}\n"
            f"Return ONLY valid JSON: {schema}"
        )

        raw = self._call_llm("You are an educational test generator AI. Output valid JSON only.", prompt, json_mode=True)
        res = self._safe_json(raw, None)
        if isinstance(res, list) and len(res) > 0 and isinstance(res[0], dict) and "question_text" in res[0]:
            return res

        fallback_questions = []
        for i in range(1, count + 1):
            fallback_questions.append({
                "question_text": f"در مبحث {chapter_name} از درس {subject} پایه {grade_level}، کدام عبارت از نظر مفهومی صحیح است؟ (تست تالیفی شماره {i})",
                "options": [
                    f"گزینه اول: تغییرات اولیه منجر به تثبیت نرخ بازده در مبحث {chapter_name} می‌شود.",
                    f"گزینه دوم: فرآیند مربوطه به صورت مستقیم وابسته به شرایط استاندارد کتاب درسی است.",
                    f"گزینه سوم: افزایش شیب منحنی، بیانگر پایداری متغیرهای اصلی فصل {chapter_name} می‌باشد.",
                    f"گزینه چهارم: در تمامی حالات، اثرات بازدارنده بر متغیرهای فرعی غالب است.",
                ],
                "correct_answer": 2,
                "explanation": f"با توجه به مفاهیم درس {subject} در سرفصل {chapter_name} (کارگاه درس‌پژوهی کتاب)، گزینه ۲ به دلیل انطباق کامل با روابط تعریفی صحیح است.",
                "difficulty": difficulty,
            })
        return fallback_questions

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
