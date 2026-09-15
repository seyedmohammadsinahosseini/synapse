"""Report card management and AI analytical dossier router."""
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..ai_service import ai
from ..database import get_db
from ..models import Grade, ReportCard, StudentProfile, User
from ..security import get_current_user

router = APIRouter(prefix="/api/report-card", tags=["report-card"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ManualSubjectIn(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    score: Optional[float] = Field(default=None, ge=0, le=20)
    percentage: Optional[float] = Field(default=None, ge=0, le=100)
    traz: Optional[int] = Field(default=None, ge=1000, le=12000)
    class_average: Optional[float] = Field(default=None, ge=0, le=100)
    class_avg: Optional[float] = Field(default=None, ge=0, le=100)
    rank: Optional[int] = Field(default=None, ge=1)
    coefficient: Optional[float] = Field(default=None, ge=1, le=25)
    unit: Optional[float] = Field(default=None, ge=1, le=25)


class ReportCardManualIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    provider: Optional[str] = Field(default="خیلی سبز")
    source: Optional[str] = Field(default="kheilisabz")
    exam_date: Optional[str] = Field(default=None)
    total_traz: Optional[int] = Field(default=None)
    overall_rank: Optional[int] = Field(default=None)
    subjects: List[ManualSubjectIn] = []


@router.post("/upload")
async def upload_report_card(
    file: UploadFile = File(None),
    title: str = Form("کارنامه آزمون آزمایشی"),
    provider: str = Form("خیلی سبز"),
    source: str = Form("kheilisabz"),
    exam_date: Optional[str] = Form(None),
    total_traz: Optional[int] = Form(None),
    overall_rank: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    file_path = None
    filename = "report_card_upload"
    if file:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
        fname = f"rc_{uuid.uuid4().hex}.{ext}"
        path = os.path.join(UPLOAD_DIR, fname)
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        file_path = f"/media/{fname}"
        filename = file.filename

    ai_result = ai.analyze_report_card(filename, source=source or provider)

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    field = profile.field_of_study if profile else "علوم تجربی"
    def_coeffs = ai.get_field_coefficients(field)
    saved_coeffs = profile.subject_coefficients if (profile and profile.subject_coefficients) else {}

    raw_subjects = ai_result.get("subjects", [])
    subjects_list = []
    for s in raw_subjects:
        s_name = s.get("subject", "")
        coeff = saved_coeffs.get(s_name) or def_coeffs.get(s_name) or s.get("coefficient") or 1.0
        subjects_list.append({
            "subject": s_name,
            "score": s.get("score") or round((s.get("percentage", 70) / 100) * 20, 1),
            "percentage": s.get("percentage", 70.0),
            "traz": s.get("traz") or 6000,
            "class_average": s.get("class_avg") or s.get("class_average") or 45.0,
            "rank": s.get("rank") or 100,
            "coefficient": coeff,
            "unit": coeff,
        })

    sum_weights = sum(s.get("coefficient", 1.0) for s in subjects_list) or 1.0
    overall_score = round(sum(s["score"] for s in subjects_list) / max(1, len(subjects_list)), 2)
    weighted_score = round(sum(s["score"] * s.get("coefficient", 1.0) for s in subjects_list) / sum_weights, 2)
    calc_traz = total_traz or ai_result.get("overall_traz", 6500)
    weighted_traz = round(sum(s["traz"] * s.get("coefficient", 1.0) for s in subjects_list) / sum_weights)

    parsed_data = {
        "title": title,
        "provider": provider or source,
        "exam_date": exam_date or datetime.now().strftime("%Y-%m-%d"),
        "total_traz": calc_traz,
        "weighted_traz": weighted_traz,
        "weighted_score": weighted_score,
        "overall_rank": overall_rank or 120,
        "subjects": subjects_list,
    }

    ai_insights = {
        "diagnostic_summary": ai_result.get("diagnostic_summary") or ai_result.get("ai_dossier", ""),
        "strengths": ai_result.get("strengths", ["زیست‌شناسی", "ادبیات فارسی"]),
        "weaknesses": ai_result.get("weaknesses", ["فیزیک", "ریاضی"]),
        "focus_subjects": ai_result.get("focus_subjects", ["فیزیک", "شیمی"]),
        "recommendations": ai_result.get("recommendations", [
            "افزایش حجم تست‌زنی سرعتی در فیزیک و مباحث بردار",
            "مرور دوره‌ای مباحث حفظی شیمی",
            "تثبیت نقاط قوت در زیست‌شناسی با حل تست‌های چندموردی کنکور"
        ]),
    }

    card = ReportCard(
        student_id=user.id,
        title=title,
        provider=provider or source,
        source=source or provider,
        exam_date=exam_date or datetime.now().strftime("%Y-%m-%d"),
        total_traz=calc_traz,
        overall_rank=overall_rank or 120,
        file_path=file_path,
        parsed_data=parsed_data,
        ai_insights=ai_insights,
        summary_metrics=subjects_list,
        overall_score=overall_score,
        overall_traz=calc_traz,
        ai_dossier=ai_result.get("ai_dossier", ""),
        status="analyzed",
    )
    db.add(card)
    db.flush()

    if profile:
        profile.ai_dossier = {"analytical_dossier": ai_result.get("ai_dossier", "")}
        current_scores = [
            {"subject": s["subject"], "score": s["score"]}
            for s in subjects_list
        ]
        if current_scores:
            profile.subject_scores = current_scores

        for s in subjects_list:
            sc = s["score"]
            db.add(Grade(
                student_id=user.id,
                subject=s["subject"],
                score=sc,
                source="report_card",
                year_label=title,
            ))

    db.commit()
    db.refresh(card)

    return {
        "id": card.id,
        "title": card.title,
        "provider": card.provider,
        "source": card.source,
        "exam_date": card.exam_date,
        "total_traz": card.total_traz,
        "weighted_traz": weighted_traz,
        "weighted_score": weighted_score,
        "overall_rank": card.overall_rank,
        "file_path": card.file_path,
        "parsed_data": card.parsed_data,
        "ai_insights": card.ai_insights,
        "subjects": card.summary_metrics,
        "status": card.status,
    }


@router.get("/list")
def list_report_cards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_id = user.id
    cards = db.query(ReportCard).filter(ReportCard.student_id == target_id)\
              .order_by(ReportCard.created_at.desc()).all()
    return [{
        "id": c.id,
        "title": c.title,
        "provider": c.provider or c.source,
        "source": c.source,
        "exam_date": c.exam_date,
        "total_traz": c.total_traz or c.overall_traz,
        "weighted_traz": (c.parsed_data or {}).get("weighted_traz") or c.total_traz or c.overall_traz,
        "weighted_score": (c.parsed_data or {}).get("weighted_score") or c.overall_score,
        "overall_rank": c.overall_rank,
        "file_path": c.file_path,
        "parsed_data": c.parsed_data or {"subjects": c.summary_metrics},
        "ai_insights": c.ai_insights or {"diagnostic_summary": c.ai_dossier},
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in cards]


@router.post("/manual")
def submit_manual_report_card(
    data: ReportCardManualIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    field = profile.field_of_study if profile else "علوم تجربی"
    def_coeffs = ai.get_field_coefficients(field)
    user_coeffs = dict(profile.subject_coefficients) if (profile and profile.subject_coefficients) else {}

    subjects_list = []
    for s in data.subjects:
        pct = s.percentage
        if pct is None and s.score is not None:
            pct = round((s.score / 20.0) * 100, 1)
        elif pct is None:
            pct = 60.0

        sc = s.score
        if sc is None and pct is not None:
            sc = round((pct / 100.0) * 20.0, 1)
        elif sc is None:
            sc = 12.0

        coeff = s.coefficient or s.unit or user_coeffs.get(s.subject) or def_coeffs.get(s.subject) or 1.0
        user_coeffs[s.subject] = coeff

        cavg = s.class_average if s.class_average is not None else s.class_avg
        subjects_list.append({
            "subject": s.subject,
            "score": sc,
            "percentage": pct,
            "traz": s.traz or 6000,
            "class_average": cavg or 40.0,
            "rank": s.rank or 100,
            "coefficient": coeff,
            "unit": coeff,
        })

    sum_weights = sum(s.get("coefficient", 1.0) for s in subjects_list) or 1.0
    overall_score = round(sum(s["score"] for s in subjects_list) / max(1, len(subjects_list)), 2)
    weighted_score = round(sum(s["score"] * s.get("coefficient", 1.0) for s in subjects_list) / sum_weights, 2)
    traz_vals = [s["traz"] for s in subjects_list if s.get("traz")]
    overall_traz = data.total_traz or (round(sum(traz_vals) / len(traz_vals)) if traz_vals else 6500)
    weighted_traz = round(sum(s["traz"] * s.get("coefficient", 1.0) for s in subjects_list) / sum_weights)

    ai_result = ai.analyze_report_card(json.dumps(subjects_list, ensure_ascii=False), source=data.provider or data.source)

    parsed_data = {
        "title": data.title,
        "provider": data.provider or data.source,
        "exam_date": data.exam_date or datetime.now().strftime("%Y-%m-%d"),
        "total_traz": overall_traz,
        "weighted_traz": weighted_traz,
        "weighted_score": weighted_score,
        "overall_rank": data.overall_rank or 100,
        "subjects": subjects_list,
    }

    ai_insights = {
        "diagnostic_summary": ai_result.get("diagnostic_summary") or ai_result.get("ai_dossier", ""),
        "strengths": ai_result.get("strengths", ["زیست‌شناسی", "ادبیات فارسی"]),
        "weaknesses": ai_result.get("weaknesses", ["فیزیک", "ریاضی"]),
        "focus_subjects": ai_result.get("focus_subjects", ["فیزیک", "شیمی"]),
        "recommendations": ai_result.get("recommendations", [
            "افزایش ساعات تست‌زنی در دروس محاسباتی با ضریب بالا",
            "مرور و خلاصه نویسی فرمول‌های فیزیک و شیمی",
        ]),
    }

    card = ReportCard(
        student_id=user.id,
        title=data.title,
        provider=data.provider or data.source,
        source=data.source or data.provider,
        exam_date=data.exam_date or datetime.now().strftime("%Y-%m-%d"),
        total_traz=overall_traz,
        overall_rank=data.overall_rank or 100,
        file_path=None,
        parsed_data=parsed_data,
        ai_insights=ai_insights,
        summary_metrics=subjects_list,
        overall_score=overall_score,
        overall_traz=overall_traz,
        ai_dossier=ai_result.get("ai_dossier", ""),
        status="analyzed",
    )
    db.add(card)
    db.flush()

    if profile:
        profile.subject_coefficients = user_coeffs
        profile.ai_dossier = {"analytical_dossier": ai_result.get("ai_dossier", "")}
        profile.subject_scores = [{"subject": s["subject"], "score": s["score"]} for s in subjects_list]
        for s in subjects_list:
            db.add(Grade(
                student_id=user.id,
                subject=s["subject"],
                score=s["score"],
                source="report_card",
                year_label=data.title,
            ))

    db.commit()
    db.refresh(card)

    return {
        "id": card.id,
        "title": card.title,
        "provider": card.provider,
        "source": card.source,
        "exam_date": card.exam_date,
        "total_traz": card.total_traz,
        "weighted_traz": weighted_traz,
        "weighted_score": weighted_score,
        "overall_rank": card.overall_rank,
        "file_path": card.file_path,
        "parsed_data": card.parsed_data,
        "ai_insights": card.ai_insights,
        "subjects": card.summary_metrics,
        "overall_score": card.overall_score,
        "overall_traz": card.overall_traz,
        "status": card.status,
    }


@router.get("/pdf/{card_id}")
@router.get("/export-pdf")
def export_comprehensive_pdf(
    card_id: Optional[int] = None,
    student_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generates an executive PDF performance dossier with tables, charts, and metrics."""
    target_id = student_id if (student_id and user.role in ("mentor", "admin")) else user.id
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Student not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == target_id).first()
    card = db.query(ReportCard).filter(ReportCard.id == card_id).first() if card_id else None
    if not card:
        card = db.query(ReportCard).filter(ReportCard.student_id == target_id).order_by(ReportCard.created_at.desc()).first()

    grades = db.query(Grade).filter(Grade.student_id == target_id).all()

    # Generate ReportLab PDF
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1e293b'),
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        alignment=1,
    )
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#4338ca'),
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
    )

    story = []

    story.append(Paragraph("SYNAPSE ACADEMIC & PERFORMANCE DOSSIER", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d')} | Platform AI Telemetry", subtitle_style))
    story.append(Spacer(1, 16))

    mentor_name = (db.query(User).filter(User.id == profile.mentor_id).first().full_name
                   if profile and profile.mentor_id else "AI Mentor Engine")
    student_data = [
        ["Full Name", target_user.full_name, "Grade Level", profile.grade_level if profile else "N/A"],
        ["Email", target_user.email, "Field of Study", profile.field_of_study if profile else "N/A"],
        ["Target Goal", profile.goal_type if profile else "N/A", "Assigned Mentor", mentor_name],
    ]
    t_student = Table(student_data, colWidths=[100, 160, 100, 160])
    t_student.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(t_student)
    story.append(Spacer(1, 16))

    # Academic Diagnostics Section
    story.append(Paragraph("1. Subject Performance Breakdown", section_style))
    story.append(Spacer(1, 8))

    headers = ["Subject", "Score (/20)", "Performance (%)", "National Traz", "Class Avg", "Status"]
    table_rows = [headers]

    subjs = []
    if card:
        if card.parsed_data and isinstance(card.parsed_data, dict) and card.parsed_data.get("subjects"):
            subjs = card.parsed_data["subjects"]
        elif card.summary_metrics:
            subjs = card.summary_metrics

    if subjs:
        for s in subjs:
            pct = s.get("percentage") or round((s.get("score", 0) / 20) * 100, 1)
            traz = s.get("traz") or "—"
            cavg = s.get("class_average") or s.get("class_avg") or "—"
            status = "Mastered" if pct >= 70 else ("Progressing" if pct >= 50 else "Focus Priority")
            table_rows.append([
                s.get("subject", ""),
                str(s.get("score", "")),
                f"{pct}%",
                str(traz),
                f"{cavg}%" if cavg != "—" else "—",
                status,
            ])
    elif grades:
        for g in grades[:10]:
            pct = round((g.score / 20) * 100, 1)
            table_rows.append([g.subject, str(g.score), f"{pct}%", "—", "—", "Recorded"])
    else:
        table_rows.append(["No graded evaluations recorded yet.", "", "", "", "", ""])

    t_perf = Table(table_rows, colWidths=[120, 70, 85, 75, 75, 95])
    t_perf.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4338ca')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
    ]))
    story.append(t_perf)
    story.append(Spacer(1, 16))

    # Strategic AI Analysis Section
    story.append(Paragraph("2. Strategic AI Insights & Recommendations", section_style))
    story.append(Spacer(1, 8))
    ai_summary = ""
    if card and card.ai_insights and isinstance(card.ai_insights, dict):
        ai_summary = card.ai_insights.get("diagnostic_summary", "")
    if not ai_summary and profile and profile.analysis:
        ai_summary = profile.analysis.get("summary", "")
    if not ai_summary:
        ai_summary = "Complete initial evaluation and modular tests to populate automated learning trajectory."

    story.append(Paragraph(ai_summary, body_style))
    story.append(Spacer(1, 12))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Student_Dossier_{target_id}.pdf"},
    )
