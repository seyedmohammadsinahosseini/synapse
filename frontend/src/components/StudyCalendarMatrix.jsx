import { useState, useEffect, useRef, useMemo } from 'react'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'
import { soundEngine } from '../utils/audioSynth.js'

const PRIORITIES = [
  { id: 'high', label_fa: 'مهم و سخت', label_en: 'High / Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', flag: '🚩' },
  { id: 'medium', label_fa: 'معمولی و متوسط', label_en: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', flag: '🚩' },
  { id: 'low', label_fa: 'عادی یا ساده', label_en: 'Low / Simple', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', flag: '🚩' },
  { id: 'none', label_fa: 'هیچ / خنثی', label_en: 'None', color: '#94a3b8', bg: 'transparent', flag: '🏳️' },
]

const METHODS = [
  { id: 'test', label_fa: 'تست‌زنی', label_en: 'Testing / MCQ', icon: '🎯', color: '#6366f1' },
  { id: 'study', label_fa: 'مطالعه مفهومی', label_en: 'Deep Concept', icon: '📖', color: '#10b981' },
  { id: 'essay', label_fa: 'حل تمرین تشریحی', label_en: 'Essay Exercise', icon: '✍️', color: '#0ea5e9' },
  { id: 'review', label_fa: 'مرور و جمع‌بندی', label_en: 'Review & Summary', icon: '🔄', color: '#f59e0b' },
]

const STANDARD_SUBJECTS = [
  'زیست‌شناسی', 'شیمی', 'ریاضی', 'فیزیک', 'ادبیات فارسی',
  'عربی', 'زبان انگلیسی', 'دین و زندگی', 'هندسه', 'حسابان', 'زمین‌شناسی'
]

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']
const ENGLISH_WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

/**
 * Generates 30 continuous calendar days (1 full month horizon)
 * Integrates external tasks by matching date_str or day index
 */
function build30DayHorizon(incomingDays = [], lang = 'fa') {
  const isEn = lang === 'en'
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)

  // Start 5 days before today, span 30 days
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 5)

  // Map of tasks by date_str or day label
  const taskMap = {}
  incomingDays.forEach((d, idx) => {
    if (d.date_str) {
      taskMap[d.date_str] = d.tasks || []
    }
  })

  const generated = []
  for (let i = 0; i < 30; i++) {
    const cur = new Date(startDate)
    cur.setDate(startDate.getDate() + i)
    const iso = cur.toISOString().slice(0, 10)
    const isToday = iso === todayIso

    // Weekday in Iranian calendar (0 = Saturday, 6 = Friday)
    const jsDay = cur.getDay() // 0 = Sunday, 6 = Saturday
    const irDayIdx = (jsDay + 1) % 7 // Saturday -> 0, Sunday -> 1, ...

    let jalaliDateStr = ''
    try {
      jalaliDateStr = new Intl.DateTimeFormat(isEn ? 'en-US' : 'fa-IR', {
        month: 'short',
        day: 'numeric',
      }).format(cur)
    } catch (_) {
      jalaliDateStr = iso.slice(5)
    }

    const weekdayLabel = isEn ? ENGLISH_WEEKDAYS[irDayIdx] : PERSIAN_WEEKDAYS[irDayIdx]

    // Find any tasks already assigned for this date or matching day index
    let dayTasks = taskMap[iso]
    if (!dayTasks && incomingDays.length > 0) {
      const matchedIncoming = incomingDays.find((d) => d.date_str === iso)
      if (matchedIncoming) dayTasks = matchedIncoming.tasks
      else if (incomingDays.length === 7 && incomingDays[irDayIdx]?.tasks) {
        // Fallback matching for 7-day cyclical template
        dayTasks = incomingDays[irDayIdx].tasks
      }
    }

    generated.push({
      date_str: iso,
      day_index: i,
      ir_day_index: irDayIdx,
      label: weekdayLabel,
      jalali_str: jalaliDateStr,
      is_today: isToday,
      tasks: dayTasks || [],
    })
  }

  return generated
}

