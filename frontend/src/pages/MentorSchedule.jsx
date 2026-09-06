import { useEffect, useMemo, useState } from 'react'
import { api, fa } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'
import { useToast } from '../components/Toast.jsx'

const DAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const MINUTES_OPT = []          // 06:00 … 22:00 in 30-min steps
for (let m = 6 * 60; m <= 22 * 60; m += 30) MINUTES_OPT.push(m)

const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fmt = (m) => fa(toHM(m))

/** Mentor consultation schedule: monthly calendar, opens windows per day,
 * each window (half-hour boundaries, total multiple of 45) becomes 45-min
 * slots that students book first-come-first-served. */
export default function MentorSchedule({ navigate }) {
  const { t } = useLang()
  const today = new Date()
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 })
  const [cal, setCal] = useState(null)         // {days: {date:[slots]}}
  const [selDate, setSelDate] = useState(null)
  const [error, setError] = useState('')
  const [startM, setStartM] = useState(11 * 60 + 30)
  const [endM, setEndM] = useState(13 * 60)
  const [saving, setSaving] = useState(false)
  const { show, view } = useToast()

  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const load = (y = ym.y, m = ym.m) => {
    api(`/api/mentor/consult/calendar?year=${y}&month=${m}`)
      .then(setCal)
      .catch((e) => setError(e.message))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [])

  const mShift = (delta) => {
    let { y, m } = ym
    m += delta
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setYm({ y, m }); setSelDate(null); load(y, m)
  }

  const cells = useMemo(() => {
    const y = ym.y, m = ym.m
    const firstDow = new Date(y, m - 1, 1).getDay()          // 0=Sun..6=Sat
    // offset to Saturday start (iran weekday of day 1)
    const iranFirst = (firstDow + 2) % 7
    const startDate = new Date(y, m - 1, 1 - iranFirst)
    const out = []
    const dim = new Date(y, m, 0).getDate()
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      out.push({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(),
                 inMonth: d.getMonth() + 1 === m, ds: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) })
    }
    return out
  }, [ym])

  const slotsFor = (ds) => (cal?.days?.[ds] || []).sort((a, b) => a.start_min - b.start_min)
  const todayStr = iso(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const lengthMin = endM - startM
  const lengthOk = lengthMin >= 45 && lengthMin % 45 === 0

  const addWindow = async () => {
    if (!lengthOk) { show(t('windowError'), 'err'); return }
    setSaving(true)
    try {
      await api('/api/mentor/consult/window', {
        method: 'POST',
        body: { date_str: selDate, start: toHM(startM), end: toHM(endM) },
      })
      show(t('windowAddedToast'))
      load()
    } catch (e) {
      show(String(e.message || t('windowConflict')), 'err')
    } finally { setSaving(false) }
  }

  const completeHeld = async (slot) => {
    if (!window.confirm(t('holdConfirm'))) return
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${slot.id}/complete`, { method: 'POST' })
      show(t('heldToast'))
      load()
    } catch (e) { show(String(e.message || ''), 'err') }
    finally { setSaving(false) }
  }

  const removeSlot = async (id) => {
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${id}`, { method: 'DELETE' })
      show(t('slotRemovedToast'))
      load()
    } catch (e) { show(String(e.message || ''), 'err') }
    finally { setSaving(false) }
  }

  const monthName = fa(new Date(ym.y, ym.m - 1, 1).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }))

  return (
    <div>
      <div className="hero">
        <h2>🗓️ {t('scheduleTitle')}</h2>
        <p>{t('scheduleSub')}</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr)', gap: 18 }}>
        {/* calendar */}
        <Card>
          <div className="between mb">
            <button className="btn ghost sm" onClick={() => mShift(-1)}>→ {t('prevWeek')}</button>
            <b>{monthName}</b>
            <button className="btn ghost sm" onClick={() => mShift(1)}>{t('nextWeek')} ←</button>
          </div>
          <div className="cal-grid">
            {DAY_LABELS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((c, i) => {
              const slots = slotsFor(c.ds)
              const free = slots.filter((s) => !s.student_id).length
              const booked = slots.length - free
              const past = c.ds < todayStr
              return (
                <div
                  key={i}
                  className={`cal-cell ${c.inMonth ? '' : 'dim'} ${c.ds === todayStr ? 'today' : ''} ${selDate === c.ds ? 'sel' : ''} ${past ? 'past' : ''}`}
                  onClick={() => { if (!past) setSelDate(c.ds) }}
                >
                  <div className="cal-daynum">{fa(c.d)}</div>
                  {slots.length > 0 && (
                    <div className="cal-meta">
                      {free > 0 && <span className="tag tag-free">🟢 {fa(free)}</span>}
                      {booked > 0 && <span className="tag tag-booked">🔴 {fa(booked)}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* selected day: windows + slot list */}
        <div>
          <Card>
            <h3 className="mb">{selDate ? (t('windowsOn') + ' ' + faDateOnly(selDate)) : t('selectDayHint')}</h3>
            {!selDate && <Empty>{t('selectDayHint')}</Empty>}

            {selDate && (
              <>
                {/* add a window */}
                <div className="small muted mb">{t('addWindow')}</div>
                <div className="two-col mb" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <label className="field">
                    <span>{t('startTime')}</span>
                    <select className="input" value={startM} onChange={(e) => setStartM(Number(e.target.value))}>
                      {MINUTES_OPT.slice(0, -1).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('endTime')}</span>
                    <select className="input" value={endM} onChange={(e) => setEndM(Number(e.target.value))}>
                      {MINUTES_OPT.filter((m) => m > startM).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="small mb" style={{ color: lengthOk ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  {t('windowLength')}: {lengthMin > 0 ? fmt(lengthMin) : '—'}
                </div>
                <button className="btn block" disabled={saving || !lengthOk} onClick={addWindow}>
                  + {t('addWindow')}
                </button>
              </>
            )}
          </Card>

          {selDate && (
            <Card className="mt">
              <h4 className="mb">{t('slotFree')} / {t('slotBooked')}</h4>
              {slotsFor(selDate).length === 0 && <Empty>{t('noSlotsDay')}</Empty>}
              {slotsFor(selDate).map((s) => (
                <div key={s.id} className="list-item between">
                  <div className="flex">
                    <span className={`slot-chip ${s.student_id ? 'taken' : 'free'}`}>
                      {fmt(s.start_min)}
                    </span>
                    {s.student_id ? (
                      <span className="small muted">🧑‍🎓 {s.student_name}</span>
                    ) : (
                      <span className="small muted">{t('slotFree')}</span>
                    )}
                  </div>
                  {s.student_id ? (
                    <button className="btn sm slot-done" disabled={saving} onClick={() => completeHeld(s)}>
                      ✅ {t('markHeld')}
                    </button>
                  ) : (
                    <button className="btn ghost sm danger" disabled={saving} onClick={() => removeSlot(s.id)}>✕</button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
      {view}
    </div>
  )
}

function faDateOnly(ds) {
  try {
    return fa(new Date(ds + 'T00:00:00').toLocaleDateString('fa-IR'))
  } catch { return ds }
}
