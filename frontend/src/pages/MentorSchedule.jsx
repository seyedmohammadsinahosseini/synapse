import { useEffect, useMemo, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'
import { useToast } from '../components/Toast.jsx'

const DAY_LABELS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const DAY_LABELS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const MINUTES_OPT = [] // 06:00 … 22:30 in 15-min steps
for (let m = 6 * 60; m <= 22 * 60 + 30; m += 15) MINUTES_OPT.push(m)

const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fmt = (m) => fa(toHM(m))

const DURATION_PRESETS = [30, 45, 60, 90, 120]

export default function MentorSchedule({ navigate }) {
  const { t } = useLang()
  const isEn = getLang() === 'en'
  const today = new Date()
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 })
  const [cal, setCal] = useState(null)
  const [selDate, setSelDate] = useState(null)
  const [error, setError] = useState('')
  const [slotDuration, setSlotDuration] = useState(45)
  const [startM, setStartM] = useState(11 * 60)
  const [endM, setEndM] = useState(12 * 60 + 30)
  const [saving, setSaving] = useState(false)
  const { show, view } = useToast()

  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const load = (y = ym.y, m = ym.m) => {
    api(`/api/mentor/consult/calendar?year=${y}&month=${m}`)
      .then(setCal)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mShift = (delta) => {
    let { y, m } = ym
    m += delta
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setYm({ y, m })
    setSelDate(null)
    load(y, m)
  }

  const cells = useMemo(() => {
    const y = ym.y, m = ym.m
    const firstDow = new Date(y, m - 1, 1).getDay()
    const iranFirst = (firstDow + 2) % 7
    const startDate = new Date(y, m - 1, 1 - iranFirst)
    const out = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      out.push({
        y: d.getFullYear(),
        m: d.getMonth() + 1,
        d: d.getDate(),
        inMonth: d.getMonth() + 1 === m,
        ds: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      })
    }
    return out
  }, [ym])

  const slotsFor = (ds) => (cal?.days?.[ds] || []).sort((a, b) => a.start_min - b.start_min)
  const todayStr = iso(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const lengthMin = endM - startM
  const numSlots = Math.floor(lengthMin / slotDuration)
  const lengthOk = lengthMin >= slotDuration && slotDuration >= 15

  const addWindow = async () => {
    if (!lengthOk || !selDate) {
      show(isEn ? 'Session duration must fit inside the window' : 'مدت بازه زمانی باید حداقل به اندازه یک جلسه باشد', 'err')
      return
    }
    setSaving(true)
    try {
      await api('/api/mentor/consult/window', {
        method: 'POST',
        body: {
          date_str: selDate,
          start: toHM(startM),
          end: toHM(endM),
          duration_min: parseInt(slotDuration) || 45,
        },
      })
      show(t('windowAddedToast'))
      load()
    } catch (e) {
      show(String(e.message || t('windowConflict')), 'err')
    } finally {
      setSaving(false)
    }
  }

  const completeHeld = async (slot) => {
    if (!window.confirm(t('holdConfirm'))) return
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${slot.id}/complete`, { method: 'POST' })
      show(t('heldToast'))
      load()
    } catch (e) {
      show(String(e.message || ''), 'err')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (id) => {
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${id}`, { method: 'DELETE' })
      show(t('slotRemovedToast'))
      load()
    } catch (e) {
      show(String(e.message || ''), 'err')
    } finally {
      setSaving(false)
    }
  }

  const monthName = isEn
    ? new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
    : fa(new Date(ym.y, ym.m - 1, 1).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }))

  const dayLabels = isEn ? DAY_LABELS_EN : DAY_LABELS_FA

  const faDateOnly = (ds) => {
    try {
      return isEn
        ? new Date(ds + 'T00:00:00').toLocaleDateString('en-GB')
        : fa(new Date(ds + 'T00:00:00').toLocaleDateString('fa-IR'))
    } catch { return ds }
  }

  return (
    <div>
      <div className="hero">
        <h2>🗓️ {t('scheduleTitle')}</h2>
        <p>{t('scheduleSub')}</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1.2fr)', gap: 18 }}>
        {/* calendar */}
        <Card>
          <div className="between mb">
            <button className="btn ghost sm" onClick={() => mShift(-1)}>
              {isEn ? `← ${t('prevWeek')}` : `→ ${t('prevWeek')}`}
            </button>
            <b>{monthName}</b>
            <button className="btn ghost sm" onClick={() => mShift(1)}>
              {isEn ? `${t('nextWeek')} →` : `${t('nextWeek')} ←`}
            </button>
          </div>
          <div className="cal-grid">
            {dayLabels.map((d) => <div key={d} className="cal-dow">{d}</div>)}
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
                <div className="small muted mb" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  ⚙️ {t('windowLength')} & {t('sessionTime')}:
                </div>

                {/* Custom Session Duration Input ABOVE start/end times */}
                <div style={{ marginBottom: 14 }}>
                  <label className="field" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 800 }}>⏱️ {t('windowLength')} ({t('durationMin')}):</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {DURATION_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`btn sm ${slotDuration === p ? '' : 'ghost'}`}
                          style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            setSlotDuration(p)
                            if (endM <= startM || (endM - startM) < p) {
                              setEndM(startM + p)
                            }
                          }}
                        >
                          {fa(p)} {t('durationMin')}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span className="small muted">{isEn ? 'Or manual min:' : 'یا وارد کردن دستی:'}</span>
                      <input
                        type="number"
                        min="15"
                        max="240"
                        step="5"
                        className="input"
                        style={{ width: 90, padding: '6px 10px', fontSize: 13, borderRadius: 8 }}
                        value={slotDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 15
                          setSlotDuration(val)
                          if (endM <= startM || (endM - startM) < val) {
                            setEndM(startM + val)
                          }
                        }}
                      />
                      <span className="small muted">{t('durationMin')}</span>
                    </div>
                  </label>
                </div>

                {/* Start & End Time Selectors */}
                <div className="two-col mb" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="field">
                    <span>{t('startTime')}</span>
                    <select
                      className="input"
                      value={startM}
                      onChange={(e) => {
                        const s = Number(e.target.value)
                        setStartM(s)
                        if (endM <= s) setEndM(s + slotDuration)
                      }}
                    >
                      {MINUTES_OPT.slice(0, -1).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('endTime')}</span>
                    <select
                      className="input"
                      value={endM}
                      onChange={(e) => setEndM(Number(e.target.value))}
                    >
                      {MINUTES_OPT.filter((m) => m > startM).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                </div>

                <div className="small mb" style={{ color: lengthOk ? '#16a34a' : '#dc2626', fontWeight: 700, lineHeight: 1.6 }}>
                  {isEn
                    ? `Total: ${fa(lengthMin)} min · Generate ${fa(numSlots)} slots (${fa(slotDuration)} min each)`
                    : `کل بازه: ${lengthMin > 0 ? `${fa(lengthMin)} دقیقه` : '—'} · ایجاد ${fa(numSlots)} اسلات ${fa(slotDuration)} دقیقه‌ای`
                  }
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
                      {fmt(s.start_min)} ({fa(s.duration_min || 45)}′)
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
