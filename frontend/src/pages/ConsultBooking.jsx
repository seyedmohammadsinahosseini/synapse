import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'
import { useToast } from '../components/Toast.jsx'

/** Student booking of in-person consultation slots (45-min, first come). */
export default function ConsultBooking({ navigate }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { show, view } = useToast()

  const load = () => {
    api('/api/consult/upcoming')
      .then(setData)
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const book = async (slot) => {
    if (!window.confirm(`${t('bookingConfirm')}\n${slot.date_str} — ${slot.start}`)) return
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
              <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{s.date_str ? dKey(s.date_str) : s.date_str}</span>
              <b>{fa(s.start)}</b>
              <span className="small muted">۴۵′</span>
            </div>
            <button className="btn ghost sm danger" disabled={busy} onClick={() => cancel(s)}>
              {t('cancelSlot')}
            </button>
          </div>
        ))}
      </Card>

      {/* free slots by day */}
      <div className="section-title">🟢 {t('consultFree')}</div>
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
                {fa(s.start)} · ۴۵′
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
