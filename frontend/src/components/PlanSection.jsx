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
  { id: 'test', label: 'تست‌زنی', icon: '🎯', color: '#6366f1', bg: '#e0e7ff', hasCount: true },
  { id: 'essay', label: 'تشریحی', icon: '✍️', color: '#0ea5e9', bg: '#e0f2fe', hasCount: true },
  { id: 'study', label: 'مطالعه مفهومی', icon: '📖', color: '#10b981', bg: '#d1fae5', hasCount: false },
  { id: 'review', label: 'مرور و جمع‌بندی', icon: '🔄', color: '#f59e0b', bg: '#fef3c7', hasCount: false },
]

export default function PlanSection({ studentId, plan, capacityAlerts = {}, onChanged }) {
  const { t } = useLang()
  const [edit, setEdit] = useState(false)
  const [tpl, setTpl] = useState(null)
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedSession, setSelectedSession] = useState(null) // { dayIdx, taskIdx, task }
  const [draggedItem, setDraggedItem] = useState(null) // { type: 'subject' | 'method', val: string }

  const comp = plan?.completion || {}
  const planColor = comp.color === 'ok' ? '#22c55e' : comp.color === 'mid' ? '#eab308' : comp.color === 'low' ? '#ef4444' : '#94a3b8'

  const openEditor = async () => {
    setEdit(true)
    setMsg('')
    setErr('')
    if (!tpl) {
      setLoadingTpl(true)
      try {
        if (plan?.source === 'mentor' && plan?.weekly?.length) {
          setTpl(plan.weekly.map((d) => ({
            label: d.label,
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
  }

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

  const send = async () => {
    setSaving(true)
    setMsg('')
    setErr('')
    try {
      await api(`/api/mentor/students/${studentId}/plan`, { method: 'PUT', body: { days: tpl } })
      setEdit(false)
      setMsg('برنامه مطالعاتی با موفقیت برای دانش‌آموز ثبت و ارسال شد.')
      if (onChanged) onChanged()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ borderRadius: 18, padding: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <div className="flex wrap between items-center">
        <div className="flex wrap" style={{ gap: 10, alignItems: 'center' }}>
          <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5', fontSize: 13, borderRadius: 10, padding: '4px 10px' }}>
            {plan?.source === 'mentor' ? `🧑‍🏫 ${t('planSourceMentor')}` : `🤖 ${t('planSourceAi')}`}
          </span>
          {comp.pct != null && (
            <span className="badge" style={{ background: planColor + '22', color: planColor, fontSize: 13, borderRadius: 10, padding: '4px 10px' }}>
              {t('planStudentStatus')}: {fa(comp.pct)}٪
            </span>
          )}
          {plan?.generated_at && (
            <span className="small muted">تاریخ بروزرسانی: {fa(plan.generated_at)}</span>
          )}
        </div>
        {!edit && (
          <button className="btn sm" style={{ borderRadius: 10 }} onClick={openEditor}>
            {plan?.exists ? '✏️ ویرایش پیشرفته برنامه مطالعاتی' : '📤 تنظیم و ارسال برنامه جدید'}
          </button>
        )}
      </div>

      {msg && <div className="ok-box mt" style={{ borderRadius: 10 }}>{msg}</div>}
      {err && <div className="error-box mt" style={{ borderRadius: 10 }}>{err}</div>}

      {!edit && plan?.weekly?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {plan.weekly.map((d, di) => {
              const totalMin = (d.tasks || []).reduce((acc, tk) => acc + (tk.duration_minutes || (tk.hours ? tk.hours * 60 : 90)), 0)
              const isOver = d.is_over_capacity
              return (
                <div
                  key={di}
                  style={{
                    border: isOver ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    background: isOver ? '#fffbeb' : '#f8fafc',
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <b style={{ fontSize: 15 }}>{d.label}</b>
                    <span className="small muted">⏱️ {fa(Math.round(totalMin / 60 * 10) / 10)} ساعت</span>
                  </div>
                  {isOver && (
                    <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '4px 8px', fontSize: 11, marginBottom: 8 }}>
                      ⚠️ تجاوز از سقف مجاز دانش‌آموز ({fa(d.capacity_limit?.max_hours)} ساعت)
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(d.tasks || []).map((t, ti) => (
                      <div key={ti} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <b>{t.subject}</b>
                          <span className="small muted">{fa(t.duration_minutes || (t.hours * 60))} دقیقه</span>
                        </div>
                        {t.topic && <div className="small muted" style={{ marginTop: 2 }}>{t.topic}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {edit && (
        <div style={{ marginTop: 20 }}>
          {loadingTpl && <div className="empty">در حال آماده‌سازی قالب برنامه...</div>}
          {tpl && (
            <div>
              {/* Drag and Drop Toolkits Bar */}
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <b style={{ fontSize: 14, color: '#334155' }}>🛠️ جعبه‌ابزار درگ و دراپ دروس و متدهای مطالعه</b>
                  <span className="small muted">آیتم‌ها را بکشید و روی روز یا جلسه مورد نظر رها کنید</span>
                </div>

                {/* 1. Subjects Palette */}
                <div style={{ marginBottom: 14 }}>
                  <div className="small muted" style={{ marginBottom: 6, fontWeight: 600 }}>۱. پالت دروس:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STANDARD_SUBJECTS.map((subj) => (
                      <div
                        key={subj}
                        draggable
                        onDragStart={() => setDraggedItem({ type: 'subject', val: subj })}
                        style={{
                          background: '#fff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: 10,
                          padding: '5px 10px',
                          fontSize: 12,
                          cursor: 'grab',
                          userSelect: 'none',
                          fontWeight: 500,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
                        style={{ width: 100, fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid #cbd5e1' }}
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
                <div>
                  <div className="small muted" style={{ marginBottom: 6, fontWeight: 600 }}>۲. پالت انواع مطالعه (چهارگانه):</div>
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
                          borderRadius: 10,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'grab',
                          userSelect: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {m.icon} {m.label} {m.hasCount ? '(شامل تعداد سوال)' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7 Days Grid with Drag Target & Warning Highlight */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
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
                        background: isOver ? '#fffbeb' : '#ffffff',
                        border: isOver ? '2px solid #f59e0b' : '1.5px dashed #cbd5e1',
                        borderRadius: 16,
                        padding: 14,
                        boxShadow: isOver ? '0 4px 16px rgba(245, 158, 11, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div>
                          <b style={{ fontSize: 16, color: '#1e293b' }}>{d.label}</b>
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
                        <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '6px 10px', fontSize: 11, marginBottom: 10, fontWeight: 500 }}>
                          ⚠️ هشدار ظرفیت: این روز {fa(Math.round(totalMin / 60 * 10) / 10)} ساعت تعیین شده اما سقف اعلامی دانش‌آموز {fa(dayAlert.max_hours)} ساعت است.
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 80 }}>
                        {d.tasks.map((task, ti) => {
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
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '10px 12px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedSession({ dayIdx: di, taskIdx: ti, task })}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <b style={{ fontSize: 14 }}>{task.subject || 'بدون درس'}</b>
                                  <span style={{ fontSize: 11, background: mCfg.bg, color: mCfg.color, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
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
                                    style={{ width: 64, padding: '3px 6px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
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
                                      style={{ width: 64, padding: '3px 6px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                    <span className="small muted">سوال</span>
                                  </div>
                                )}
                              </div>

                              <div className="small muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.topic ? `مبحث: ${task.topic}` : 'برای ثبت سرفصل و نکات کلیک کنید...'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Actions */}
              <div className="flex mt" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <button className="btn ghost" style={{ borderRadius: 10 }} onClick={() => setEdit(false)}>
                  انصراف
                </button>
                <button className="btn" style={{ borderRadius: 10, padding: '10px 24px', fontSize: 15 }} disabled={saving} onClick={send}>
                  {saving ? 'در حال ثبت و ارسال...' : '💾 تایید و ارسال برنامه هفتگی به دانش‌آموز'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
    </Card>
  )
}
