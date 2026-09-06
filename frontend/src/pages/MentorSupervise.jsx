import { useEffect, useMemo, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Badge, Empty, Modal, ScoreBadge, SubjectScores } from '../ui.jsx'
import PlanSection from '../components/PlanSection.jsx'

const PARTS = [
  { part: 0, from: '08:00', to: '09:30' },
  { part: 1, from: '09:45', to: '11:15' },
  { part: 2, from: '11:30', to: '13:00' },
  { part: 3, from: '16:00', to: '17:30' },
  { part: 4, from: '17:45', to: '19:15' },
  { part: 5, from: '19:30', to: '21:00' },
]
const PRE_UNI = ['پیش‌دانشگاهی / کنکوری', 'Pre-University / Konkur']
const DAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const satOf = (d) => {
  const x = new Date(d)
  const dow = (x.getDay() + 2) % 7   // Sat=0
  x.setDate(x.getDate() - dow)
  return x
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const faDateOnly = (ds) => {
  try { return fa(new Date(ds + 'T00:00:00').toLocaleDateString('fa-IR')) } catch { return ds }
}
const addDays = (ds, n) => {
  const d = new Date(ds + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return iso(d)
}

/**
 * Mentor Supervision View:
 * Comprehensive student monitoring, weekly 6-slot agenda management,
 * analytics chart, study plan builder, and AI diagnostic insights.
 */
export default function MentorSupervise({ studentId, navigate }) {
  const { t } = useLang()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [start, setStart] = useState(() => iso(satOf(new Date())))
  const [week, setWeek] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [cell, setCell] = useState(null)          // {date_str, part, text} to edit
  const [cellVal, setCellVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [editProf, setEditProf] = useState(false)
  const [form, setForm] = useState(null)

  const loadDetail = () => {
    api(`/api/mentor/students/${studentId}`)
      .then(setS)
      .catch((e) => setError(e.message))
  }
  const loadWeek = (st = start) => {
    api(`/api/mentor/students/${studentId}/supervision?start=${st}`)
      .then(setWeek)
      .catch(() => {})
  }
  const loadAnalysis = () => {
    api(`/api/mentor/students/${studentId}/analysis`)
      .then(setAnalysis)
      .catch(() => {})
  }

  useEffect(loadDetail, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => loadWeek(), [])     // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(loadAnalysis, [])         // eslint-disable-line react-hooks/exhaustive-deps

  const weekShift = (delta) => {
    const ns = addDays(start, delta * 7)
    setStart(ns)
    loadWeek(ns)
  }

  const openCell = (dateStr, part, current) => {
    setCell({ date_str: dateStr, part })
    setCellVal(current || '')
  }
  const saveCell = async () => {
    setSaving(true)
    try {
      await api(`/api/mentor/students/${studentId}/supervision/day`, {
        method: 'PUT',
        body: { date_str: cell.date_str, parts: [{ part: cell.part, text: cellVal }] },
      })
      setCell(null)
      loadWeek()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

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

  // ── NOTE: every hook must stay ABOVE the early returns below, otherwise
  // React throws "Rendered more hooks than during the previous render".
  const dayIndex = (ds) => { const d = new Date(ds + 'T00:00:00'); return (d.getDay() + 2) % 7 }
  const weekDays = useMemo(() => {
    if (!week) return []
    const arr = []
    for (let i = 0; i < 7; i++) {
      const ds = addDays(week.start, i)
      arr.push({ ds, label: DAYS_SHORT[dayIndex(ds)] })
    }
    return arr
  }, [week])

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!s) return <div className="empty">…</div>

  const st = s.student
  const isPreUni = PRE_UNI.includes(st.grade_level)
  const comp = s.plan?.completion || {}
  const colorDot = comp.color === 'ok' ? '#22c55e' : comp.color === 'mid' ? '#eab308' : comp.color === 'low' ? '#ef4444' : '#94a3b8'
  const planColor = comp.color === 'ok' ? '#16a34a' : comp.color === 'mid' ? '#a16207' : comp.color === 'low' ? '#b91c1c' : '#6b7280'

  const textFor = (dateStr, part) => week?.days?.find((d) => d.date_str === dateStr)?.parts?.find((p) => p.part === part)


  return (
    <div>
      {/* ── hero / profile ── */}
      <div className="hero">
        <div className="flex wrap between">
          <div className="flex" style={{ gap: 14 }}>
            <div className="avatar" style={{ width: 58, height: 58, fontSize: 24, background: 'rgba(255,255,255,.25)', color: '#fff' }}>
              {st.full_name.slice(0, 1)}
            </div>
            <div>
              <h2>{st.full_name} <span style={{ fontSize: 15 }}>({fa(st.last_year_avg)})</span></h2>
              <p>{st.field_of_study} — {st.grade_level} · {st.email} · {st.phone || '—'}</p>
            </div>
          </div>
          <div className="flex wrap" style={{ gap: 8 }}>
            <span className="badge" style={{ background: colorDot, color: '#fff' }}>
              {t('completionWeek')}: {comp.pct != null ? fa(comp.pct) + '٪' : '—'}
            </span>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate('#/chat?student=' + studentId)}>
              💬 {t('goChatStudent')}
            </button>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={openProfileEdit}>
              ✏️ {t('profileEdit')}
            </button>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate('#/mentor/students')}>
              ← {t('backBtn')}
            </button>
          </div>
        </div>
        <div className="flex wrap mt">
          <span className="badge">🎯 {t('goal_' + st.goal_type) || st.goal_type}</span>
          <span className="badge">{isPreUni ? t('diplomaAvg') : t('lastYearAvg')}: {fa(st.last_year_avg)}</span>
          {st.goal_subjects?.length > 0 && <span className="badge">📚 {st.goal_subjects.join('، ')}</span>}
          <span className="badge" style={{ background: '#fff', color: planColor, fontWeight: 700 }}>
            {t('studentStates')}: {comp.done}✓ / {comp.missed}✕
          </span>
        </div>
      </div>

      {/* ── weekly supervision grid ── */}
      <div className="section-title">🛠️ {t('supervisionTitle')}</div>
      <div className="small muted mb">{t('supervisionSub')}</div>
      <Card className="superv-week-card">
        <div className="between mb">
          <button className="btn ghost sm" onClick={() => weekShift(-1)}>→ {t('prevWeek')}</button>
          <b>{week ? weekOf(week.start) : ''}</b>
          <button className="btn ghost sm" onClick={() => weekShift(1)}>{t('nextWeek')} ←</button>
        </div>

        <div className="superv-grid">
          {/* day headers */}
          <div className="superv-corner"></div>
          {weekDays.map((d) => (
            <div key={d.ds} className="superv-day-head">
              <b>{d.label}</b>
              <div className="small muted">{faDateOnly(d.ds)}</div>
            </div>
          ))}

          {/* time-part rows */}
          {PARTS.map((p) => (
            <FragmentRow
              key={p.part}
              part={p}
              weekDays={weekDays}
              textFor={textFor}
              openCell={openCell}
            />
          ))}
        </div>
      </Card>

      {/* ── performance analysis (beta) ── */}
      <div className="section-title">📈 {t('analysisTitle')} <Badge color="#f59e0b">{t('analysisBeta')}</Badge></div>
      <Card>
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

      {/* ── study plan assignment ── */}
      <div className="section-title">📋 {t('planAssignment')}</div>
      <div className="small muted mb">{t('currentPlanHint')}</div>
      <PlanSection studentId={studentId} plan={s.plan} onChanged={loadDetail} />

      {/* ── AI report & history ── */}
      <div className="section-title">🎓 {t('historyOf')} + {t('aiReportForMentor')}</div>
      <div className="grid cols-2">
        <Card>
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

        <Card>
          <h3>{t('subjectScores')}</h3>
          <SubjectScores items={s.reported_subjects} />
        </Card>
      </div>

      <div className="section-title">📝 {t('examHistory')}</div>
      <Card>
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

      {s.videos?.length > 0 && (
        <>
          <div className="section-title">🎥 {t('bestVideos')}</div>
          <div className="flex wrap">
            {s.videos.map((v, i) => (
              <a key={i} className="chip" href={v.url} target="_blank" rel="noreferrer">🎥 {v.title}</a>
            ))}
          </div>
        </>
      )}

      {/* ── cell editor (floating small window) ── */}
      {cell && (
        <Modal title={`${t('editPartTitle')} — ${faDateOnly(cell.date_str)}`} onClose={() => setCell(null)}>
          <div className="small muted mb">
            {PARTS.find((p) => p.part === cell.part)?.from} – {PARTS.find((p) => p.part === cell.part)?.to}
          </div>
          <textarea
            className="input"
            rows={4}
            autoFocus
            placeholder={t('partTextPlaceholder')}
            value={cellVal}
            onChange={(e) => setCellVal(e.target.value)}
          />
          <div className="flex mt" style={{ justifyContent: 'space-between' }}>
            <button className="btn ghost sm danger" onClick={() => { setCellVal(''); saveCell() }}>{t('clearPart')}</button>
            <button className="btn" disabled={saving} onClick={saveCell}>{t('savePart')}</button>
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

function FragmentRow({ part, weekDays, textFor, openCell }) {
  const { t } = useLang()
  return (
    <>
      <div className="superv-time-col">
        <div className="small muted">{fa(part.from)}</div>
        <div className="small muted">{fa(part.to)}</div>
      </div>
      {weekDays.map((d) => {
        const entry = textFor(d.ds, part.part)
        const status = entry?.status
        return (
          <button
            key={d.ds}
            className={`superv-cell ${entry ? 'has' : ''} ${status === 'done' ? 'is-done' : status === 'missed' ? 'is-missed' : ''}`}
            onClick={() => openCell(d.ds, part.part, entry?.text)}
            title={entry ? entry.text : t('partEmpty')}
          >
            {entry ? entry.text : <span className="muted">+</span>}
          </button>
        )
      })}
    </>
  )
}

function weekOf(start) {
  try {
    return fa(new Date(start + 'T00:00:00').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }))
  } catch { return start }
}
