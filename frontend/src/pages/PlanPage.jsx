import { useCallback, useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'

const METHOD_LABELS = {
  test: { label: 'تست‌زنی', icon: '🎯', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.16)' },
  essay: { label: 'تشریحی', icon: '✍️', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.16)' },
  study: { label: 'مطالعه مفهومی', icon: '📖', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)' },
  review: { label: 'مرور و جمع‌بندی', icon: '🔄', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)' },
}

export default function PlanPage({ navigate }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [targetDateStr, setTargetDateStr] = useState('')
  const [alertHours, setAlertHours] = useState(4.0)
  const [alertReason, setAlertReason] = useState('')
  const [savingAlert, setSavingAlert] = useState(false)

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
      return getLang() === 'fa'
        ? d.toLocaleDateString('fa-IR')
        : d.toLocaleDateString('en-GB')
    } catch { return iso }
  }

  const formatCompletedAt = (iso) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
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

  return (
    <div className="plan-calendar-page">
      {/* Hero Card */}
      <div className="hero plan-hero" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', marginBottom: 24 }}>
        <div className="flex wrap between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>برنامه هفتگی و تقویم مطالعاتی</h2>
              <span className="badge" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 12 }}>
                {sourceIsMentor ? `🧑‍🏫 برنامه مشاور (${data.mentor_name || 'مشاور ارشد'})` : `🤖 برنامه هوشمند AI`}
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.9 }}>
              تقویم مطالعاتی ۷ روزه بر اساس ساعات، مباحث و روش‌های چهارگانه مطالعه.
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
            <div style={{ marginBottom: 30 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🎯 تکالیف و برنامه‌های امروز ({today.label} · {faDateOnly(today.date_str)})</span>
                <button
                  className="btn ghost sm"
                  style={{ borderRadius: 10, fontSize: 13 }}
                  onClick={() => openCapacityModal(today)}
                >
                  ⏱️ اعلام سقف ظرفیت مطالعه
                </button>
              </div>

              {today.is_over_capacity && (
                <div
                  className="day-capacity-alert"
                  style={{
                    background: 'rgba(245, 158, 11, 0.16)',
                    border: '1.5px solid #f59e0b',
                    borderRadius: 14,
                    padding: '12px 18px',
                    color: '#b45309',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 22 }}>⚠️</span>
                  <div>
                    <b>هشدار ظرفیت مطالعه:</b> {today.capacity_warning}
                    {today.capacity_limit?.reason && (
                      <div className="small" style={{ marginTop: 2 }}>دلیل شما: {today.capacity_limit.reason}</div>
                    )}
                  </div>
                </div>
              )}

              <Card style={{ borderRadius: 18, padding: 20 }}>
                {today.tasks.length === 0 ? (
                  <Empty>{t('noTaskToday')}</Empty>
                ) : (
                  <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {today.tasks.map((task) => {
                      const methodCfg = METHOD_LABELS[task.study_method] || METHOD_LABELS.study
                      const doneTime = formatCompletedAt(task.completed_at)
                      const isDone = task.status === 'done'
                      return (
                        <div
                          key={task.index}
                          className={`task-row ${task.status ? 'has' : ''}`}
                          style={{
                            border: isDone ? '1.5px solid var(--ok)' : '1px solid var(--line)',
                            borderRadius: 14,
                            padding: '14px 18px',
                            background: isDone ? 'rgba(34, 197, 94, 0.10)' : 'var(--card)',
                            color: 'var(--ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="task-info" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                              <b style={{ fontSize: 16, color: 'var(--ink)' }}>{task.subject}</b>
                              <span
                                style={{
                                  background: methodCfg.bg,
                                  color: methodCfg.color,
                                  fontSize: 12,
                                  padding: '2px 8px',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                }}
                              >
                                {methodCfg.icon} {methodCfg.label}
                              </span>
                              <span className="small muted" style={{ background: 'var(--tint-fill)', padding: '2px 8px', borderRadius: 8 }}>
                                ⏱️ {fa(task.duration_minutes)} دقیقه
                              </span>
                              {task.question_count && (
                                <span className="small" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                                  📝 {fa(task.question_count)} تست / سوال
                                </span>
                              )}
                            </div>
                            <div className="small muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                              {task.topic ? `مبحث: ${task.topic}` : 'بدون مبحث مشخص'}
                              {task.notes && <span style={{ marginRight: 8, color: 'var(--muted)' }}>· نکته مشاور: {task.notes}</span>}
                            </div>
                            {doneTime && (
                              <div className="small" style={{ color: 'var(--ok)', marginTop: 4, fontWeight: 700 }}>
                                ⏰ زمان ثبت انجام: {doneTime}
                              </div>
                            )}
                          </div>

                          <div className="task-actions" style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={`task-btn ok ${task.status === 'done' ? 'on' : ''}`}
                              title={t('taskDone')}
                              disabled={busy}
                              style={{ borderRadius: 10, padding: '6px 12px' }}
                              onClick={() => tick(today.index, task, 'done')}
                            >
                              ✓ {t('taskDone')}
                            </button>
                            <button
                              className={`task-btn no ${task.status === 'missed' ? 'on' : ''}`}
                              title={t('taskMissed')}
                              disabled={busy}
                              style={{ borderRadius: 10, padding: '6px 12px' }}
                              onClick={() => tick(today.index, task, 'missed')}
                            >
                              ✕ {t('taskMissed')}
                            </button>
                            {task.status && (
                              <button
                                className="task-btn clear"
                                disabled={busy}
                                style={{ borderRadius: 10 }}
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

          {/* Full 7-Day Week Calendar View */}
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span>🗓️ نمای کامل تقویم ۷ روزه هفته</span>
            <span className="small muted">برای مشاهده جزئیات هر پارت روی آن کلیک کنید</span>
          </div>

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
                    padding: 16,
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <b style={{ fontSize: 16, color: 'var(--ink)' }}>{d.label}</b>
                      <span className="small muted" style={{ display: 'block', fontSize: 11 }}>{faDateOnly(d.date_str)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {d.is_today && <span className="badge badge-today" style={{ borderRadius: 8 }}>{t('today')}</span>}
                      <button
                        className="btn ghost sm"
                        style={{ padding: '2px 6px', fontSize: 11, borderRadius: 6 }}
                        onClick={() => openCapacityModal(d)}
                        title="تنظیم سقف ساعات مطالعه روز"
                      >
                        ⏱️ سقف
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
                      ⚠️ اضافه بار: {fa(Math.round(d.total_minutes / 60 * 10) / 10)} ساعت (سقف: {fa(d.capacity_limit?.max_hours)} ساعت)
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {d.tasks.length === 0 ? (
                      <div className="small muted" style={{ textAlign: 'center', padding: '16px 0' }}>برنامه‌ای ثبت نشده</div>
                    ) : (
                      d.tasks.map((task) => {
                        const mCfg = METHOD_LABELS[task.study_method] || METHOD_LABELS.study
                        return (
                          <div
                            key={task.index}
                            className="planner-task-card"
                            style={{
                              background: 'var(--card)',
                              border: '1px solid var(--line)',
                              borderRadius: 12,
                              padding: '10px 12px',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <b style={{ fontSize: 14, color: 'var(--ink)' }}>{task.subject}</b>
                              <span style={{ fontSize: 11, background: mCfg.bg, color: mCfg.color, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                                {mCfg.icon} {mCfg.label}
                              </span>
                            </div>
                            <div className="small muted" style={{ fontSize: 12, marginBottom: 4 }}>
                              ⏱️ {fa(task.duration_minutes)} دقیقه {task.question_count ? `· 📝 ${fa(task.question_count)} تست` : ''}
                            </div>
                            {task.topic && (
                              <div className="small" style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.topic}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }} className="muted">
                    <span>مجموع زمان:</span>
                    <b>{fa(Math.round(d.total_minutes / 60 * 10) / 10)} ساعت ({fa(d.total_minutes)} دقیقه)</b>
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
                <span>📖 جزئیات تکلیف:</span>
                <span style={{ color: 'var(--primary)' }}>{selectedTask.subject}</span>
              </h3>
              <button className="btn ghost sm" style={{ borderRadius: 8 }} onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span className="small muted">روش مطالعه:</span>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ fontSize: 13, background: (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).bg, color: (METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).color }}>
                    {(METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).icon} {(METHOD_LABELS[selectedTask.study_method] || METHOD_LABELS.study).label}
                  </span>
                  <span className="badge" style={{ fontSize: 13, background: 'var(--tint-fill)', color: 'var(--ink)' }}>⏱️ {fa(selectedTask.duration_minutes)} دقیقه</span>
                  {selectedTask.question_count && (
                    <span className="badge" style={{ fontSize: 13, background: 'var(--tint-fill)', color: 'var(--primary)' }}>
                      📝 {fa(selectedTask.question_count)} تست / سوال
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="small muted">سرفصل و مبحث اختصاصی:</span>
                <div style={{ background: 'var(--tint-hover)', padding: 12, borderRadius: 10, marginTop: 4, border: '1px solid var(--line)', fontSize: 14, minHeight: 60, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedTask.topic || 'بدون توضیح سرفصل'}
                </div>
              </div>

              {selectedTask.notes && (
                <div>
                  <span className="small muted">توصیه و نکات مشاور:</span>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: 12, borderRadius: 10, marginTop: 4, fontSize: 13, border: '1px solid #f59e0b', whiteSpace: 'pre-wrap' }}>
                    💡 {selectedTask.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'end' }}>
              <button className="btn" style={{ borderRadius: 10 }} onClick={() => setSelectedTask(null)}>
                بستن پنجره
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>⏱️ اعلام سقف توان مطالعه روزانه</h3>
            <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.5 }}>
              اگر در این روز با محدودیت زمانی (مدرسه، آزمون یا مهمانی) مواجهید، سقف توان مطالعه خود را وارد کنید تا مشاور مطلع شود.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="small muted">تاریخ مورد نظر:</label>
                <input
                  type="date"
                  className="input"
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label className="small muted">حداکثر ساعت مطالعه مجاز:</label>
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
                  placeholder="مثال: کلاس فوق‌العاده یا آزمون مدرسه"
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
                حذف محدودیت
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost" style={{ borderRadius: 10 }} onClick={() => setAlertModalOpen(false)}>
                  انصراف
                </button>
                <button className="btn" style={{ borderRadius: 10 }} onClick={saveCapacityAlert} disabled={savingAlert}>
                  {savingAlert ? 'در حال ثبت...' : 'ثبت سقف'}
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
