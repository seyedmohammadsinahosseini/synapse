import { useEffect, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Badge, Empty, Modal, ScoreBadge, SubjectScores } from '../ui.jsx'
import PlanSection from '../components/PlanSection.jsx'

const PRE_UNI = ['پیش‌دانشگاهی / کنکوری', 'Pre-University / Konkur']

export default function MentorSupervise({ studentId, navigate }) {
  const { t } = useLang()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editProf, setEditProf] = useState(false)
  const [form, setForm] = useState(null)
  const [selectedReportCard, setSelectedReportCard] = useState(null)

  const loadDetail = () => {
    api(`/api/mentor/students/${studentId}`)
      .then(setS)
      .catch((e) => setError(e.message))
  }
  const loadAnalysis = () => {
    api(`/api/mentor/students/${studentId}/analysis`)
      .then(setAnalysis)
      .catch(() => {})
  }

  useEffect(loadDetail, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(loadAnalysis, [])         // eslint-disable-line react-hooks/exhaustive-deps

  const openProfileEdit = () => {
    const p = s.student
    setForm({
      full_name: p.full_name, phone: p.phone || '',
      field_of_study: p.field_of_study, grade_level: p.grade_level,
      last_year_avg: p.last_year_avg ?? '', goal_type: p.goal_type,
    })
    setEditProf(true)
  }
  const saveProfile = async () => {
    setSaving(true)
    try {
      await api(`/api/mentor/students/${studentId}/profile`, { method: 'PATCH', body: form })
      setEditProf(false)
      loadDetail()
      setError('')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!s) return <div className="empty">…</div>

  const st = s.student
  const isPreUni = PRE_UNI.includes(st.grade_level)
  const comp = s.plan?.completion || {}
  const colorDot = comp.color === 'ok' ? '#22c55e' : comp.color === 'mid' ? '#eab308' : comp.color === 'low' ? '#ef4444' : '#94a3b8'
  const planColor = comp.color === 'ok' ? 'var(--ok)' : comp.color === 'mid' ? 'var(--warn)' : comp.color === 'low' ? 'var(--danger)' : 'var(--muted)'
  const reportCards = s.report_cards || []
  const dossier = s.ai_dossier || {}

  return (
    <div>
      {/* ── hero / profile ── */}
      <div className="hero" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 24 }}>
        <div className="flex wrap between">
          <div className="flex" style={{ gap: 14 }}>
            <div className="avatar" style={{ width: 62, height: 62, fontSize: 26, background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 16 }}>
              {st.full_name.slice(0, 1)}
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0' }}>{st.full_name} <span style={{ fontSize: 16 }}>({fa(st.last_year_avg)})</span></h2>
              <p style={{ margin: 0, opacity: 0.9 }}>{st.field_of_study} — {st.grade_level} · {st.email} · {st.phone || '—'}</p>
            </div>
          </div>
          <div className="flex wrap" style={{ gap: 8 }}>
            <span className="badge" style={{ background: colorDot, color: '#fff', borderRadius: 10, padding: '6px 12px' }}>
              {t('completionWeek')}: {comp.pct != null ? fa(comp.pct) + '٪' : '—'}
            </span>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', borderRadius: 10 }} onClick={() => navigate('#/chat?student=' + studentId)}>
              💬 {t('goChatStudent')}
            </button>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', borderRadius: 10 }} onClick={openProfileEdit}>
              ✏️ {t('profileEdit')}
            </button>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', borderRadius: 10 }} onClick={() => navigate('#/mentor/students')}>
              ← {t('backBtn')}
            </button>
          </div>
        </div>
        <div className="flex wrap mt" style={{ marginTop: 16, gap: 8 }}>
          <span className="badge">🎯 {t('goal_' + st.goal_type) || st.goal_type}</span>
          <span className="badge">{isPreUni ? t('diplomaAvg') : t('lastYearAvg')}: {fa(st.last_year_avg)}</span>
          {st.goal_subjects?.length > 0 && <span className="badge">📚 {st.goal_subjects.join('، ')}</span>}
          <span className="badge" style={{ background: 'var(--card)', color: planColor, fontWeight: 700 }}>
            {t('studentStates')}: {comp.done}✓ / {comp.missed}✕
          </span>
          {reportCards.length > 0 && (
            <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)' }}>
              📊 {fa(reportCards.length)} کارنامه آزمون بارگذاری شده
            </span>
          )}
        </div>
      </div>

      {/* ── Report Cards & Diagnostic Dossier ── */}
      {reportCards.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <div className="section-title">📊 کارنامه‌های آزمون‌های آزمایشی دانش‌آموز (خیلی سبز / قلم‌چی / مدرسه)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {reportCards.map((rc) => (
              <Card key={rc.id} style={{ borderRadius: 16, padding: 16, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b>{rc.title}</b>
                  <span className="badge" style={{ fontSize: 11, background: 'var(--tint-fill)', color: 'var(--primary)' }}>
                    {rc.provider}
                  </span>
                </div>
                <div className="small muted" style={{ marginBottom: 8 }}>
                  تاریخ آزمون: {fa(rc.exam_date || 'نامشخص')} {rc.total_traz ? `· تراز کل: ${fa(rc.total_traz)}` : ''} {rc.overall_rank ? `· رتبه: ${fa(rc.overall_rank)}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn ghost sm"
                    style={{ borderRadius: 8, fontSize: 12 }}
                    onClick={() => setSelectedReportCard(rc)}
                  >
                    🔍 مشاهده کارنامه
                  </button>
                  <a
                    href={`/api/report-card/pdf/${rc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn ghost sm"
                    style={{ borderRadius: 8, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  >
                    📄 دانلود PDF پرونده
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Confidential AI Diagnostic Dossier ── */}
      {dossier?.analytical_dossier && (
        <div style={{ marginBottom: 30 }}>
          <div className="section-title">🤖 پرونده تحلیلی هوش مصنوعی (AI Dossier) برای مشاور</div>
          <Card style={{ borderRadius: 16, background: 'var(--tint-hover)', border: '1.5px solid var(--line)' }}>
            <div className="small" style={{ color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {dossier.analytical_dossier}
            </div>
          </Card>
        </div>
      )}

      {/* ── WEEKLY STUDY CALENDAR PLANNER (Central Drag & Drop Planner) ── */}
      <div className="section-title">🗓️ تقویم هفتگی ۷ روزه برنامه درسی دانش‌آموز (Study Calendar Planner)</div>
      <div className="small muted mb" style={{ marginBottom: 14 }}>
        با استفاده از جعبه‌ابزار درگ و دراپ، دروس و متدهای مطالعه چهارگانه را روی تقویم هفتگی دانش‌آموز تنظیم و ارسال کنید.
      </div>
      <PlanSection
        studentId={studentId}
        plan={s.plan}
        capacityAlerts={s.plan?.capacity_alerts || {}}
        onChanged={loadDetail}
      />

      {/* ── performance analysis (beta) ── */}
      <div className="section-title" style={{ marginTop: 30 }}>📈 {t('analysisTitle')} <Badge color="#f59e0b">{t('analysisBeta')}</Badge></div>
      <Card style={{ borderRadius: 18 }}>
        {!analysis && <Empty>…</Empty>}
        {analysis && (
          <>
            <div className="flex wrap mb">
              <span className="plan-dot-badge" style={{ background: '#22c55e' }}>✓ {t('doneCount')}: {fa(analysis.week.done)}</span>
              <span className="plan-dot-badge" style={{ background: '#ef4444' }}>✕ {t('missedCount')}: {fa(analysis.week.missed)}</span>
              <span className="chip">{t('completionWeek')}: {analysis.week.pct != null ? fa(analysis.week.pct) + '٪' : '—'}</span>
            </div>
            <div className="small muted mb">{t('last14days')}</div>
            {analysis.days.every((d) => d.pct == null) ? (
              <Empty>{t('noDataYet')}</Empty>
            ) : (
              <div className="trend-bars">
                {analysis.days.map((d) => (
                  <div key={d.date} className="trend-col" title={`${d.date}: ${d.done}✓ ${d.missed}✕`}>
                    <div className="trend-track">
                      <div
                        className={`trend-fill ${d.pct != null && d.pct < 25 ? 'red' : d.pct != null && d.pct < 50 ? 'yellow' : 'green'}`}
                        style={{ height: `${d.pct != null ? Math.max(4, d.pct) : 2}%` }}
                      />
                    </div>
                    <div className="small muted trend-day">{d.label}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── AI report & history ── */}
      <div className="section-title" style={{ marginTop: 30 }}>🎓 {t('historyOf')} + {t('aiReportForMentor')}</div>
      <div className="grid cols-2">
        <Card style={{ borderRadius: 18 }}>
          <h3>{t('analysisSummary')}</h3>
          <div className="analysis-box">{s.analysis?.summary || '—'}</div>
          <div className="small muted mt">{t('strengths')}</div>
          <div className="strong">
            {s.analysis?.strengths?.length
              ? s.analysis.strengths.map((x) => <Badge key={x} color="#22c55e">✓ {x}</Badge>)
              : '—'}
          </div>
          <div className="small muted mt">{t('weaknesses')}</div>
          <div className="weak">
            {s.analysis?.weaknesses?.length
              ? s.analysis.weaknesses.map((x) => <Badge key={x} color="#ef4444">✕ {x}</Badge>)
              : '—'}
          </div>
          <div className="small muted mt">{t('suggestedSubjects')}</div>
          <div className="flex wrap">
            {s.analysis?.focus_subjects?.map((x) => <Badge key={x} color="#a855f7">{x}</Badge>)}
          </div>
        </Card>

        <Card style={{ borderRadius: 18 }}>
          <h3>{t('subjectScores')}</h3>
          <SubjectScores items={s.reported_subjects} />
        </Card>
      </div>

      <div className="section-title" style={{ marginTop: 30 }}>📝 {t('examHistory')}</div>
      <Card style={{ borderRadius: 18 }}>
        {s.attempts.length === 0 && <Empty>{t('noExamsYet')}</Empty>}
        {s.attempts.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>{t('typeShort')}</th><th>{t('date')}</th><th>{t('score')}</th><th>{t('result')}</th></tr>
            </thead>
            <tbody>
              {s.attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.kind === 'exam' ? t('typeExam') : t('typeTest')}</td>
                  <td className="muted">{faDate(a.started_at)}</td>
                  <td><ScoreBadge score={a.total_score ?? 0} /></td>
                  <td>
                    <button className="btn ghost sm" onClick={() => navigate(`#/exam/${a.id}`)}>{t('viewResult')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Report Card Detail Modal ── */}
      {selectedReportCard && (
        <Modal title={`📊 ${selectedReportCard.title}`} onClose={() => setSelectedReportCard(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--tint-hover)', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}>
              <div><b>صادرکننده:</b> {selectedReportCard.provider}</div>
              <div><b>تاریخ:</b> {fa(selectedReportCard.exam_date || 'نامشخص')}</div>
              {selectedReportCard.total_traz && <div><b>تراز:</b> {fa(selectedReportCard.total_traz)}</div>}
              {selectedReportCard.overall_rank && <div><b>رتبه:</b> {fa(selectedReportCard.overall_rank)}</div>}
            </div>

            {selectedReportCard.parsed_data?.subjects?.length > 0 && (
              <div>
                <b className="small muted">ریز درصدهای آزمون:</b>
                <table className="table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr><th>درس</th><th>درصد (%)</th><th>تراز</th><th>میانگین</th></tr>
                  </thead>
                  <tbody>
                    {selectedReportCard.parsed_data.subjects.map((sub, idx) => (
                      <tr key={idx}>
                        <td><b>{sub.subject}</b></td>
                        <td>{fa(sub.percentage ?? sub.score)}٪</td>
                        <td>{fa(sub.traz || '—')}</td>
                        <td>{fa(sub.class_average || '—')}٪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReportCard.ai_insights?.diagnostic_summary && (
              <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: 12 }}>
                <b style={{ color: 'var(--ok)', display: 'block', marginBottom: 4 }}>💡 تحلیل و جمع‌بندی هوش مصنوعی:</b>
                <div className="small" style={{ color: 'var(--ink)', lineHeight: 1.6 }}>
                  {selectedReportCard.ai_insights.diagnostic_summary}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 18, textAlign: 'end' }}>
            <button className="btn sm" onClick={() => setSelectedReportCard(null)}>بستن</button>
          </div>
        </Modal>
      )}

      {/* ── profile editor modal ── */}
      {editProf && form && (
        <Modal title={t('editStudentInfo')} onClose={() => setEditProf(false)}>
          <label className="field"><span>{t('nameLabel')}</span>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
          <div className="two-col">
            <label className="field"><span>{t('phoneLabel')}</span>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="field"><span>{t('fieldOfStudy')}</span>
              <input className="input" value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} /></label>
          </div>
          <div className="two-col">
            <label className="field"><span>{t('gradeLabel')}</span>
              <input className="input" value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} /></label>
            <label className="field"><span>{t('lastYearAvg')}</span>
              <input className="input" type="number" step="0.1" min="0" max="20" value={form.last_year_avg}
                onChange={(e) => setForm({ ...form, last_year_avg: e.target.value })} /></label>
          </div>
          <label className="field"><span>{t('goal')}</span>
            <select className="input" value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value })}>
              <option value="better_average">{t('goal_better_average')}</option>
              <option value="specific_subjects">{t('goal_specific_subjects')}</option>
              <option value="konkur">{t('goal_konkur')}</option>
            </select></label>
          <div className="flex mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" disabled={saving} onClick={saveProfile}>{t('profileSave')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
