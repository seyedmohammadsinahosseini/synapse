import { useCallback, useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'

const METHOD_LABELS = {
  test: { label_fa: 'تست‌زنی', label_en: 'Testing / MCQ', icon: '🎯', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.16)' },
  essay: { label_fa: 'تشریحی', label_en: 'Essay', icon: '✍️', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.16)' },
  study: { label_fa: 'مطالعه مفهومی', label_en: 'Concept Study', icon: '📖', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)' },
  review: { label_fa: 'مرور و جمع‌بندی', label_en: 'Review', icon: '🔄', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)' },
}

export default function PlanPage({ navigate }) {
  const { t } = useLang()
  const isEn = getLang() === 'en'

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [targetDateStr, setTargetDateStr] = useState('')
  const [alertHours, setAlertHours] = useState(4.0)
  const [alertReason, setAlertReason] = useState('')
  const [savingAlert, setSavingAlert] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const load = useCallback(() => {
    api('/api/plan').then(setData).catch((e) => setError(e.message))
  }, [])

  useEffect(load, [load])

  const tick = async (dayIndex, task, status) => {
    if (busy) return
    setBusy(true)
    const next = task.status === status ? '' : status
    try {
      await api('/api/plan/task', {
        method: 'POST',
        body: { day_index: dayIndex, task_index: task.index, status: next },
      })
      load()
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
      load()
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
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const faDateOnly = (iso) => {
    try {
      const d = new Date(iso + 'T00:00:00')
      return isEn ? d.toLocaleDateString('en-GB') : d.toLocaleDateString('fa-IR')
    } catch { return iso }
  }

  const formatCompletedAt = (iso) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString(isEn ? 'en-GB' : 'fa-IR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  }

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!data) return <div className="empty">…</div>

  const today = data.days.find((d) => d.is_today) || null
  const week = data.week || {}
  const sourceIsMentor = data.source === 'mentor'
  const color = week.color === 'ok' ? '#22c55e' : week.color === 'mid' ? '#eab308' : week.color === 'low' ? '#ef4444' : '#94a3b8'
  const pct = week.pct

  const daysList = data.days || []
  const weekRangeStr = daysList.length >= 7 ? `${faDateOnly(daysList[0].date_str)} — ${faDateOnly(daysList[6].date_str)}` : ''

  return (
    <div className="plan-calendar-page">
      {/* Hero Card */}
      <div className="hero plan-hero" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
        <div className="flex wrap between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>{t('planDays')}</h2>
              <span className="badge" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 12 }}>
                {sourceIsMentor ? `🧑‍🏫 ${t('planSourceMentor')} (${data.mentor_name || 'مشاور'})` : `🤖 ${t('planSourceAi')}`}
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {t('taskLegend')}
            </p>
          </div>
          <div className="week-ring-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {pct != null ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  className="week-ring"
                  style={{ background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,.25) 0)` }}
                >
                  <div className="week-ring-in"><b>{fa(pct)}٪</b></div>
                </div>
                <div className="small" style={{ color: 'rgba(255,255,255,.9)', marginTop: 4 }}>{t('weekProgress')}</div>
              </div>
            ) : (
              <div className="small" style={{ color: 'rgba(255,255,255,.9)' }}>
                {t('weekProgress')}: —
              </div>
            )}
          </div>
        </div>
      </div>

      {!data.plan_exists && <Empty>{t('noPlanYet')}</Empty>}

      {data.plan_exists && (
        <>
          {/* Today's Focus Action Section */}
          {today && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🎯 {t('todayTasks')} ({today.label} · {faDateOnly(today.date_str)})</span>
                <button
                  className="btn ghost sm"
                  style={{ borderRadius: 10, fontSize: 12.5 }}
                  onClick={() => openCapacityModal(today)}
                >
                  {t('declareCapacity')}
                </button>
              </div>

              {today.is_over_capacity && (
                <div
                  className="day-capacity-alert"
                  style={{
                    background: 'rgba(245, 158, 11, 0.16)',
                    border: '1.5px solid #f59e0b',
                    borderRadius: 14,
                    padding: '10px 16px',
                    color: '#b45309',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <b>{t('capacityWarning')}</b> {today.capacity_warning}
                    {today.capacity_limit?.reason && (
                      <div className="small" style={{ marginTop: 2 }}>دلیل: {today.capacity_limit.reason}</div>
                    )}
                  </div>
                </div>
              )}

              <Card style={{ borderRadius: 18, padding: 16 }}>
                {today.tasks.length === 0 ? (
                  <Empty>{t('noTaskToday')}</Empty>
                ) : (
                  <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {today.tasks.map((task) => {
                      const methodCfg = METHOD_LABELS[task.study_method] || METHOD_LABELS.study
                      const mLabel = isEn ? methodCfg.label_en : methodCfg.label_fa
                      const doneTime = formatCompletedAt(task.completed_at)
                      const isDone = task.status === 'done'
                      return (
                        <div
                          key={task.index}
                          className={`task-row ${task.status ? 'has' : ''}`}
                          style={{
                            border: isDone ? '1.5px solid var(--ok)' : '1px solid var(--line)',
                            borderRadius: 12,
                            padding: '10px 14px',
                            background: isDone ? 'rgba(34, 197, 94, 0.10)' : 'var(--card)',
                            color: 'var(--ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                          onClick={() => setSelectedTask(task)}
                          title={t('topicNotesPlaceholder')}
                        >
                          {/* Single Line Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 15, color: 'var(--ink)' }}>{task.subject}</b>
                            <span
                              style={{
                                background: methodCfg.bg,
                                color: methodCfg.color,
                                fontSize: 11.5,
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontWeight: 700,
                              }}
                            >
                              {methodCfg.icon} {mLabel}
                            </span>
                            <span className="small muted" style={{ background: 'var(--tint-fill)', padding: '2px 8px', borderRadius: 6 }}>
                              ⏱️ {fa(task.duration_minutes)} {t('durationMin')}
                            </span>
                            {task.question_count && (
                              <span className="small" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                📝 {fa(task.question_count)} {t('questionsCount')}
                              </span>
                            )}
                            {doneTime && (
                              <span className="small" style={{ color: 'var(--ok)', fontWeight: 700 }}>
                                ⏰ {doneTime}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="task-actions" style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={`task-btn ok ${task.status === 'done' ? 'on' : ''}`}
                              title={t('taskDone')}
                              disabled={busy}
                              style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                              onClick={() => tick(today.index, task, 'done')}
                            >
                              ✓ {t('taskDone')}
                            </button>
                            <button
                              className={`task-btn no ${task.status === 'missed' ? 'on' : ''}`}
                              title={t('taskMissed')}
                              disabled={busy}
                              style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                              onClick={() => tick(today.index, task, 'missed')}
                            >
                              ✕ {t('taskMissed')}
                            </button>
                            {task.status && (
                              <button
                                className="task-btn clear"
                                disabled={busy}
                                style={{ borderRadius: 8, padding: '4px 8px', fontSize: 11 }}
                                onClick={() => tick(today.index, task, '')}
                              >
                                {t('clearTask')}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── WEEK NAVIGATION CONTROLS ── */}
          <div
            className="card"
            style={{
              borderRadius: 16,
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn ghost sm"
                style={{ borderRadius: 10, padding: '6px 14px', fontWeight: 800 }}
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                {t('prevWeekBtn')}
              </button>
              <button
                className="btn ghost sm"
                style={{ borderRadius: 10, padding: '6px 14px', fontWeight: 800 }}
                onClick={() => setWeekOffset(0)}
              >
                {t('currentWeek')}
              </button>
              <button
                className="btn ghost sm"
                style={{ borderRadius: 10, padding: '6px 14px', fontWeight: 800 }}
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                {t('nextWeekBtn')}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontSize: 13, padding: '4px 12px' }}>
                🗓️ {weekRangeStr} {weekOffset !== 0 ? `(${weekOffset > 0 ? `+${weekOffset}` : weekOffset})` : ''}
              </span>
            </div>
          </div>

          {/* Full 7-Day Week Calendar View */}
          <div
            className="calendar-week-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              width: '100%',
            }}
          >
            {data.days.map((d) => {
              const hasAlert = d.is_over_capacity
              return (
                <div
                  key={d.index}
                  className={`calendar-day-col ${hasAlert ? 'day-capacity-alert' : ''}`}
                  style={{
                    background: hasAlert ? 'rgba(234, 179, 8, 0.14)' : 'var(--card)',
                    border: hasAlert ? '2px solid #f59e0b' : d.is_today ? '2px solid var(--primary)' : '1.5px solid var(--line)',
                    borderRadius: 18,
                    padding: 14,
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <b style={{ fontSize: 15, color: 'var(--ink)' }}>{d.label}</b>
                      <span className="small muted" style={{ display: 'block', fontSize: 11 }}>{faDateOnly(d.date_str)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {d.is_today && <span className="badge badge-today" style={{ borderRadius: 8, fontSize: 11 }}>{t('today')}</span>}
                      <button
                        className="btn ghost sm"
                        style={{ padding: '2px 6px', fontSize: 11, borderRadius: 6 }}
                        onClick={() => openCapacityModal(d)}
                        title={t('declareCapacity')}
                      >
                        ⏱️
                      </button>
                    </div>
                  </div>

                  {hasAlert && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.18)',
                        color: '#b45309',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        marginBottom: 10,
                        fontWeight: 700,
                        border: '1px solid #f59e0b',
                      }}
                    >
                      ⚠️ {t('capacityWarning')} {fa(Math.round(d.total_minutes / 60 * 10) / 10)} {t('hoursUnit')}
                    </div>
                  )}

                  {/* Tasks on SINGLE LINE */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {d.tasks.length === 0 ? (
                      <div className="small muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: 12 }}>
                        {t('noTaskToday')}
                      </div>
                    ) : (
                      d.tasks.map((task) => {
                        const mCfg = METHOD_LABELS[task.study_method] || METHOD_LABELS.study
                        const mLabel = isEn ? mCfg.label_en : mCfg.label_fa
                        return (
                          <div
                            key={task.index}
                            className="planner-task-card"
                            style={{
                              background: 'var(--card)',
                              border: '1px solid var(--line)',
                              borderRadius: 10,
                              padding: '8px 10px',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                            }}
                            onClick={() => setSelectedTask(task)}
                            title={t('topicNotesPlaceholder')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <b style={{ fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.subject}
                              </b>
                              <span style={{ fontSize: 10.5, background: mCfg.bg, color: mCfg.color, padding: '2px 6px', borderRadius: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {mCfg.icon} {mLabel}
                              </span>
                              <span className="small muted" style={{ fontSize: 10.5, background: 'var(--tint-fill)', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                ⏱️ {fa(task.duration_minutes)} {t('durationMin')}
                              </span>
                              {task.question_count && (
                                <span className="small" style={{ fontSize: 10.5, background: 'var(--tint-fill)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  📝 {fa(task.question_count)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }} className="muted">
                    <span>{t('totalTime')}</span>
                    <b>{fa(Math.round(d.total_minutes / 60 * 10) / 10)} {t('hoursUnit')} ({fa(d.total_minutes)} {t('minutesUnit')})</b>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Floating Task Detail Popover / Modal */}
      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            style={{
              background: 'var(--card)',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              borderRadius: 20,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📖 {t('planOf')}:</span>
                <span style={{ color: 'var(--primary)' }}>{selectedTask.subject}</span>
              </h3>
              <button className="btn ghost sm" style={{ borderRadius: 8 }} onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span className="small muted">{t('typeShort')}:</span>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ fontSize: 13, background: (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).bg, color: (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).color }}>
                    {(METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).icon} {isEn ? (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).label_en : (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).label_fa}
                  </span>
                  <span className="badge" style={{ fontSize: 13, background: 'var(--tint-fill)', color: 'var(--ink)' }}>⏱️ {fa(selectedTask.duration_minutes)} {t('durationMin')}</span>
                  {selectedTask.question_count && (
                    <span className="badge" style={{ fontSize: 13, background: 'var(--tint-fill)', color: 'var(--primary)' }}>
                      📝 {fa(selectedTask.question_count)} {t('questionsCount')}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="small muted">{t('sessionFocus')}:</span>
                <div style={{ background: 'var(--tint-hover)', padding: 12, borderRadius: 10, marginTop: 4, border: '1px solid var(--line)', fontSize: 14, minHeight: 60, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedTask.topic || '—'}
                </div>
              </div>

              {selectedTask.notes && (
                <div>
                  <span className="small muted">نکات و توصیه مشاور:</span>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: 12, borderRadius: 10, marginTop: 4, fontSize: 13, border: '1px solid #f59e0b', whiteSpace: 'pre-wrap' }}>
                    💡 {selectedTask.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'end' }}>
              <button className="btn" style={{ borderRadius: 10 }} onClick={() => setSelectedTask(null)}>
                {t('closeWin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Alert Modal */}
      {alertModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setAlertModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              borderRadius: 20,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>⏱️ {t('declareCapacity')}</h3>
            <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.5 }}>
              اگر در این روز با محدودیت زمانی مواجهید، حداکثر ساعت مطالعه مجاز خود را وارد کنید:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="small muted">{t('dayDate')}:</label>
                <input
                  type="date"
                  className="input"
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label className="small muted">حداکثر ساعت مطالعه:</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  className="input"
                  value={alertHours}
                  onChange={(e) => setAlertHours(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label className="small muted">علت محدودیت (اختیاری):</label>
                <input
                  type="text"
                  className="input"
                  placeholder="مثال: کلاس کنکور یا آزمون مدرسه"
                  value={alertReason}
                  onChange={(e) => setAlertReason(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn ghost"
                style={{ borderRadius: 10, color: 'var(--danger)' }}
                onClick={() => {
                  deleteCapacityAlert(targetDateStr)
                  setAlertModalOpen(false)
                }}
              >
                {t('removeSession')}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" style={{ borderRadius: 10 }} onClick={() => setAlertModalOpen(false)}>
                  {t('supportCancel')}
                </button>
                <button className="btn" style={{ borderRadius: 10 }} onClick={saveCapacityAlert} disabled={savingAlert}>
                  {savingAlert ? '…' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt" style={{ marginTop: 30 }}>
        <button className="btn ghost" onClick={() => navigate('#/dashboard')}>← {t('backToPlan')}</button>
      </div>
    </div>
  )
}
