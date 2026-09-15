import { useEffect, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../components/Toast.jsx'
import { useLang } from '../i18n.jsx'
import { Badge, Card, Empty } from '../ui.jsx'

/** All connected students with pending connection approval requests. */
export default function MentorStudents({ navigate }) {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [students, setStudents] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const { show, view } = useToast()

  const load = () => {
    api('/api/mentor/students')
      .then(setStudents)
      .catch((e) => setError(e.message))

    api('/api/mentor/students/pending-requests')
      .then((res) => {
        if (res.ok && res.requests) setPendingRequests(res.requests)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [])

  const handleApprove = async (studentId, studentName) => {
    setActionBusy(true)
    try {
      await api(`/api/mentor/students/${studentId}/approve`, { method: 'POST' })
      show(`دانش‌آموز «${studentName}» با موفقیت تایید و به لیست نظارت اضافه شد!`)
      load()
    } catch (e) {
      show('خطا در تایید دانش‌آموز: ' + e.message, 'err')
    } finally {
      setActionBusy(false)
    }
  }

  const handleReject = async (studentId, studentName) => {
    if (!window.confirm(`آیا از رد درخواست دانش‌آموز «${studentName}» اطمینان دارید؟`)) return
    setActionBusy(true)
    try {
      await api(`/api/mentor/students/${studentId}/reject`, { method: 'POST' })
      show(`درخواست دانش‌آموز «${studentName}» رد شد.`, 'err')
      load()
    } catch (e) {
      show('خطا در رد درخواست: ' + e.message, 'err')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div>
      <div className="hero">
        <div className="flex wrap between">
          <div>
            <h2>{t('navStudents')} ({fa(students?.length || 0)})</h2>
            <p>{t('planLegend')}</p>
          </div>
          <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate('#/mentor')}>
            ← {t('backBtn')}
          </button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}

      {/* ── Pending Connection Requests ── */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏳</span>
            <span>{lang === 'fa' ? `درخواست‌های جدید اتصال دانش‌آموز (${fa(pendingRequests.length)})` : `Pending Student Requests (${fa(pendingRequests.length)})`}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {pendingRequests.map((req) => (
              <Card
                key={req.student_id}
                className="pending-request-card"
              >
                <div className="between mb">
                  <div className="flex" style={{ gap: 10 }}>
                    <div className="avatar" style={{ background: '#f59e0b', color: '#fff' }}>
                      {req.full_name.slice(0, 1)}
                    </div>
                    <div>
                      <b style={{ fontSize: 14 }}>{req.full_name}</b>
                      <div className="small muted">{req.email} · {req.phone || (lang === 'fa' ? 'بدون شماره' : 'No phone')}</div>
                    </div>
                  </div>
                  <span className="tag" style={{ background: '#fef08a', color: '#854d0e', fontWeight: 700, fontSize: 11 }}>
                    {lang === 'fa' ? 'در انتظار تایید' : 'Pending Approval'}
                  </span>
                </div>

                <div className="flex wrap" style={{ gap: 6, marginBottom: 12 }}>
                  <span className="tag">
                    🎓 {t('gradeLabel')}: {req.grade_level}
                  </span>
                  <span className="tag">
                    📖 {t('fieldOfStudy')}: {req.field_of_study}
                  </span>
                  <span className="tag">
                    📊 {t('lastYearAvg')}: {fa(req.last_year_avg)}
                  </span>
                  <span className="tag">
                    🎯 {t('goal')}: {t('goal_' + req.goal_type) || req.goal_type}
                  </span>
                </div>

                <div className="flex between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <button
                    className="btn sm"
                    style={{ background: '#16a34a', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                    disabled={actionBusy}
                    onClick={() => handleApprove(req.student_id, req.full_name)}
                  >
                    ✓ {lang === 'fa' ? 'تایید اتصال دانش‌آموز' : 'Approve Connection'}
                  </button>
                  <button
                    className="btn ghost sm danger"
                    style={{ borderRadius: 8, fontSize: 12 }}
                    disabled={actionBusy}
                    onClick={() => handleReject(req.student_id, req.full_name)}
                  >
                    ✕ {lang === 'fa' ? 'رد درخواست' : 'Reject'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Approved Students ── */}
      <div className="section-title">👥 دانش‌آموزان تحت نظارت فعال</div>
      {!students && <Empty>…</Empty>}
      {students && students.length === 0 && (
        <Empty>{t('noStudentsYet', { code: user.code })}</Empty>
      )}

      {students && students.length > 0 && (
        <div className="grid cols-3 students-grid">
          {students.map((s) => (
            <Card
              key={s.id}
              className="student-card"
              style={
                s.plan_color
                  ? {
                      borderColor:
                        s.plan_color === 'mid' ? '#eab308' : s.plan_color === 'low' ? '#ef4444' : 'transparent',
                      boxShadow:
                        s.plan_color !== 'ok'
                          ? `0 0 0 1px ${s.plan_color === 'mid' ? '#eab308' : '#ef4444'} inset`
                          : undefined,
                    }
                  : undefined
              }
              onClick={() => navigate(`#/mentor/student/${s.id}`)}
            >
              <div className="between">
                <div className="flex">
                  <div className="avatar">{s.full_name.slice(0, 1)}</div>
                  <div>
                    <b>{s.full_name}</b>
                    <div className="small muted">{s.field_of_study} — {s.grade_level}</div>
                  </div>
                </div>
                {s.analysis_ready && <span title="AI">🤖</span>}
              </div>
              <div className="flex wrap mt">
                <Badge color="#6366f1">{t('goal_' + s.goal_type) || s.goal_type}</Badge>
                <Badge color="#a855f7">{t('avgShort')}: {s.exam_avg != null ? fa(s.exam_avg) : '—'}</Badge>
                {s.plan_color && (
                  <span
                    className="plan-dot-badge"
                    style={{
                      background:
                        s.plan_color === 'ok' ? '#22c55e'
                        : s.plan_color === 'mid' ? '#eab308' : '#ef4444',
                    }}
                  >
                    {s.plan_color === 'ok' ? '🟢' : s.plan_color === 'mid' ? '🟡' : '🔴'}{' '}
                    {s.plan_pct != null ? fa(s.plan_pct) + '٪' : ''}
                  </span>
                )}
              </div>
              <div className="small muted mt">{t('exams')}: {fa(s.exam_count)}</div>
              <div className="small muted">{t('joined')}: {faDate(s.joined)}</div>
              <button className="btn sm mt block" onClick={(e) => { e.stopPropagation(); navigate(`#/mentor/student/${s.id}`) }}>
                🛠️ {t('supervisionTitle')}
              </button>
            </Card>
          ))}
        </div>
      )}
      {view}
    </div>
  )
}
