import { useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Modal } from '../ui.jsx'

const PERSIAN_7_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
]

const ENGLISH_7_DAYS = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

const STANDARD_SUBJECTS_FA = [
  'ریاضی', 'زیست‌شناسی', 'فیزیک', 'شیمی', 'ادبیات فارسی',
  'زبان انگلیسی', 'عربی', 'دین و زندگی', 'هندسه', 'گسسته',
  'زمین‌شناسی', 'حسابان', 'اقتصاد', 'روان‌شناسی', 'جامعه‌شناسی'
]

const STANDARD_SUBJECTS_EN = [
  'Mathematics', 'Biology', 'Physics', 'Chemistry', 'Literature',
  'English', 'Arabic', 'Theology', 'Geometry', 'Discrete Math',
  'Geology', 'Calculus', 'Economics', 'Psychology', 'Sociology'
]

const STUDY_METHODS_CFG = [
  { id: 'test', label_fa: 'تست‌زنی', label_en: 'Test / MCQ', icon: '🎯', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.16)', hasCount: true },
  { id: 'essay', label_fa: 'تشریحی', label_en: 'Essay / Descriptive', icon: '✍️', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.16)', hasCount: true },
  { id: 'study', label_fa: 'مطالعه مفهومی', label_en: 'Concept Study', icon: '📖', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', hasCount: false },
  { id: 'review', label_fa: 'مرور و جمع‌بندی', label_en: 'Review & Summary', icon: '🔄', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', hasCount: false },
]

export default function PlanSection({ studentId, plan, capacityAlerts = {}, onChanged }) {
  const { t } = useLang()
  const isEn = getLang() === 'en'

  const [tpl, setTpl] = useState([])
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedSession, setSelectedSession] = useState(null) // { dayIdx, taskIdx }
  const [draggedItem, setDraggedItem] = useState(null) // { type: 'subject' | 'method', val: string }
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = prev, +1 = next
  const [aiDraftInfo, setAiDraftInfo] = useState(null)

  const subjectsList = isEn ? STANDARD_SUBJECTS_EN : STANDARD_SUBJECTS_FA
  const dayNames = isEn ? ENGLISH_7_DAYS : PERSIAN_7_DAYS

  // Helper to compute date strings for each day of the week with weekOffset
  const getWeekDates = (offset = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sun, 1 = Mon, ... 6 = Sat
    const diffToSat = (dayOfWeek + 1) % 7 // Saturday diff
    const sat = new Date(today)
    sat.setDate(today.getDate() - diffToSat + (offset * 7))

    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sat)
      d.setDate(sat.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  // Always ensure all 7 days of the week exist in template
  const build7DaysFromData = (weeklyList, offset = 0) => {
    const list = Array.isArray(weeklyList) ? weeklyList : []
    const weekDates = getWeekDates(offset)

    return dayNames.map((dayName, idx) => {
      const found = list.find((d) => (d.label || d.day || '').trim().toLowerCase() === dayName.toLowerCase() || (d.label || d.day || '').trim() === PERSIAN_7_DAYS[idx])
      const rawTasks = found ? (found.tasks || found.sessions || []) : (list[idx]?.tasks || list[idx]?.sessions || [])

      return {
        label: dayName,
        date_str: weekDates[idx],
        tasks: rawTasks.map((x, j) => ({
          id: x.id || `sess_${idx}_${j}_${Date.now()}`,
          subject: x.subject || '',
          topic: x.topic || x.focus || '',
          duration_minutes: x.duration_minutes || (x.hours ? Math.round(x.hours * 60) : 90),
          study_method: x.study_method || 'study',
          question_count: x.question_count || (x.study_method === 'test' ? 30 : x.study_method === 'essay' ? 15 : null),
          reason: x.reason || '',
          notes: x.notes || '',
        })),
      }
    })
  }

  const loadWeekPlan = async (offset = weekOffset) => {
    setMsg('')
    setErr('')
    setLoadingTpl(true)
    const weekDates = getWeekDates(offset)
    const targetSat = weekDates[0]

    try {
      const r = await api(`/api/mentor/students/${studentId}?week_start=${targetSat}`)
      const weekPlan = r.plan || {}
      if (weekPlan.is_ai_draft) {
        setAiDraftInfo({
          summary: weekPlan.ai_strategy || weekPlan.summary || 'پیش‌نویس تولید شده توسط هوش مصنوعی',
          strategy: weekPlan.ai_strategy,
        })
      } else {
        setAiDraftInfo(null)
      }

      if (weekPlan.weekly && weekPlan.weekly.length > 0) {
        setTpl(build7DaysFromData(weekPlan.weekly, offset))
      } else {
        // Empty week
        setTpl(build7DaysFromData([], offset))
      }
    } catch {
      setTpl(build7DaysFromData([], offset))
    } finally {
      setLoadingTpl(false)
    }
  }

  useEffect(() => {
    loadWeekPlan(weekOffset)
  }, [studentId, weekOffset, isEn]) // eslint-disable-line react-hooks/exhaustive-deps

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
      subject: defaults.subject || (isEn ? 'New Subject' : 'درس جدید'),
      topic: defaults.topic || '',
      duration_minutes: defaults.duration_minutes || 90,
      study_method: defaults.study_method || 'study',
      question_count: defaults.question_count || (defaults.study_method === 'test' ? 30 : null),
      notes: defaults.notes || '',
    }
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: [...d.tasks, newTask] } : d
    ))
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
    const weekDates = getWeekDates(weekOffset)
    try {
      await api(`/api/mentor/students/${studentId}/plan`, {
        method: 'PUT',
        body: {
          days: tpl,
          week_start: weekDates[0],
        },
      })
      setMsg(t('planSent'))
      setAiDraftInfo(null)
      if (onChanged) onChanged()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const generateAiDraft = async () => {
    setGeneratingAi(true)
    setMsg('')
    setErr('')
    const weekDates = getWeekDates(weekOffset)
    try {
      const res = await api(`/api/mentor/students/${studentId}/generate-ai-plan?week_start=${weekDates[0]}`, {
        method: 'POST',
      })
      if (res.days) {
        setTpl(build7DaysFromData(res.days, weekOffset))
        setAiDraftInfo({
          summary: res.summary || 'پیش‌نویس برنامه هوشمند تولید شده بر اساس سوابق و سبک مشاور',
          strategy: res.ai_strategy,
        })
        setMsg('🤖 پیش‌نویس برنامه هوشمند برای این هفته توسط هوش مصنوعی آماده شد. می‌توانید تغییرات دلخواه را اعمال و سپس تایید نمایید.')
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setGeneratingAi(false)
    }
  }

  const formatDateLabel = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso + 'T00:00:00')
      return isEn ? d.toLocaleDateString('en-GB') : d.toLocaleDateString('fa-IR')
    } catch { return iso }
  }

  const curDates = getWeekDates(weekOffset)
  const weekRangeStr = `${formatDateLabel(curDates[0])} — ${formatDateLabel(curDates[6])}`

  return (
    <div className="mentor-calendar-planner">
      {msg && <div className="ok-box mb" style={{ borderRadius: 14 }}>{msg}</div>}
      {err && <div className="error-box mb" style={{ borderRadius: 14 }}>{err}</div>}

      {/* AI Draft Proposal Notice for Mentor */}
      {aiDraftInfo && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
            border: '1.5px solid var(--primary)',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <b style={{ color: 'var(--primary)', fontSize: 14.5 }}>پیش‌نویس پیشنهادی هوش مصنوعی (در انتظار تایید مشاور):</b>
              <div className="small" style={{ color: 'var(--ink)', marginTop: 2 }}>
                {aiDraftInfo.summary} {aiDraftInfo.strategy ? `· راهبرد: ${aiDraftInfo.strategy}` : ''}
              </div>
              <div className="small muted" style={{ fontSize: 11, marginTop: 2 }}>
                🔒 دانش‌آموز تا قبل از تایید نهایی شما به این برنامه دسترسی ندارد.
              </div>
            </div>
          </div>
          <button
            className="btn"
            style={{ borderRadius: 10, padding: '8px 18px', fontSize: 13 }}
            onClick={sendPlan}
            disabled={saving}
          >
            {saving ? '…' : '✅ تایید و ارسال برنامه برای دانش‌آموز'}
          </button>
        </div>
      )}

      {/* ── DRAG & DROP TOOLKITS PALETTE ── */}
      <div
        className="planner-toolkit-box"
        style={{
          borderRadius: 20,
          boxShadow: 'var(--shadow)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛠️</span>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>{t('studyToolkitsTitle')}</b>
              <div className="small muted">{t('studyToolkitsHint')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn ghost"
              style={{ borderRadius: 12, padding: '9px 16px', fontSize: 13, border: '1.5px solid var(--primary)', color: 'var(--primary)' }}
              disabled={generatingAi || saving}
              onClick={generateAiDraft}
              title="تولید خودکار پیش‌نویس برنامه هفته توسط AI بر اساس کارنامه و سبک قبلی شما"
            >
              {generatingAi ? '🤖 در حال تدوین...' : '🤖 تولید پیش‌نویس هوشمند با AI'}
            </button>
            <button
              className="btn"
              style={{ borderRadius: 12, padding: '9px 20px', fontSize: 13.5 }}
              disabled={saving}
              onClick={sendPlan}
            >
              {saving ? '…' : `💾 ${t('sendPlan')}`}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {/* 1. Subjects Palette */}
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 12, border: '1px solid var(--line)' }}>
            <b className="small" style={{ color: 'var(--primary)', display: 'block', marginBottom: 8, fontWeight: 800 }}>
              {t('subjectsPalette')}
            </b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {subjectsList.map((subj) => (
                <div
                  key={subj}
                  draggable
                  onDragStart={() => setDraggedItem({ type: 'subject', val: subj })}
                  className="planner-toolkit-item"
                >
                  📚 {subj}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  placeholder={t('customSubjectPlaceholder')}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  style={{
                    width: 110,
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                  }}
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
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Study Methods Palette */}
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 12, border: '1px solid var(--line)' }}>
            <b className="small" style={{ color: 'var(--primary)', display: 'block', marginBottom: 8, fontWeight: 800 }}>
              {t('methodsPalette')}
            </b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STUDY_METHODS_CFG.map((m) => {
                const label = isEn ? m.label_en : m.label_fa
                return (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={() => setDraggedItem({ type: 'method', val: m.id })}
                    className="planner-toolkit-item"
                    style={{
                      background: m.bg,
                      color: m.color,
                      border: `1.5px solid ${m.color}`,
                    }}
                  >
                    {m.icon} {label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── WEEK NAVIGATION CONTROLS (هفته قبل / بعد) ── */}
      <div
        className="card"
        style={{
          borderRadius: 16,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

      {/* ── COMPLETE 7-DAY WEEKLY CALENDAR GRID ── */}
      {loadingTpl ? (
        <div className="empty">…</div>
      ) : (
        <div
          className="calendar-week-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
            width: '100%',
          }}
        >
          {tpl.map((d, di) => {
            const totalMin = d.tasks.reduce((sum, tk) => sum + (parseInt(tk.duration_minutes) || 0), 0)
            const dayAlert = capacityAlerts[d.date_str]
            const isOver = dayAlert && totalMin > (dayAlert.max_hours * 60)

            return (
              <div
                key={d.label || di}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnDay(di)}
                className={`calendar-day-col ${isOver ? 'day-capacity-alert' : ''}`}
                style={{
                  background: isOver ? 'rgba(234, 179, 8, 0.14)' : 'var(--card)',
                  border: isOver ? '2px solid #f59e0b' : '1.5px solid var(--line)',
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: isOver ? '0 8px 24px rgba(245, 158, 11, 0.22)' : 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Day Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <b style={{ fontSize: 15, color: 'var(--ink)' }}>{d.label}</b>
                    <span className="small muted" style={{ display: 'block', fontSize: 11 }}>
                      {formatDateLabel(d.date_str)} · {fa(Math.round(totalMin / 60 * 10) / 10)} {t('hoursUnit')}
                    </span>
                  </div>
                  <button
                    className="btn ghost sm"
                    style={{ borderRadius: 8, fontSize: 11.5, padding: '3px 8px' }}
                    type="button"
                    onClick={() => addTask(di)}
                  >
                    + {t('addSession')}
                  </button>
                </div>

                {/* Capacity Alert Banner */}
                {isOver && (
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
                    {t('capacityWarning')} {fa(Math.round(totalMin / 60 * 10) / 10)} {t('hoursUnit')} (سقف: {fa(dayAlert.max_hours)} {t('hoursUnit')})
                  </div>
                )}

                {/* Day Tasks List — SINGLE LINE COMPACT ITEMS WITHOUT VERBOSE TEXTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 110 }}>
                  {d.tasks.length === 0 ? (
                    <div
                      className="empty small muted"
                      style={{
                        padding: '22px 10px',
                        border: '1.5px dashed var(--line)',
                        borderRadius: 12,
                        background: 'var(--tint-hover)',
                        fontSize: 12,
                      }}
                    >
                      {t('dropHereHint')}
                    </div>
                  ) : (
                    d.tasks.map((task, ti) => {
                      const mCfg = STUDY_METHODS_CFG.find((m) => m.id === task.study_method) || STUDY_METHODS_CFG[2]
                      const mLabel = isEn ? mCfg.label_en : mCfg.label_fa
                      return (
                        <div
                          key={task.id || ti}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation()
                            handleDropOnTask(di, ti)
                          }}
                          className="planner-task-card"
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--line)',
                            borderRadius: 10,
                            padding: '8px 10px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                          }}
                          onClick={() => setSelectedSession({ dayIdx: di, taskIdx: ti })}
                          title={t('topicNotesPlaceholder')}
                        >
                          {/* Single Line Content: Subject, Method Tag, Duration, Delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <b style={{ fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.subject || '—'}
                            </b>
                            <span
                              style={{
                                fontSize: 10.5,
                                background: mCfg.bg,
                                color: mCfg.color,
                                padding: '2px 6px',
                                borderRadius: 6,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {mCfg.icon} {mLabel}
                            </span>
                            <span
                              className="small muted"
                              style={{
                                fontSize: 10.5,
                                background: 'var(--tint-fill)',
                                padding: '2px 6px',
                                borderRadius: 6,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              ⏱️ {fa(task.duration_minutes)} {t('durationMin')}
                            </span>
                            {task.question_count && (
                              <span
                                className="small"
                                style={{
                                  fontSize: 10.5,
                                  background: 'var(--tint-fill)',
                                  color: 'var(--primary)',
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                📝 {fa(task.question_count)}
                              </span>
                            )}
                          </div>

                          <button
                            className="btn ghost sm danger"
                            style={{
                              padding: '2px 6px',
                              fontSize: 11,
                              borderRadius: 6,
                              flexShrink: 0,
                              lineHeight: 1,
                            }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              delTask(di, ti)
                            }}
                            title={t('removeSession')}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Session Detail Popover / Modal for Deep Content Notes */}
      {selectedSession && tpl[selectedSession.dayIdx]?.tasks[selectedSession.taskIdx] && (
        <Modal
          title={`📖 ${t('editLesson')} — ${tpl[selectedSession.dayIdx]?.label}`}
          onClose={() => setSelectedSession(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                {t('lessonName')}:
              </label>
              <input
                className="input"
                value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].subject || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'subject', e.target.value)}
                placeholder="مثلا شیمی یا فیزیک..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {t('typeShort')}:
                </label>
                <select
                  className="input"
                  value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].study_method || 'study'}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'study_method', e.target.value)}
                >
                  {STUDY_METHODS_CFG.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} {isEn ? m.label_en : m.label_fa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {t('sessionHours')} ({t('durationMin')}):
                </label>
                <input
                  type="number"
                  step="15"
                  min="15"
                  max="360"
                  className="input"
                  value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].duration_minutes || 90}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'duration_minutes', parseInt(e.target.value) || 90)}
                />
              </div>
            </div>

            {(tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].study_method === 'test' ||
              tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].study_method === 'essay') && (
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {t('questionsCount')}:
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="input"
                  placeholder="مثلا 40"
                  value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].question_count || ''}
                  onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'question_count', parseInt(e.target.value) || null)}
                />
              </div>
            )}

            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                {t('sessionFocus')} (سرفصل و مباحث):
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="سرفصل دقیق، صفحات کتاب، فرمول‌ها یا تیپ تست‌های مد نظر..."
                value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].topic || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'topic', e.target.value)}
              />
            </div>

            <div>
              <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                نکات اختصاصی و توصیه‌های مشاور:
              </label>
              <textarea
                className="input"
                rows={2}
                placeholder="تکنیک‌های تست‌زنی، منبع، تایم‌گیری..."
                value={tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].notes || ''}
                onChange={(e) => updTask(selectedSession.dayIdx, selectedSession.taskIdx, 'notes', e.target.value)}
              />
            </div>

            {tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].reason && (
              <div style={{ background: 'var(--tint-fill)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--line)' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: 'var(--primary)' }}>
                  🧠 {isEn ? 'AI Strategic Rationale:' : 'علت و تحلیل هوش مصنوعی برای این جلسه:'}
                </label>
                <div className="small" style={{ color: 'var(--ink)', lineHeight: 1.6 }}>
                  {tpl[selectedSession.dayIdx].tasks[selectedSession.taskIdx].reason}
                </div>
              </div>
            )}
          </div>

          <div className="flex mt" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button
              className="btn ghost sm danger"
              onClick={() => {
                delTask(selectedSession.dayIdx, selectedSession.taskIdx)
                setSelectedSession(null)
              }}
            >
              {t('removeSession')}
            </button>
            <button className="btn sm" onClick={() => setSelectedSession(null)}>
              {t('save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