export default function StudyCalendarMatrix({
  mode = 'student', // 'student' | 'mentor'
  days = [],
  capacityAlerts = {},
  onSavePlan,
  onTickTask,
  onDeclareCapacity,
  onStartPomodoro,
  weekRangeStr = '',
}) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const isMentor = mode === 'mentor'

  // Build 30 continuous days
  const initial30Days = useMemo(() => build30DayHorizon(days, lang), [days, lang])
  const [calendarDays, setCalendarDays] = useState(initial30Days)

  useEffect(() => {
    setCalendarDays(build30DayHorizon(days, lang))
  }, [days, lang])

  const [filterSubject, setFilterSubject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoSortByPriority, setAutoSortByPriority] = useState(true)

  // Drag and Drop (Mentor Only)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverDayIndex, setDragOverDayIndex] = useState(null)

  // Modals & Popovers
  const [viewingTask, setViewingTask] = useState(null) // Task Detail Modal (descriptions revealed on click only)
  const [editorState, setEditorState] = useState({
    isOpen: false,
    dayIndex: 0,
    taskIndex: null,
    subject: 'زیست‌شناسی',
    topic: '',
    notes: '',
    duration_minutes: 90,
    study_method: 'study',
    priority: 'medium',
    question_count: 30,
  })
  const [savingPlan, setSavingPlan] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // ── Smooth Horizontal Drag-to-Scroll Mechanism ──
  const matrixScrollRef = useRef(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const [isGrabbing, setIsGrabbing] = useState(false)

  const handleMouseDown = (e) => {
    if (e.target.closest('button, input, select, textarea, .no-drag, [draggable="true"]')) return
    if (!matrixScrollRef.current) return
    isDraggingRef.current = true
    setIsGrabbing(true)
    startXRef.current = e.pageX - matrixScrollRef.current.offsetLeft
    scrollLeftRef.current = matrixScrollRef.current.scrollLeft
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !matrixScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - matrixScrollRef.current.offsetLeft
    const walk = (x - startXRef.current) * 1.5
    matrixScrollRef.current.scrollLeft = scrollLeftRef.current - walk
  }

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false
    setIsGrabbing(false)
  }

  const scrollToToday = () => {
    if (!matrixScrollRef.current) return
    const todayCol = matrixScrollRef.current.querySelector('.is-today-col')
    if (todayCol) {
      todayCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  const scrollByOffset = (direction) => {
    if (!matrixScrollRef.current) return
    const scrollAmount = (direction === 'left' ? -1 : 1) * 320 * 2
    matrixScrollRef.current.scrollBy({ left: isEn ? scrollAmount : -scrollAmount, behavior: 'smooth' })
  }

  // Scroll to today on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday()
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  // Drag and drop handlers (mentor only)
  const handleDragStart = (e, dayIndex, taskIndex, task) => {
    if (!isMentor) return
    setDraggedItem({ dayIndex, taskIndex, task })
    e.dataTransfer.setData('text/plain', JSON.stringify({ dayIndex, taskIndex }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, dayIndex) => {
    if (!isMentor) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverDayIndex !== dayIndex) {
      setDragOverDayIndex(dayIndex)
    }
  }

  const handleDragLeave = () => {
    setDragOverDayIndex(null)
  }

  const handleDrop = (e, targetDayIndex) => {
    if (!isMentor || !draggedItem) return
    e.preventDefault()
    setDragOverDayIndex(null)

    const sourceDayIndex = draggedItem.dayIndex
    const sourceTaskIndex = draggedItem.taskIndex

    if (sourceDayIndex === targetDayIndex) {
      setDraggedItem(null)
      return
    }

    const updated = [...calendarDays]
    const sourceTasks = [...(updated[sourceDayIndex].tasks || [])]
    const targetTasks = [...(updated[targetDayIndex].tasks || [])]

    const [movedTask] = sourceTasks.splice(sourceTaskIndex, 1)
    targetTasks.push(movedTask)

    updated[sourceDayIndex] = { ...updated[sourceDayIndex], tasks: sourceTasks }
    updated[targetDayIndex] = { ...updated[targetDayIndex], tasks: targetTasks }

    setCalendarDays(updated)
    setDraggedItem(null)
  }

  // Open Task Creator (Mentor Only)
  const handleOpenAddModal = (dayIndex) => {
    setEditorState({
      isOpen: true,
      dayIndex,
      taskIndex: null,
      subject: 'زیست‌شناسی',
      topic: '',
      notes: '',
      duration_minutes: 90,
      study_method: 'study',
      priority: 'medium',
      question_count: 30,
    })
  }

  // Open Task Editor (Mentor Only)
  const handleOpenEditModal = (dayIndex, taskIndex, task) => {
    setEditorState({
      isOpen: true,
      dayIndex,
      taskIndex,
      subject: task.subject || 'زیست‌شناسی',
      topic: task.topic || '',
      notes: task.notes || '',
      duration_minutes: task.duration_minutes || 90,
      study_method: task.study_method || 'study',
      priority: task.priority || 'medium',
      question_count: task.question_count || 30,
    })
  }

  // Save Task (Mentor Only)
  const handleSaveEditor = (e) => {
    e.preventDefault()
    if (!editorState.topic.trim()) return

    const updated = [...calendarDays]
    const dayTasks = [...(updated[editorState.dayIndex].tasks || [])]

    const taskObj = {
      id: editorState.taskIndex != null ? dayTasks[editorState.taskIndex]?.id || `task_${Date.now()}` : `task_${Date.now()}`,
      subject: editorState.subject,
      topic: editorState.topic.trim(),
      notes: editorState.notes.trim(),
      duration_minutes: Number(editorState.duration_minutes) || 90,
      study_method: editorState.study_method,
      priority: editorState.priority,
      question_count: Number(editorState.question_count) || null,
      status: editorState.taskIndex != null ? dayTasks[editorState.taskIndex]?.status || '' : '',
    }

    if (editorState.taskIndex != null) {
      dayTasks[editorState.taskIndex] = taskObj
    } else {
      dayTasks.push(taskObj)
    }

    updated[editorState.dayIndex] = { ...updated[editorState.dayIndex], tasks: dayTasks }
    setCalendarDays(updated)
    setEditorState((prev) => ({ ...prev, isOpen: false }))
  }

  // Delete Task (Mentor Only)
  const handleDeleteTask = (dayIndex, taskIndex, e) => {
    e.stopPropagation()
    const updated = [...calendarDays]
    const dayTasks = [...(updated[dayIndex].tasks || [])]
    dayTasks.splice(taskIndex, 1)
    updated[dayIndex] = { ...updated[dayIndex], tasks: dayTasks }
    setCalendarDays(updated)
  }

  // Save Plan (Mentor Only)
  const handlePublishPlan = async () => {
    if (!onSavePlan) return
    setSavingPlan(true)
    setSaveSuccessMsg('')
    try {
      await onSavePlan(calendarDays)
      setSaveSuccessMsg(isEn ? 'Monthly Plan saved and published successfully!' : 'برنامه ۳۰ روزه با موفقیت ثبت و ارسال شد!')
      setTimeout(() => setSaveSuccessMsg(''), 4000)
    } finally {
      setSavingPlan(false)
    }
  }

  const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 }

  const getFilteredTasks = (tasksList = []) => {
    let filtered = [...tasksList]

    if (filterSubject !== 'all') {
      filtered = filtered.filter((t) => t.subject === filterSubject)
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((t) => t.priority === filterPriority)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          (t.topic && t.topic.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      )
    }

    return filtered.sort((a, b) => {
      const aDone = a.status === 'done'
      const bDone = b.status === 'done'
      if (aDone !== bDone) return aDone ? 1 : -1
      if (autoSortByPriority) {
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
        if (pDiff !== 0) return pDiff
      }
      return 0
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Calendar Toolbar & 30-Day Drag Controls ── */}
      <div
        className="card"
        style={{
          borderRadius: 20,
          padding: '16px 20px',
          marginBottom: 18,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* 30-Day Quick Navigation & Scroll Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn ghost sm"
              style={{ borderRadius: 10, padding: '7px 12px', fontWeight: 800 }}
              onClick={() => scrollByOffset('right')}
              title={isEn ? 'Scroll earlier days' : 'حرکت به روزهای قبل'}
            >
              ◀ {isEn ? 'Earlier' : 'روزهای قبل'}
            </button>
            <button
              type="button"
              className="btn primary sm"
              style={{ borderRadius: 10, padding: '7px 16px', fontWeight: 800 }}
              onClick={scrollToToday}
            >
              📍 {isEn ? 'Go to Today' : 'برو به امروز'}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              style={{ borderRadius: 10, padding: '7px 12px', fontWeight: 800 }}
              onClick={() => scrollByOffset('left')}
              title={isEn ? 'Scroll future days' : 'حرکت به روزهای بعد'}
            >
              {isEn ? 'Later' : 'روزهای بعد'} ▶
            </button>

            <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', padding: '5px 12px', fontSize: 13, borderRadius: 10 }}>
              📅 {isEn ? '30-Day Continuous Study Horizon (Drag to Scroll)' : 'ماتریس مطالعاتی ۳۰ روزه (قابلیت درگ و اسکرول افقی)'}
            </span>
          </div>

          {/* Search, Filter & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input sm"
              placeholder={isEn ? '🔍 Search subjects...' : '🔍 جستجو در دروس...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 170, borderRadius: 10 }}
            />

            <select
              className="input sm"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ borderRadius: 10, fontSize: 12.5 }}
            >
              <option value="all">{isEn ? 'All Subjects' : 'همه دروس'}</option>
              {STANDARD_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="input sm"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ borderRadius: 10, fontSize: 12.5 }}
            >
              <option value="all">{isEn ? 'All Priorities' : 'همه اولویت‌ها'}</option>
              <option value="high">🚩 {isEn ? 'High' : 'مهم و سخت'}</option>
              <option value="medium">🚩 {isEn ? 'Medium' : 'معمولی'}</option>
              <option value="low">🚩 {isEn ? 'Low' : 'ساده'}</option>
            </select>

            {isMentor && onSavePlan && (
              <button
                type="button"
                className="btn primary sm"
                style={{ borderRadius: 10, padding: '8px 18px', fontWeight: 800, background: '#16a34a' }}
                onClick={handlePublishPlan}
                disabled={savingPlan}
              >
                {savingPlan ? '…' : '💾 ' + (isEn ? 'Publish 30-Day Plan' : 'ثبت و ارسال برنامه ۳۰ روزه')}
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
            ✅ {saveSuccessMsg}
          </div>
        )}
      </div>

      {/* ── 30-DAY CONTINUOUS DRAGGABLE HORIZONTAL MATRIX ── */}
      <div
        ref={matrixScrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="study-calendar-matrix-scroll"
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 18,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
          cursor: isGrabbing ? 'grabbing' : 'grab',
          userSelect: isGrabbing ? 'none' : 'auto',
        }}
      >
        {calendarDays.map((day, dayIndex) => {
          const rawTasks = day.tasks || []
          const filteredTasks = getFilteredTasks(rawTasks)
          const totalMinutes = rawTasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0)
          const totalHours = (totalMinutes / 60).toFixed(1)
          const isOverDrag = dragOverDayIndex === dayIndex

          const alertInfo = capacityAlerts[day.date_str]
          const isOverCapacity = alertInfo && totalMinutes > alertInfo.max_hours * 60

          return (
            <div
              key={day.date_str || dayIndex}
              className={`calendar-day-column ${day.is_today ? 'is-today-col' : ''}`}
              onDragOver={(e) => handleDragOver(e, dayIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dayIndex)}
              style={{
                flex: '0 0 290px',
                minWidth: 275,
                maxWidth: 310,
                background: day.is_today ? 'var(--card)' : isOverDrag ? 'var(--tint-fill)' : 'var(--card)',
                borderRadius: 20,
                border: day.is_today
                  ? '2.5px solid var(--primary)'
                  : isOverDrag
                  ? '2px dashed var(--primary)'
                  : '1px solid var(--line)',
                boxShadow: day.is_today ? '0 10px 30px rgba(79, 70, 229, 0.14)' : '0 4px 14px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border 0.2s, background 0.2s',
                overflow: 'hidden',
              }}
            >
              {/* Day Column Header */}
              <div
                style={{
                  padding: '12px 14px',
                  background: day.is_today
                    ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(124, 58, 237, 0.09))'
                    : 'var(--bg)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <b style={{ fontSize: 14.5, color: day.is_today ? 'var(--primary)' : 'var(--ink)' }}>
                      {day.label}
                    </b>
                    {day.is_today && (
                      <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 999 }}>
                        {isEn ? 'Today' : 'امروز'}
                      </span>
                    )}
                  </div>
                  <div className="small muted" style={{ fontSize: 11, marginTop: 2 }}>
                    📅 {day.jalali_str} <span style={{ opacity: 0.65 }}>({day.date_str})</span>
                  </div>
                </div>

                <div style={{ textAlign: isEn ? 'right' : 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isOverCapacity ? '#ef4444' : 'var(--ink)' }}>
                    ⏱️ {fa(totalHours)} {isEn ? 'h' : 'س'}
                  </div>
                  <div className="small muted" style={{ fontSize: 10.5 }}>
                    {fa(rawTasks.length)} {isEn ? 'tasks' : 'پارت'}
                  </div>
                </div>
              </div>

              {/* Capacity Warning Banner */}
              {alertInfo && (
                <div
                  style={{
                    background: isOverCapacity ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    borderBottom: `1px solid ${isOverCapacity ? '#ef4444' : '#f59e0b'}`,
                    padding: '6px 10px',
                    fontSize: 11,
                    color: isOverCapacity ? '#b91c1c' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <b>⚠️ {isEn ? 'Limit:' : 'محدودیت:'}</b> {fa(alertInfo.max_hours)} {isEn ? 'hrs' : 'ساعت'}
                  </div>
                  {!isMentor && onDeclareCapacity && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ padding: '2px 6px', fontSize: 10 }}
                      onClick={() => onDeclareCapacity(day)}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}

              {/* Mentor: Add Task Button */}
              {isMentor && (
                <div style={{ padding: '8px 12px 4px' }} className="no-drag">
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      border: '1px dashed var(--line)',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onClick={() => handleOpenAddModal(dayIndex)}
                  >
                    <span>+</span>
                    <span>{isEn ? 'Add Task' : 'افزودن پارت مطالعاتی'}</span>
                  </button>
                </div>
              )}

              {/* Student: Declare Capacity Button */}
              {!isMentor && !alertInfo && onDeclareCapacity && (
                <div style={{ padding: '6px 12px 2px', textAlign: 'center' }} className="no-drag">
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ fontSize: 10.5, color: 'var(--muted)', padding: '2px 8px' }}
                    onClick={() => onDeclareCapacity(day)}
                  >
                    ⏱️ {isEn ? 'Declare Time Constraint' : 'اعلام محدودیت ساعت'}
                  </button>
                </div>
              )}

              {/* Tasks List (Notes hidden by default, shown in modal on click) */}
              <div
                style={{
                  padding: '8px 10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                  minHeight: 160,
                }}
              >
                {filteredTasks.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 12,
                      opacity: 0.6,
                    }}
                  >
                    <span style={{ fontSize: 22, marginBottom: 2 }}>☕</span>
                    <span>{isEn ? 'No tasks scheduled' : 'برنامه‌ای تنظیم نشده است'}</span>
                  </div>
                ) : (
                  filteredTasks.map((task, taskIndex) => {
                    const prioObj = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[3]
                    const methodObj = METHODS.find((m) => m.id === task.study_method) || METHODS[0]
                    const isDone = task.status === 'done'

                    return (
                      <div
                        key={task.id || taskIndex}
                        draggable={isMentor}
                        onDragStart={(e) => handleDragStart(e, dayIndex, taskIndex, task)}
                        onClick={() => {
                          if (isMentor) {
                            handleOpenEditModal(dayIndex, taskIndex, task)
                          } else {
                            setViewingTask({ task, dayLabel: day.label, dayDate: day.date_str, dayJalali: day.jalali_str })
                          }
                        }}
                        style={{
                          background: isDone ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg)',
                          border: isDone ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--line)',
                          borderRight: !isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderLeft: isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: isMentor ? 'grab' : 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.16s ease',
                        }}
                        title={isEn ? 'Click to view full notes & launch timer' : 'برای مشاهده جزئیات و شروع تایمر کلیک کنید'}
                      >
                        {/* Task Header: Checkbox + Subject/Topic + Priority Flag (NO notes in column view) */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onTickTask) {
                                onTickTask(dayIndex, task, isDone ? '' : 'done', day.date_str)
                              } else {
                                const updated = [...calendarDays]
                                const dayTasks = [...(updated[dayIndex].tasks || [])]
                                dayTasks[taskIndex] = { ...dayTasks[taskIndex], status: isDone ? '' : 'done' }
                                updated[dayIndex] = { ...updated[dayIndex], tasks: dayTasks }
                                setCalendarDays(updated)
                                if (!isDone) soundEngine.playChime()
                              }
                            }}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: isDone ? '2px solid #22c55e' : '2px solid var(--line)',
                              background: isDone ? '#22c55e' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {isDone && '✓'}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                              <b
                                style={{
                                  fontSize: 12.5,
                                  color: 'var(--ink)',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  opacity: isDone ? 0.65 : 1,
                                  lineHeight: 1.35,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {task.subject}: {task.topic || 'مطالعه'}
                              </b>
                              {prioObj.id !== 'none' && (
                                <span style={{ fontSize: 11, color: prioObj.color, flexShrink: 0 }}>
                                  {prioObj.flag}
                                </span>
                              )}
                            </div>

                            {/* Meta Badges: Duration + Method Icon + Question Count */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              <span
                                className="badge"
                                style={{
                                  background: 'var(--tint-fill)',
                                  color: 'var(--ink)',
                                  fontSize: 10.5,
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                }}
                              >
                                ⏱️ {fa(task.duration_minutes || 90)} {isEn ? 'min' : 'دقیقه'}
                              </span>

                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: methodObj.color,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  fontWeight: 600,
                                }}
                              >
                                <span>{methodObj.icon}</span>
                                <span>{isEn ? methodObj.label_en : methodObj.label_fa}</span>
                              </span>

                              {task.question_count && (
                                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                                  🎯 {fa(task.question_count)} {isEn ? 'Q' : 'تست'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for Task */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--line)' }} className="no-drag">
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ fontSize: 10.5, padding: '2px 6px', color: 'var(--primary)', fontWeight: 700 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewingTask({ task, dayLabel: day.label, dayDate: day.date_str, dayJalali: day.jalali_str })
                            }}
                          >
                            👁️ {isEn ? 'Details' : 'جزئیات'}
                          </button>

                          {onStartPomodoro && (
                            <button
                              type="button"
                              className="btn primary sm"
                              style={{
                                fontSize: 10,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontWeight: 700,
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onStartPomodoro(task.duration_minutes || 90, task.subject, task.topic)
                              }}
                              title={isEn ? 'Start Pomodoro Timer with this exact task duration' : 'شروع تایمر پومودورو با مدت زمان دقیق این پارت'}
                            >
                              ⏱️ {isEn ? 'Start Focus' : 'شروع پارت'}
                            </button>
                          )}
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

      {/* ── Task Detail Modal (reveals full description and notes on click) ── */}
      {viewingTask && (
        <div className="modal-overlay" onClick={() => setViewingTask(null)}>
          <div
            className="modal"
            style={{ maxWidth: 480, padding: 22, borderRadius: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
              <div>
                <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontSize: 11, marginBottom: 4 }}>
                  {viewingTask.dayLabel} · {viewingTask.dayJalali} ({viewingTask.dayDate})
                </span>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>
                  📖 {viewingTask.task.subject}: {viewingTask.task.topic || 'مطالعه'}
                </h3>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                style={{ fontSize: 16, padding: '4px 8px' }}
                onClick={() => setViewingTask(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Duration and Method */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--ink)', padding: '6px 12px', fontSize: 12.5, borderRadius: 10 }}>
                  ⏱️ {isEn ? 'Assigned Duration:' : 'مدت زمان پارت:'} <b>{fa(viewingTask.task.duration_minutes || 90)} {isEn ? 'min' : 'دقیقه'}</b>
                </span>
                <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--ink)', padding: '6px 12px', fontSize: 12.5, borderRadius: 10 }}>
                  🎯 {isEn ? 'Method:' : 'روش مطالعه:'} <b>{viewingTask.task.study_method || 'مفهومی'}</b>
                </span>
                {viewingTask.task.question_count && (
                  <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--ink)', padding: '6px 12px', fontSize: 12.5, borderRadius: 10 }}>
                    ✍️ {isEn ? 'Questions Target:' : 'هدف تست/تمرین:'} <b>{fa(viewingTask.task.question_count)}</b>
                  </span>
                )}
              </div>

              {/* Full Task Notes / Description Box */}
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 14,
                  padding: 14,
                  border: '1px solid var(--line)',
                }}
              >
                <b style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
                  📝 {isEn ? 'Mentor Instructions & Study Notes:' : 'دستورالعمل و توضیحات مشاور:'}
                </b>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                  {viewingTask.task.notes || (isEn ? 'No special notes specified. Follow standard textbook curriculum.' : 'توضیحات خاصی ثبت نشده است. مطابق سرفصل استاندارد مطالعه شود.')}
                </p>
              </div>

              {/* Actions: Start Pomodoro with exact duration */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setViewingTask(null)}
                >
                  {isEn ? 'Close' : 'بستن'}
                </button>

                {onStartPomodoro && (
                  <button
                    type="button"
                    className="btn primary"
                    style={{ borderRadius: 12, padding: '9px 20px', fontWeight: 800 }}
                    onClick={() => {
                      const dur = viewingTask.task.duration_minutes || 90
                      onStartPomodoro(dur, viewingTask.task.subject, viewingTask.task.topic)
                      setViewingTask(null)
                    }}
                  >
                    ⏱️ {isEn ? `Start Focus (${fa(viewingTask.task.duration_minutes || 90)}m)` : `شروع مطالعه و تایمر (${fa(viewingTask.task.duration_minutes || 90)} دقیقه)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mentor Task Editor Modal (Mentor Only) ── */}
      {isMentor && editorState.isOpen && (
        <div className="modal-overlay" onClick={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}>
          <div
            className="modal"
            style={{ maxWidth: 480, padding: 22, borderRadius: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {editorState.taskIndex != null
                  ? (isEn ? 'Edit Study Task' : 'ویرایش پارت مطالعاتی')
                  : (isEn ? 'Add New Study Task' : 'افزودن پارت مطالعاتی جدید')}
              </h3>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditor} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="field">
                <span>{isEn ? 'Subject:' : 'عنوان درس:'}</span>
                <select
                  className="input"
                  value={editorState.subject}
                  onChange={(e) => setEditorState({ ...editorState, subject: e.target.value })}
                >
                  {STANDARD_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{isEn ? 'Topic / Chapter Title:' : 'مبحث یا فصل مورد نظر:'}</span>
                <input
                  type="text"
                  className="input"
                  value={editorState.topic}
                  onChange={(e) => setEditorState({ ...editorState, topic: e.target.value })}
                  placeholder={isEn ? 'e.g. Genetics Chapter 3' : 'مثال: گفتار ۳ فصل اول ژنتیک'}
                  required
                />
              </label>

              <div className="two-col">
                <label className="field">
                  <span>{isEn ? 'Duration (Minutes):' : 'مدت زمان (دقیقه):'}</span>
                  <input
                    type="number"
                    className="input"
                    min="15"
                    max="360"
                    step="15"
                    value={editorState.duration_minutes}
                    onChange={(e) => setEditorState({ ...editorState, duration_minutes: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{isEn ? 'Target Questions:' : 'تعداد تست یا تمرین:'}</span>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max="200"
                    value={editorState.question_count}
                    onChange={(e) => setEditorState({ ...editorState, question_count: e.target.value })}
                  />
                </label>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>{isEn ? 'Study Method:' : 'روش مطالعه:'}</span>
                  <select
                    className="input"
                    value={editorState.study_method}
                    onChange={(e) => setEditorState({ ...editorState, study_method: e.target.value })}
                  >
                    {METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.icon} {isEn ? m.label_en : m.label_fa}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{isEn ? 'Priority Level:' : 'سطح اولویت:'}</span>
                  <select
                    className="input"
                    value={editorState.priority}
                    onChange={(e) => setEditorState({ ...editorState, priority: e.target.value })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>{p.flag} {isEn ? p.label_en : p.label_fa}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>{isEn ? 'Mentor Instructions & Notes:' : 'توضیحات و نکات مشاور:'}</span>
                <textarea
                  className="input"
                  rows="3"
                  value={editorState.notes}
                  onChange={(e) => setEditorState({ ...editorState, notes: e.target.value })}
                  placeholder={isEn ? 'Specific instructions for student...' : 'نکات مهم مطالعه و تست...'}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {editorState.taskIndex != null ? (
                  <button
                    type="button"
                    className="btn danger sm"
                    onClick={(e) => {
                      handleDeleteTask(editorState.dayIndex, editorState.taskIndex, e)
                      setEditorState((prev) => ({ ...prev, isOpen: false }))
                    }}
                  >
                    🗑️ {isEn ? 'Delete Task' : 'حذف پارت'}
                  </button>
                ) : <span />}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}
                  >
                    {isEn ? 'Cancel' : 'انصراف'}
                  </button>
                  <button type="submit" className="btn primary sm">
                    💾 {isEn ? 'Save Task' : 'ذخیره پارت'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
