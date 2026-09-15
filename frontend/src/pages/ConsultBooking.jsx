import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useLang, tDay } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'

export default function ConsultBooking({ navigate }) {
  const { t, lang } = useLang()
  const isEn = lang === 'en'
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { show, view } = useToast()

  const load = () => {
    api('/api/consult/upcoming')
      .then(setData)
      .catch((e) => setError(e.message))

    api('/api/consult/sessions')
      .then((res) => {
        if (res.ok && res.sessions) setSessions(res.sessions)
      })
      .catch(() => {})
  }
  useEffect(load, [])

  const book = async (slot) => {
    const confirmMsg = isEn
      ? `Confirm consultation booking?\nDate: ${slot.date_str} at ${slot.start} (${slot.duration_min} min)`
      : `${t('bookingConfirm')}\n${slot.date_str} — ساعت ${slot.start} (${slot.duration_min} دقیقه)`

    if (!window.confirm(confirmMsg)) return
    setBusy(true)
    try {
      await api('/api/consult/book', { method: 'POST', body: { slot_id: slot.id } })
      show(t('bookedOk'))
      load()
    } catch (e) {
      show(String(e.message || t('bookingConflict')), 'err')
    } finally { setBusy(false) }
  }

  const cancel = async (slot) => {
    setBusy(true)
    try {
      await api(`/api/consult/book/${slot.id}`, { method: 'DELETE' })
      show(t('cancelOk'))
      load()
    } catch (e) { show(String(e.message || ''), 'err') } finally { setBusy(false) }
  }

  const dKey = (ds) => {
    try {
      const d = new Date(ds + 'T00:00:00')
      return isEn
        ? d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
        : fa(d.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    } catch { return ds }
  }

  if (error) return <div className="empty">⚠️ {error}</div>

  const days = data?.free_by_day ? Object.keys(data.free_by_day).sort() : []

  const evalLabel = (ev) => {
    if (!isEn) return ev
    const map = {
      'عالی': 'Excellent',
      'خوب': 'Good',
      'متوسط': 'Moderate',
      'نیازمند انگیزه': 'Needs Motivation',
      'بحرانی': 'Critical',
    }
    return map[ev] || ev
  }

  const consultTypeLabel = (ct) => {
    if (!isEn) return ct
    const map = {
      'تلفنی': 'Phone Call',
      'حضوری': 'In-Person',
      'آنلاین': 'Online Meeting',
    }
    return map[ct] || ct
  }

  return (
    <div>
      <div className="hero">
        <h2>🗓️ {t('consultTitle')}</h2>
        <p>{data ? `${t('consultSub')} (${data.mentor_name})` : t('consultSub')}</p>
      </div>

      {/* my bookings */}
      <div className="section-title">📌 {t('consultMyBookings')}</div>
      <Card>
        {!data && <Empty>…</Empty>}
        {data && data.my_bookings.length === 0 && <Empty>{t('noFreeSlots')}</Empty>}
        {data?.my_bookings.map((s) => (
          <div key={s.id} className="list-item between">
            <div className="flex">
              <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)' }}>
                {s.date_str ? dKey(s.date_str) : s.date_str}
              </span>
              <b>{fa(s.start)}</b>
              <span className="small muted">({fa(s.duration_min || 45)} {t('durationMin')})</span>
            </div>
            <button className="btn ghost sm danger" disabled={busy} onClick={() => cancel(s)}>
              {t('cancelSlot')}
            </button>
          </div>
        ))}
      </Card>

      {/* Consultation Directives & Session History */}
      <div className="section-title" style={{ marginTop: 24 }}>
        🎯 {isEn ? 'Senior Mentor Consultation Records & Directives' : 'پرونده و توصیه‌های جلسات مشاوره با مشاور ارشد'}
      </div>
      <Card>
        {sessions.length === 0 && (
          <Empty>
            {isEn
              ? 'No consultation records logged yet. Once you complete a session with your mentor, their personalized recommendations and directives will appear here.'
              : 'هنوز هیچ پرونده جلسه‌ای ثبت نشده است. پس از پایان جلسه مشاوره، توصیه‌ها و برنامه‌های مشاور در اینجا قرار می‌گیرد.'}
          </Empty>
        )}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sessions.map((s) => (
              <div key={s.id} className="dossier-card">
                <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 14, color: 'var(--ink)' }}>
                      🧑‍🏫 {isEn ? 'Mentor:' : 'مشاور:'} {s.mentor_name}
                    </b>
                    <span className="tag" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11 }}>
                      📞 {isEn ? 'Type:' : 'نوع:'} {consultTypeLabel(s.consultation_type)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="small muted">🗓️ {fa(s.session_date)} ({fa(s.duration_minutes)} {t('durationMin')})</span>
                    <span
                      className="tag"
                      style={{
                        background: s.student_evaluation === 'عالی' ? '#dcfce7' : s.student_evaluation === 'بحرانی' ? '#fee2e2' : '#fef3c7',
                        color: s.student_evaluation === 'عالی' ? '#15803d' : s.student_evaluation === 'بحرانی' ? '#b91c1c' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      {isEn ? 'Evaluation:' : 'ارزیابی عملکرد:'} {evalLabel(s.student_evaluation)}
                    </span>
                  </div>
                </div>

                {s.discussion_topics && (
                  <div className="dossier-topic-box">
                    <b style={{ color: 'var(--primary)' }}>💬 {isEn ? 'Discussion Topics:' : 'مباحث بررسی‌شده:'} </b>
                    <span>{s.discussion_topics}</span>
                  </div>
                )}

                {s.advisor_recommendations && (
                  <div className="dossier-directive-box">
                    <b style={{ color: 'var(--primary)' }}>🎯 {isEn ? 'Mentor Strategic Recommendations & Advice:' : 'توصیه‌ها و برنامه‌های راهبردی مشاور:'} </b>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{s.advisor_recommendations}</div>
                  </div>
                )}

                {s.next_session_date && (
                  <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <span>⏳ {isEn ? 'Next Session Date:' : 'نوبت جلسه بعدی:'}</span>
                    <span style={{ color: 'var(--primary)' }}>{fa(s.next_session_date)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* free slots by day */}
      <div className="section-title" style={{ marginTop: 24 }}>🟢 {t('consultFree')}</div>
      {days.length === 0 && data && <Empty>{t('noFreeSlots')}</Empty>}
      {days.map((ds) => (
        <Card key={ds} className="mb">
          <h4 style={{ margin: '0 0 10px' }}>{dKey(ds)}</h4>
          <div className="flex wrap">
            {data.free_by_day[ds].map((s) => (
              <button
                key={s.id}
                className="btn ghost sm slot-pill"
                disabled={busy}
                onClick={() => book(s)}
              >
                {fa(s.start)} · {fa(s.duration_min || 45)} {t('durationMin')}
              </button>
            ))}
          </div>
        </Card>
      ))}

      <div className="mt">
        <button className="btn ghost" onClick={() => navigate('#/dashboard')}>← {t('backBtn')}</button>
      </div>
      {view}
    </div>
  )
}
