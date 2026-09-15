import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'

export default function ConsultBooking({ navigate }) {
  const { t } = useLang()
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
    if (!window.confirm(`${t('bookingConfirm')}\n${slot.date_str} — ساعت ${slot.start} (${slot.duration_min} دقیقه)`)) return
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
      return fa(d.toLocaleDateString('fa-IR'))
    } catch { return ds }
  }

  if (error) return <div className="empty">⚠️ {error}</div>

  const days = data?.free_by_day ? Object.keys(data.free_by_day).sort() : []

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
              <span className="small muted">({fa(s.duration_min || 45)} دقیقه)</span>
            </div>
            <button className="btn ghost sm danger" disabled={busy} onClick={() => cancel(s)}>
              {t('cancelSlot')}
            </button>
          </div>
        ))}
      </Card>

      {/* Consultation Directives & Session History */}
      <div className="section-title" style={{ marginTop: 24 }}>🎯 پرونده و توصیه‌های جلسات مشاوره با مشاور ارشد</div>
      <Card>
        {sessions.length === 0 && (
          <Empty>هنوز هیچ پرونده جلسه‌ای ثبت نشده است. پس از پایان جلسه مشاوره، توصیه‌ها و برنامه‌های مشاور در اینجا قرار می‌گیرد.</Empty>
        )}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: 16,
                  background: 'var(--card-subtle, #f8fafc)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 14, color: 'var(--ink)' }}>🧑‍🏫 مشاور: {s.mentor_name}</b>
                    <span className="tag" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11 }}>
                      📞 نوع: {s.consultation_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="small muted">🗓️ {fa(s.session_date)} ({fa(s.duration_minutes)} دقیقه)</span>
                    <span
                      className="tag"
                      style={{
                        background: s.student_evaluation === 'عالی' ? '#dcfce7' : s.student_evaluation === 'بحرانی' ? '#fee2e2' : '#fef3c7',
                        color: s.student_evaluation === 'عالی' ? '#15803d' : s.student_evaluation === 'بحرانی' ? '#b91c1c' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      ارزیابی عملکرد: {s.student_evaluation}
                    </span>
                  </div>
                </div>

                {s.discussion_topics && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <b style={{ color: '#334155' }}>💬 مباحث بررسی‌شده: </b>
                    <span style={{ color: '#475569' }}>{s.discussion_topics}</span>
                  </div>
                )}

                {s.advisor_recommendations && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, background: '#eef2ff', padding: 12, borderRadius: 10, border: '1px solid #c7d2fe' }}>
                    <b style={{ color: '#3730a3' }}>🎯 توصیه‌ها و برنامه‌های راهبردی مشاور: </b>
                    <div style={{ color: '#1e1b4b', marginTop: 4, whiteSpace: 'pre-line' }}>{s.advisor_recommendations}</div>
                  </div>
                )}

                {s.next_session_date && (
                  <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <span>⏳ نوبت جلسه بعدی:</span>
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
                {fa(s.start)} · {fa(s.duration_min || 45)} دقیقه
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

