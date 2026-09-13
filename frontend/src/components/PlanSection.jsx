import { useState } from 'react'
import { api, fa } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Modal } from '../ui.jsx'

const STANDARD_SUBJECTS = [
  'ریاضی', 'زیست‌شناسی', 'فیزیک', 'شیمی', 'ادبیات فارسی',
  'زبان انگلیسی', 'عربی', 'دین و زندگی', 'هندسه', 'گسسته',
  'زمین‌شناسی', 'اقتصاد', 'روان‌شناسی', 'جامعه‌شناسی', 'حسابان'
]

const STUDY_METHODS = [
  { id: 'test', label: 'تست‌زنی', icon: '🎯', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.14)', hasCount: true },
  { id: 'essay', label: 'تشریحی', icon: '✍️', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.14)', hasCount: true },
  { id: 'study', label: 'مطالعه مفهومی', icon: '📖', color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)', hasCount: false },
  { id: 'review', label: 'مرور و جمع‌بندی', icon: '🔄', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)', hasCount: false },
]

export default function PlanSection({ studentId, plan, capacityAlerts = {}, onChanged }) {
  const { t } = useLang()
  const [tpl, setTpl] = useState(null)
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedSession, setSelectedSession] = useState(null) // { dayIdx, taskIdx, task }
  const [draggedItem, setDraggedItem] = useState(null) // { type: 'subject' | 'method', val: string }

  // Initialize template days from plan or default
  const initCalendar = async () => {
    setMsg('')
    setErr('')
    setLoadingTpl(true)
    try {
      if (plan?.source === 'mentor' && plan?.weekly?.length) {
        setTpl(plan.weekly.map((d) => ({
          label: d.label,
          date_str: d.date_str || '',
          tasks: (d.tasks || []).map((x, j) => ({
            id: x.id || `sess_${j}_${Date.now()}`,
            subject: x.subject || '',
            topic: x.topic || x.focus || '',
            duration_minutes: x.duration_minutes || (x.hours ? Math.round(x.hours * 60) : 90),
            study_method: x.study_method || 'study',
            question_count: x.question_count || null,
            notes: x.notes || '',
          })),
        })))
      } else {
        const r = await api('/api/mentor/plans/template')
        setTpl((r.days || []).map((d) => ({
          label: d.label,
          date_str: d.date_str || '',
          tasks: (d.tasks || []).map((x, j) => ({
            id: `sess_${j}_${Date.now()}`,
            subject: x.subject || '',
            topic: x.topic || x.focus || '',
            duration_minutes: x.duration_minutes || 90,
            study_method: x.study_method || 'study',
            question_count: x.question_count || (x.study_method === 'test' ? 30 : null),
            notes: x.notes || '',
          })),
        })))
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoadingTpl(false)
    }
  }

  // Load once
  useState(() => {
    initCalendar()
  })

  const updTask = (di, ti, field, value) => {
    setTpl((prev) => prev.map((d, i) =>
      i === di ? {
        ...d,
        tasks: d.tasks.map((tk, j) => (j === ti ? { ...tk, [field]: value } : tk)),
      } : d
    ))
  }

  const addTask = (di, defaults = {}) => {
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      subject: defaults.subject || 'درس جدید',
      topic: defaults.topic || '',
      duration_minutes: defaults.duration_minutes || 90,
      study_method: defaults.study_method || 'study',
      question_count: defaults.question_count || (defaults.study_method === 'test' ? 30 : null),
      notes: defaults.notes || '',
    }
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: [...d.tasks, newTask] } : d
    ))
    return newTask
  }

  const delTask = (di, ti) => {
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: d.tasks.filter((_, j) => j !== ti) } : d
    ))
    if (selectedSession?.dayIdx === di && selectedSession?.taskIdx === ti) {
      setSelectedSession(null)
    }
  }

  const handleDropOnDay = (di) => {
    if (!draggedItem) return
    if (draggedItem.type === 'subject') {
      addTask(di, { subject: draggedItem.val })
    } else if (draggedItem.type === 'method') {
      addTask(di, {
        study_method: draggedItem.val,
        question_count: (draggedItem.val === 'test' ? 30 : draggedItem.val === 'essay' ? 15 : null),
      })
    }
    setDraggedItem(null)
  }

  const handleDropOnTask = (di, ti) => {
    if (!draggedItem) return
    if (draggedItem.type === 'subject') {
      updTask(di, ti, 'subject', draggedItem.val)
    } else if (draggedItem.type === 'method') {
      updTask(di, ti, 'study_method', draggedItem.val)
      if (draggedItem.val === 'test' || draggedItem.val === 'essay') {
        const curTask = tpl[di]?.tasks[ti]
        if (!curTask?.question_count) {
          updTask(di, ti, 'question_count', draggedItem.val === 'test' ? 30 : 15)
        }
      }
    }
    setDraggedItem(null)
  }

  const sendPlan = async () => {
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      await api(`/api/mentor/students/${studentId}/plan`, { method: 'PUT', body: { days: tpl } })
      setMsg('✅ تقویم برنامه درسی با موفقیت برای دانش‌آموز ثبت و ارسال شد.')
      if (onChanged) onChanged()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mentor-calendar-planner">
      {msg && <div className="ok-box mb" style={{ borderRadius: 14 }}>{msg}</div>}
      {err && <div className="error-box mb" style={{ borderRadius: 14 }}>{err}</div>}

      {loadingTpl ? (
        <div className="empty">در حال آماده‌سازی تقویم درسی...</div>
      ) : tpl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── DRAG & DROP TOOLKITS PALETTE ── */}
          <div
            className="card"
            style={{
              background: 'var(--card)',
              borderRadius: 20,
              padding: '18px 22px',
              boxShadow: 'var(--shadow)',
              border: '1.5px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🛠️</span>
                <div>
                  <b style={{ fontSize: 16, color: 'var(--ink)' }}>جعبه‌ابزار درگ و دراپ دروس و متدهای مطالعه</b>
                  <div className="small muted">آیتم‌ها را با ماوس بکشید و روی روز مورد نظر در تقویم رها کنید:</div>
                </div>
              </div>
              <button
                className="btn"
                style={{ borderRadius: 12, padding: '9px 20px', fontSize: 14 }}
                disabled={saving}
                onClick={sendPlan}
              >
                {saving ? 'در حال ذخیره...' : '💾 تایید و ذخیره نهایی تقویم برنامه'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* 1. Subjects Palette */}
              <div style={{ background: 'var(--tint-hover)', borderRadius: 14, padding: 14, border: '1px solid var(--line)' }}>
                <b className="small" style={{ color: 'var(--primary)', display: 'block', marginBottom: 8 }}>۱. پالت دروس (Subject Toolkit):</b>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STANDARD_SUBJECTS.map((subj) => (
                    <div
                      key={subj}
                      draggable
                      onDragStart={() => setDraggedItem({ type: 'subject', val: subj })}
                      style={{
                        background: 'var(--card)',
                        border: '1.5px solid var(--line)',
                        borderRadius: 10,
                        padding: '6px 12px',
                        fontSize: 12.5,
                        cursor: 'grab',
                        userSelect: 'none',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      📚 {subj}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      placeholder="+ درس دلخواه"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      style={{ width: 110, fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)' }}
                    />
                    {customSubject.trim() && (
                      <button
                        className="btn sm"
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8 }}
                        onClick={() => {
                          if (customSubject.trim()) {
                            setDraggedItem({ type: 'subject', val: customSubject.trim() })
                            setCustomSubject('')
                          }
                        }}
                      >
                        ثبت
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Study Methods Palette */}
              <div style={{ background: 'var(--tint-hover)', borderRadius: 14, padding: 14, border: '1px solid var(--line)' }}>
                <b className="small" style={{ color: 'var(--primary)', display: 'block', marginBottom: 8 }}>۲. پالت انواع مطالعه (Study Methods):</b>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STUDY_METHODS.map((m) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => setDraggedItem({ type: 'method', val: m.id })}
                      style={{
                        background: m.bg,
                        color: m.color,
                        border: `1.5px solid ${m.color}`,
                        borderRadius: 12,
                        padding: '8px 14px',
                        fontSize: 13,
                        cursor: 'grab',
                        userSelect: 'none',
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      }}
                    >
                      {m.icon} {m.label} {m.hasCount ? '(+ تعداد سوال)' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 7-DAY CALENDAR GRID ── */}
          <div className="calendar-week-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
            {tpl.map((d, di) => {
              const totalMin = d.tasks.reduce((sum, t) => sum + (parseInt(t.duration_minutes) || 0), 0)
              const dayAlert = capacityAlerts[d.date_str]
              const isOver = dayAlert && totalMin > (dayAlert.max_hours * 60)

              return (
                <div
                  key={di}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnDay(di)}
                  style={{
                    background: isOver ? 'rgba(254, 243, 199, 0.45)' : 'var(--card)',
                    border: isOver ? '2px solid #f59e0b' : '1.5px dashed var(--line)',
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: isOver ? '0 8px 24px rgba(245, 158, 11, 0.25)' : 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                    <div>
                      <b style={{ fontSize: 16, color: 'var(--ink)' }}>{d.label}</b>
                      <div className="small muted">مجموع: {fa(Math.round(totalMin / 60 * 10) / 10)} ساعت ({fa(totalMin)} دقیقه)</div>
                    </div>
                    <button
                      className="btn ghost sm"
                      style={{ borderRadius: 8, fontSize: 12 }}
                      type="button"
                      onClick={() => addTask(di)}
                    >
                      + افزودن پارت
                    </button>
                  </div>

                  {isOver && (
                    <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, marginBottom: 12, fontWeight: 700, border: '1px solid #fcd34d' }}>
                      ⚠️ هشدار ظرفیت: این روز {fa(Math.round(totalMin / 60 * 10) / 10)} ساعت تعیین شده اما سقف اعلامی دانش‌آموز {fa(dayAlert.max_hours)} ساعت است!
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 120 }}>
                    {d.tasks.length === 0 ? (
                      <div className="empty small muted" style={{ padding: '24px 0' }}>آیتم‌های درس یا روش مطالعه را اینجا رها کنید</div>
                    ) : (
                      d.tasks.map((task, ti) => {
                        const mCfg = STUDY_METHODS.find((m) => m.id === task.study_method) || STUDY_METHODS[2]
                        return (
                          <div
                            key={task.id || ti}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.stopPropagation()
                              handleDropOnTask(di, ti)
                            }}
                            style={{
                              background: 'var(--card)',
                              border: '1.5px solid var(--line)',
                              borderRadius: 14,
                              padding: '12px 14px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                              cursor: 'pointer',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                            onClick={() => setSelectedSession({ dayIdx: di, taskIdx: ti, task })}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{task.subject || 'بدون درس'}</b>
                                <span style={{ fontSize: 11, background: mCfg.bg, color: mCfg.color, padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>
                                  {mCfg.icon} {mCfg.label}
                                </span>
                              </div>
                              <button
                                className="btn ghost sm danger"
                                style={{ padding: '2px 6px', fontSize: 12 }}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  delTask(di, ti)
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="small muted">مدت:</span>
                                <input
                                  type="number"
                                  min="15"
                                  max="360"
                                  step="15"
                                  value={task.duration_minutes}
                                  onChange={(e) => updTask(di, ti, 'duration_minutes', parseInt(e.target.value) || 0)}
                                  style={{ width: 66, padding: '4px 6px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                                />
                                <span className="small muted">دقیقه</span>
                              </div>

                              {(task.study_method === 'test' || task.study_method === 'essay') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="small muted">تعداد:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    placeholder="تعداد سوال"
                                    value={task.question_count || ''}
                                    onChange={(e) => updTask(di, ti, 'question_count', parseInt(e.target.value) || null)}
                                    style={{ width: 66, padding: '4px 6px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                                  />
                                  <span className="small muted">سوال</span>
                                </div>
                              )}
                            </div>

                            <div className="small muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.topic ? `مبحث: ${task.topic}` : 'برای نوشتن سرفصل و نکات کلیک کنید...'}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Floating Session Detail Popover / Modal for Deep Content */}
      {selectedSession && (
        <Modal
          title={`جزئیات پارت مطالعاتی — ${tpl[selectedSession.dayIdx]?.label}`}
          onClose={() => setSelectedSession(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>نام درس:</label>
              <input
                className="input"
                value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.subject || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'subject', e.target.value)}
                placeholder="نام درس (مثلا فیزیک دوازدهم)"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>روش مطالعه:</label>
                <select
                  className="input"
                  value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.study_method || 'study'}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'study_method', e.target.value)}
                >
                  {STUDY_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>مدت زمان (دقیقه):</label>
                <input
                  type="number"
                  step="15"
                  min="15"
                  max="360"
                  className="input"
                  value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.duration_minutes || 90}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'duration_minutes', parseInt(e.target.value) || 90)}
                />
              </div>
            </div>

            {(tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.study_method === 'test' ||
              tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.study_method === 'essay') && (
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>تعداد تست / سوال تعیین شده:</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="input"
                  placeholder="مثلا 35 تست"
                  value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.question_count || ''}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'question_count', parseInt(e.target.value) || null)}
                />
              </div>
            )}

            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>سرفصل و مباحث جزئی (فضای گسترده برای درج جزییات):</label>
              <textarea
                className="input"
                rows={4}
                placeholder="سرفصل دقیق، صفحات کتاب، فرمول‌ها یا تیپ تست‌های مد نظر را با جزئیات بنویسید..."
                value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.topic || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'topic', e.target.value)}
              />
            </div>

            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>نکات مشاوره‌ای و تکنیک‌های اختصاصی مطالعه:</label>
              <textarea
                className="input"
                rows={3}
                placeholder="تکنیک‌های تست‌زنی، منبع تست، خلاصه‌نویسی حین مطالعه، تایم‌گیری..."
                value={tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx]?.notes || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'notes', e.target.value)}
              />
            </div>
          </div>

          <div className="flex mt" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button
              className="btn ghost sm danger"
              onClick={() => {
                delTask(selectedSession.dayIdx, selectedSession.taskIdx)
                setSelectedSession(null)
              }}
            >
              حذف این پارت
            </button>
            <button className="btn sm" onClick={() => setSelectedSession(null)}>
              ذخیره و بستن
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
