import { useCallback, useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'
import StudyCalendarMatrix from '../components/StudyCalendarMatrix.jsx'
import PomodoroTimer from '../components/PomodoroTimer.jsx'

export default function PlanPage({ navigate }) {
  const { t, lang } = useLang()
  const isEn = getLang() === 'en'

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  // Capacity alert modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [targetDateStr, setTargetDateStr] = useState('')
  const [alertHours, setAlertHours] = useState(4.0)
  const [alertReason, setAlertReason] = useState('')
  const [savingAlert, setSavingAlert] = useState(false)

  // Pomodoro focus modal state
  const [pomoModalOpen, setPomoModalOpen] = useState(false)
  const [pomoSubject, setPomoSubject] = useState('زیست‌شناسی')
  const [pomoDuration, setPomoDuration] = useState(90)

  const getWeekDates = (offset = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diffToSat = (dayOfWeek + 1) % 7
    const sat = new Date(today)
    sat.setDate(today.getDate() - diffToSat + offset * 7)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sat)
      d.setDate(sat.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  const load = useCallback(
    (offset = weekOffset) => {
      const dates = getWeekDates(offset)
      const satStr = dates[0]
      api(`/api/plan?week_start=${satStr}`)
        .then(setData)
        .catch((e) => setError(e.message))
    },
    [weekOffset]
  )

  useEffect(() => {
    load(weekOffset)
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const tick = async (dayIndex, task, status, dateStr) => {
    if (busy) return
    setBusy(true)
    const next = task.status === status ? '' : status
    try {
      await api('/api/plan/task', {
        method: 'POST',
        body: { day_index: dayIndex, task_index: task.index ?? 0, status: next, date_str: dateStr },
      })
      load(weekOffset)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const openCapacityModal = (day) => {
    setTargetDateStr(day.date_str || new Date().toISOString().slice(0, 10))
    const existing = data?.capacity_alerts?.[day.date_str]
    setAlertHours(existing ? existing.max_hours : 4.0)
    setAlertReason(existing ? existing.reason : '')
    setAlertModalOpen(true)
  }

  const saveCapacityAlert = async () => {
    if (!targetDateStr || savingAlert) return
    setSavingAlert(true)
    try {
      await api('/api/plan/capacity-alert', {
        method: 'POST',
        body: {
          date_str: targetDateStr,
          max_hours: parseFloat(alertHours),
          reason: alertReason.trim(),
        },
      })
      setAlertModalOpen(false)
      load(weekOffset)
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingAlert(false)
    }
  }

  const deleteCapacityAlert = async (dateStr) => {
    if (!dateStr || busy) return
    setBusy(true)
    try {
      await api(`/api/plan/capacity-alert/${dateStr}`, { method: 'DELETE' })
      load(weekOffset)
      setAlertModalOpen(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const faDateOnly = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso + 'T00:00:00')
      return isEn ? d.toLocaleDateString('en-GB') : d.toLocaleDateString('fa-IR')
    } catch {
      return iso
    }
  }

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!data) return <div className="empty">{t('loadingDash') || '…'}</div>

  const week = data.week || {}
  const sourceIsMentor = data.source === 'mentor'
  const color = week.color === 'ok' ? '#22c55e' : week.color === 'mid' ? '#eab308' : week.color === 'low' ? '#ef4444' : '#94a3b8'
  const pct = week.pct

  const curWeekDates = getWeekDates(weekOffset)
  const weekRangeStr = `${faDateOnly(curWeekDates[0])} — ${faDateOnly(curWeekDates[6])}`

  return (
    <div className="plan-calendar-page">
      {/* Hero Header */}
      <div className="hero plan-hero" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
        <div className="flex wrap between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>{t('planDays')}</h2>
              <span className="badge" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 12 }}>
                {sourceIsMentor ? `🧑‍🏫 ${t('planSourceMentor')} (${data.mentor_name || (isEn ? 'Mentor' : 'مشاور')})` : `🤖 ${t('planSourceAi')}`}
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {isEn
                ? 'Follow your daily study routine assigned by your mentor. Click any task to see details and start Pomodoro.'
                : 'برنامه درسی مصوب مشاور شما؛ روی هر پارت کلیک کنید تا جزئیات و منابع را ببینید و جلسه تمرکز را آغاز کنید.'}
            </p>
          </div>

          <div className="week-ring-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {pct != null ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  className="week-ring"
                  style={{ background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,.25) 0)` }}
                >
                  <div className="week-ring-in">
                    <b>{fa(pct)}٪</b>
                  </div>
                </div>
                <div className="small" style={{ color: 'rgba(255,255,255,.9)', marginTop: 4 }}>
                  {t('weekProgress')}
                </div>
              </div>
            ) : (
              <div className="small" style={{ color: 'rgba(255,255,255,.9)' }}>
                {t('weekProgress')}: —
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty Plan notice if not yet set for this week */}
      {!data.plan_exists && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🗓️</div>
          <b style={{ fontSize: 16, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
            {weekOffset === 0 ? t('noPlanYet') : isEn ? 'No study plan scheduled for this week' : 'برای این هفته برنامه‌ای ثبت نشده است'}
          </b>
          <p className="small muted">
            {weekOffset > 0
              ? isEn
                ? 'Your mentor has not yet published the plan for this week.'
                : 'مشاور هنوز برنامه این هفته را ارسال نکرده است.'
              : isEn
              ? 'You can return to the current week or message your mentor.'
              : 'می‌توانید به هفته جاری بازگردید یا با مشاور خود گفتگو کنید.'}
          </p>
          {weekOffset !== 0 && (
            <button className="btn sm mt" style={{ borderRadius: 10 }} onClick={() => setWeekOffset(0)}>
              {isEn ? 'Return to Current Week' : 'بازگشت به هفته جاری'}
            </button>
          )}
        </div>
      )}

      {/* ── UNIFIED STUDY CALENDAR MATRIX (STUDENT VIEW) ── */}
      <StudyCalendarMatrix
        mode="student"
        days={data.days || []}
        capacityAlerts={data.capacity_alerts || {}}
        onTickTask={tick}
        onDeclareCapacity={openCapacityModal}
        onStartPomodoro={(task) => {
          setPomoSubject(task.subject || 'زیست‌شناسی')
          setPomoDuration(task.durationMinutes || 90)
          setPomoModalOpen(true)
        }}
        weekRangeStr={weekRangeStr}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onCurrentWeek={() => setWeekOffset(0)}
        weekOffset={weekOffset}
      />

      {/* ═══════════════════════════════════════════════════════════════
          POMODORO FOCUS MODAL (WITH TEACHER'S EXACT DURATION)
         ═══════════════════════════════════════════════════════════════ */}
      {pomoModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPomoModalOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 540,
              width: '100%',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>⏱️</span>
                <div>
                  <b style={{ fontSize: 17, display: 'block' }}>
                    {isEn ? 'Deep Work Focus Session' : 'پارت تمرکز عمیق پومودورو'}
                  </b>
                  <span className="small muted">
                    {isEn ? 'Subject:' : 'درس:'} <b>{pomoSubject}</b> ({fa(pomoDuration)} {isEn ? 'minutes' : 'دقیقه مصوب استاد'})
                  </span>
                </div>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => setPomoModalOpen(false)}>
                ✕
              </button>
            </div>

            <PomodoroTimer
              initialSubject={pomoSubject}
              onCompleteSession={() => setPomoModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CAPACITY / TIME CONSTRAINT DECLARATION MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {alertModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 10000,
            padding: 16,
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setAlertModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              borderRadius: 22,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>⏱️ {isEn ? 'Declare Study Time Constraint' : 'اعلام محدودیت زمانی مطالعه'}</h3>
            <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.6 }}>
              {isEn
                ? 'If you have an exam or class on this day, specify your maximum available study hours so your mentor can adjust your workload:'
                : 'اگر در این روز با آزمون، کلاس کنکور یا محدودیت زمانی مواجهید، حداکثر ساعت مطالعه مجاز خود را وارد کنید تا به مشاور هشدار داده شود:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="small muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {isEn ? 'Target Date:' : 'تاریخ مورد نظر:'}
                </label>
                <input
                  type="date"
                  className="input"
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                />
              </div>

              <div>
                <label className="small muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {isEn ? 'Max Available Study Hours:' : 'حداکثر ساعت مطالعه مجاز در این روز:'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  className="input"
                  value={alertHours}
                  onChange={(e) => setAlertHours(e.target.value)}
                />
              </div>

              <div>
                <label className="small muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {isEn ? 'Reason / Explanation (Optional):' : 'علت محدودیت (اختیاری):'}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. Mock exam or school test' : 'مثال: آزمون قلم‌چی، کلاس فوق‌العاده ریاضی'}
                  value={alertReason}
                  onChange={(e) => setAlertReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn ghost sm"
                style={{ color: 'var(--danger)', borderRadius: 10 }}
                onClick={() => deleteCapacityAlert(targetDateStr)}
              >
                {isEn ? 'Remove Constraint' : 'حذف محدودیت'}
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn ghost" style={{ borderRadius: 10 }} onClick={() => setAlertModalOpen(false)}>
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button type="button" className="btn primary" style={{ borderRadius: 10 }} onClick={saveCapacityAlert} disabled={savingAlert}>
                  {savingAlert ? '…' : isEn ? 'Save Alert' : 'ثبت محدودیت'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to dashboard */}
      <div className="mt" style={{ marginTop: 28 }}>
        <button type="button" className="btn ghost" onClick={() => navigate('#/dashboard')}>
          ← {isEn ? 'Back to Dashboard' : 'بازگشت به داشبورد'}
        </button>
      </div>
    </div>
  )
}
