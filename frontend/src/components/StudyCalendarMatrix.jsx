import { useState, useEffect, useRef } from 'react'
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

export default function StudyCalendarMatrix({
  mode = 'student', // 'student' | 'mentor'
  days = [],
  capacityAlerts = {},
  onSavePlan,
  onTickTask,
  onDeclareCapacity,
  onStartPomodoro,
  weekRangeStr = '',
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  weekOffset = 0,
}) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const isMentor = mode === 'mentor'

  // Local state for days and tasks (editable if mentor)
  const [calendarDays, setCalendarDays] = useState(days)
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoSortByPriority, setAutoSortByPriority] = useState(true)

  // Drag and Drop (Mentor Only)
  const [draggedItem, setDraggedItem] = useState(null) // { dayIndex, taskIndex, task }
  const [dragOverDayIndex, setDragOverDayIndex] = useState(null)

  // Modals & Popovers
  // 1. Task Detail Sheet (for Student or Mentor view)
  const [viewingTask, setViewingTask] = useState(null) // { task, dayLabel, dayDate }
  // 2. Task Editor / Creator Modal (Mentor Only)
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
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Sync external days when prop changes
  useEffect(() => {
    setCalendarDays(days)
  }, [days])

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

  // Open Task Creator (Mentor)
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
    setShowPriorityPicker(false)
  }

  // Open Task Editor (Mentor)
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
    setShowPriorityPicker(false)
  }

  // Save Task (Mentor)
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

  // Delete Task (Mentor)
  const handleDeleteTask = (dayIndex, taskIndex, e) => {
    e.stopPropagation()
    const updated = [...calendarDays]
    const dayTasks = [...(updated[dayIndex].tasks || [])]
    dayTasks.splice(taskIndex, 1)
    updated[dayIndex] = { ...updated[dayIndex], tasks: dayTasks }
    setCalendarDays(updated)
  }

  // Save Full Plan to Backend (Mentor)
  const handlePublishPlan = async () => {
    if (!onSavePlan) return
    setSavingPlan(true)
    setSaveSuccessMsg('')
    try {
      await onSavePlan(calendarDays)
      setSaveSuccessMsg(isEn ? 'Plan saved and published successfully!' : 'برنامه هفتگی با موفقیت ثبت و برای دانش‌آموز ارسال شد!')
      setTimeout(() => setSaveSuccessMsg(''), 4000)
    } finally {
      setSavingPlan(false)
    }
  }

  // Priority Rank Sorter
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

  const activeEditorPriority = PRIORITIES.find((p) => p.id === editorState.priority) || PRIORITIES[1]

  return (
    <div style={{ position: 'relative' }}>
      {/* ═══════════════════════════════════════════════════════════════
          CLEAN MODERN TOOLBAR & METRICS STRIP
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          borderRadius: 20,
          padding: '16px 22px',
          marginBottom: 18,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Week Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {onPrevWeek && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 800 }}
                  onClick={onPrevWeek}
                >
                  ◀ {isEn ? 'Previous Week' : 'هفته قبل'}
                </button>
              )}
              {onCurrentWeek && (
                <button
                  type="button"
                  className="btn primary sm"
                  style={{ borderRadius: 10, padding: '7px 16px', fontWeight: 800 }}
                  onClick={onCurrentWeek}
                >
                  📍 {isEn ? 'Current Week' : 'هفته جاری'}
                </button>
              )}
              {onNextWeek && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 800 }}
                  onClick={onNextWeek}
                >
                  {isEn ? 'Next Week' : 'هفته بعد'} ▶
                </button>
              )}
            </div>

            {weekRangeStr && (
              <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', padding: '5px 12px', fontSize: 13, borderRadius: 10 }}>
                🗓️ {weekRangeStr} {weekOffset !== 0 ? `(${weekOffset > 0 ? `+${weekOffset}` : weekOffset})` : ''}
              </span>
            )}
          </div>

          {/* Search, Filters & Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input sm"
                placeholder={isEn ? '🔍 Search subjects or notes...' : '🔍 جستجو در دروس یا مباحث...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 190, borderRadius: 10, paddingRight: isEn ? 12 : 12 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    left: !isEn ? 8 : 'auto',
                    right: isEn ? 8 : 'auto',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Subject Filter */}
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

            {/* Priority Filter */}
            <select
              className="input sm"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ borderRadius: 10, fontSize: 12.5 }}
            >
              <option value="all">{isEn ? 'All Priorities' : 'همه اولویت‌ها'}</option>
              <option value="high">🚩 {isEn ? 'High / Critical' : 'مهم و سخت'}</option>
              <option value="medium">🚩 {isEn ? 'Medium' : 'معمولی'}</option>
              <option value="low">🚩 {isEn ? 'Low' : 'ساده و عادی'}</option>
            </select>

            {/* Auto Sort by Priority */}
            <button
              type="button"
              className="btn ghost sm"
              style={{
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: autoSortByPriority ? 'var(--primary)' : 'var(--muted)',
                background: autoSortByPriority ? 'var(--tint-fill)' : 'transparent',
              }}
              onClick={() => setAutoSortByPriority(!autoSortByPriority)}
              title={isEn ? 'Float high priority red tasks to the top' : 'شناور کردن برنامه‌های قرمز و سخت در بالای ستون'}
            >
              🚩 {isEn ? 'Priority Top' : 'اولویت بالا'}
            </button>

            {/* Mentor Publish Plan Button */}
            {isMentor && onSavePlan && (
              <button
                type="button"
                className="btn primary sm"
                style={{ borderRadius: 10, padding: '8px 18px', fontWeight: 800, background: '#16a34a' }}
                onClick={handlePublishPlan}
                disabled={savingPlan}
              >
                {savingPlan ? '…' : '💾 ' + (isEn ? 'Save & Publish Plan' : 'ثبت و ارسال برنامه هفتگی')}
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

      {/* ═══════════════════════════════════════════════════════════════
          CONTINUOUS HORIZONTAL 7-DAY STUDY MATRIX
         ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 16,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {calendarDays.map((day, dayIndex) => {
          const rawTasks = day.tasks || []
          const filteredTasks = getFilteredTasks(rawTasks)
          const totalMinutes = rawTasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0)
          const totalHours = (totalMinutes / 60).toFixed(1)
          const isOverDrag = dragOverDayIndex === dayIndex

          // Capacity constraint alert for this day
          const alertInfo = capacityAlerts[day.date_str] || day.capacity_limit
          const hasCapacityAlert = !!alertInfo
          const isOverCapacity = hasCapacityAlert && totalMinutes > alertInfo.max_hours * 60

          return (
            <div
              key={day.date_str || dayIndex}
              onDragOver={(e) => handleDragOver(e, dayIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dayIndex)}
              style={{
                flex: '0 0 300px',
                minWidth: 280,
                maxWidth: 330,
                background: day.is_today ? 'var(--card)' : isOverDrag ? 'var(--tint-fill)' : 'var(--card)',
                borderRadius: 20,
                border: day.is_today
                  ? '2px solid var(--primary)'
                  : isOverDrag
                  ? '2px dashed var(--primary)'
                  : '1px solid var(--line)',
                boxShadow: day.is_today ? '0 10px 30px rgba(79, 70, 229, 0.12)' : '0 4px 14px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border 0.2s, background 0.2s',
                overflow: 'hidden',
              }}
            >
              {/* Day Column Header */}
              <div
                style={{
                  padding: '14px 16px',
                  background: day.is_today
                    ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(124, 58, 237, 0.08))'
                    : 'var(--bg)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <b style={{ fontSize: 15, color: day.is_today ? 'var(--primary)' : 'var(--ink)' }}>
                      {day.label}
                    </b>
                    {day.is_today && (
                      <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, padding: '2px 6px' }}>
                        {isEn ? 'Today' : 'امروز'}
                      </span>
                    )}
                  </div>
                  {day.date_str && (
                    <div className="small muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {day.date_str}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: isEn ? 'right' : 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isOverCapacity ? '#ef4444' : 'var(--ink)' }}>
                    ⏱️ {fa(totalHours)} {isEn ? 'h' : 'س'}
                  </div>
                  <div className="small muted" style={{ fontSize: 10.5 }}>
                    {fa(rawTasks.length)} {isEn ? 'tasks' : 'برنامه'}
                  </div>
                </div>
              </div>

              {/* Capacity Alert Warning Banner on Day Column */}
              {hasCapacityAlert && (
                <div
                  style={{
                    background: isOverCapacity ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    borderBottom: `1px solid ${isOverCapacity ? '#ef4444' : '#f59e0b'}`,
                    padding: '8px 12px',
                    fontSize: 11,
                    color: isOverCapacity ? '#b91c1c' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <div>
                    <b>⚠️ {isEn ? 'Student Capacity Limit:' : 'محدودیت زمانی دانش‌آموز:'}</b>
                    <div>
                      {fa(alertInfo.max_hours)} {isEn ? 'hours max' : 'ساعت مجاز'}
                      {alertInfo.reason ? ` (${alertInfo.reason})` : ''}
                    </div>
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
                <div style={{ padding: '8px 12px 4px' }}>
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
                    <span>{isEn ? 'Add Task' : 'افزودن پارت درسی'}</span>
                  </button>
                </div>
              )}

              {/* Student: Declare Capacity Button if not set */}
              {!isMentor && !hasCapacityAlert && onDeclareCapacity && (
                <div style={{ padding: '6px 12px 2px', textAlign: 'center' }}>
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

              {/* Tasks List */}
              <div
                style={{
                  padding: '8px 12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  flex: 1,
                  minHeight: 180,
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
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 12,
                      opacity: 0.65,
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 4 }}>☕</span>
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
                            // Student clicks to open full detail modal!
                            setViewingTask({ task, dayLabel: day.label, dayDate: day.date_str })
                          }
                        }}
                        style={{
                          background: isDone ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg)',
                          border: isDone ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--line)',
                          borderRight: !isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderLeft: isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderRadius: 14,
                          padding: '12px 14px',
                          cursor: isMentor ? 'grab' : 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'transform 0.18s var(--ease-spring), box-shadow 0.18s var(--ease-spring), border-color 0.15s ease',
                          position: 'relative',
                        }}
                        title={isEn ? 'Click to view full details' : 'برای مشاهده توضیحات تکمیلی و شروع پارت کلیک کنید'}
                      >
                        {/* Task Card Top Row: Checkbox, Title & Priority Flag (NO DESCRIPTION PREVIEW) */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          {/* Round Checkbox (Student or Mentor) */}
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
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: isDone ? '2px solid #22c55e' : '2px solid var(--line)',
                              background: isDone ? '#22c55e' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginTop: 2,
                              transition: 'all 0.15s',
                            }}
                            title={isDone ? (isEn ? 'Mark incomplete' : 'برداشتن تیک') : (isEn ? 'Mark completed' : 'تیک انجام')}
                          >
                            {isDone && '✓'}
                          </div>

                          {/* Title and Subject */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <b
                                style={{
                                  fontSize: 13.5,
                                  color: 'var(--ink)',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  opacity: isDone ? 0.65 : 1,
                                  lineHeight: 1.4,
                                }}
                              >
                                {task.subject}: {task.topic || task.title || 'مطالعه'}
                              </b>

                              {prioObj.id !== 'none' && (
                                <span style={{ fontSize: 12, color: prioObj.color, flexShrink: 0 }} title={isEn ? prioObj.label_en : prioObj.label_fa}>
                                  {prioObj.flag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Task Card Bottom Metadata: Duration & Method (CLEAN & SLEEK) */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 8,
                            paddingTop: 6,
                            borderTop: '1px solid var(--line)',
                            fontSize: 11,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--card)', color: methodObj.color, border: '1px solid var(--line)' }}>
                              {methodObj.icon} {isEn ? methodObj.label_en : methodObj.label_fa}
                            </span>
                            <span className="small muted">⏱️ {fa(task.duration_minutes)} {isEn ? 'min' : 'دقیقه'}</span>
                            {task.question_count && (
                              <span className="small muted">🎯 {fa(task.question_count)} {isEn ? 'Q' : 'تست'}</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {/* Focus Button */}
                            {onStartPomodoro && (
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartPomodoro({
                                    subject: task.subject,
                                    topic: task.topic,
                                    durationMinutes: task.duration_minutes || 90,
                                  })
                                }}
                                title={isEn ? 'Start Focus Session' : 'شروع جلسه تمرکز'}
                              >
                                ▶️
                              </button>
                            )}

                            {/* Mentor Edit & Delete */}
                            {isMentor && (
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: '2px 6px', fontSize: 11, color: '#ef4444' }}
                                onClick={(e) => handleDeleteTask(dayIndex, taskIndex, e)}
                                title={isEn ? 'Delete task' : 'حذف برنامه'}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
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

      {/* ═══════════════════════════════════════════════════════════════
          TASK DETAIL MODAL (STUDENT & MENTOR VIEW ON CLICK)
         ═══════════════════════════════════════════════════════════════ */}
      {viewingTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setViewingTask(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 22,
              padding: 24,
              boxShadow: 'var(--shadow-modal)', animation: 'spring-pop 0.35s var(--ease-spring) both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontWeight: 800, fontSize: 13 }}>
                    {viewingTask.task.subject}
                  </span>
                  <span className="small muted">
                    📅 {viewingTask.dayLabel} {viewingTask.dayDate ? `(${viewingTask.dayDate})` : ''}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>
                  {viewingTask.task.topic || viewingTask.task.title || 'برنامه مطالعاتی'}
                </h3>
              </div>

              <button type="button" className="btn ghost sm" onClick={() => setViewingTask(null)} style={{ fontSize: 16 }}>
                ✕
              </button>
            </div>

            {/* Metadata Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="badge" style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '6px 12px' }}>
                ⏱️ {isEn ? 'Allocated Duration:' : 'زمان اختصاص‌یافته توسط استاد:'} <b>{fa(viewingTask.task.duration_minutes || 90)} {isEn ? 'minutes' : 'دقیقه'}</b>
              </span>
              <span className="badge" style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '6px 12px' }}>
                {METHODS.find((m) => m.id === viewingTask.task.study_method)?.icon}{' '}
                {isEn ? 'Method:' : 'روش:'}{' '}
                <b>{METHODS.find((m) => m.id === viewingTask.task.study_method)?.label_fa}</b>
              </span>
              {viewingTask.task.priority && viewingTask.task.priority !== 'none' && (
                <span
                  className="badge"
                  style={{
                    background: PRIORITIES.find((p) => p.id === viewingTask.task.priority)?.bg,
                    color: PRIORITIES.find((p) => p.id === viewingTask.task.priority)?.color,
                    padding: '6px 12px',
                    fontWeight: 700,
                  }}
                >
                  🚩 {isEn ? 'Priority:' : 'اولویت:'} {PRIORITIES.find((p) => p.id === viewingTask.task.priority)?.label_fa}
                </span>
              )}
            </div>

            {/* Detailed Instructions / Consultant Notes */}
            <div style={{ marginBottom: 20 }}>
              <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                💡 {isEn ? 'Detailed Instructions & Teacher Advice:' : 'توضیحات تکمیلی، منابع و نکات استاد:'}
              </label>
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: '1px solid var(--line)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  minHeight: 80,
                }}
              >
                {viewingTask.task.notes || viewingTask.task.description || (isEn ? 'No additional notes provided by mentor.' : 'توضیحات تکمیلی خاصی برای این پارت ثبت نشده است. طبق بودجه‌بندی معمول مطالعه کنید.')}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                style={{ borderRadius: 12 }}
                onClick={() => setViewingTask(null)}
              >
                {isEn ? 'Close' : 'بستن'}
              </button>

              {onStartPomodoro && (
                <button
                  type="button"
                  className="btn primary"
                  style={{ borderRadius: 12, padding: '10px 22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    const dur = viewingTask.task.duration_minutes || 90
                    const subj = viewingTask.task.subject || 'زیست‌شناسی'
                    setViewingTask(null)
                    onStartPomodoro({
                      subject: subj,
                      topic: viewingTask.task.topic,
                      durationMinutes: dur,
                    })
                  }}
                >
                  <span>▶️</span>
                  <span>
                    {isEn
                      ? `Start Pomodoro Focus (${viewingTask.task.duration_minutes || 90}m)`
                      : `شروع پارت تمرکز پومودورو (${fa(viewingTask.task.duration_minutes || 90)} دقیقه)`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TASK CREATOR & EDITOR MODAL (MENTOR ONLY)
         ═══════════════════════════════════════════════════════════════ */}
      {editorState.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {editorState.taskIndex != null
                    ? isEn
                      ? 'Edit Study Task'
                      : 'ویرایش پارت مطالعاتی'
                    : isEn
                    ? 'Add Study Task'
                    : 'افزودن پارت مطالعاتی جدید'}
                </h3>
                <div className="small muted">
                  📅 {calendarDays[editorState.dayIndex]?.label}
                </div>
              </div>

              {/* Priority Flag Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    borderRadius: 12,
                    background: activeEditorPriority.bg,
                    border: `1.5px solid ${activeEditorPriority.color}`,
                    color: activeEditorPriority.color,
                    fontWeight: 800,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                >
                  <span>{activeEditorPriority.flag}</span>
                  <span style={{ fontSize: 12 }}>{isEn ? activeEditorPriority.label_en : activeEditorPriority.label_fa}</span>
                  <span style={{ fontSize: 10 }}>▼</span>
                </button>

                {showPriorityPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: !isEn ? 0 : 'auto',
                      left: isEn ? 0 : 'auto',
                      marginTop: 6,
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: 14,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: 6,
                      zIndex: 10,
                      width: 170,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: editorState.priority === p.id ? 'var(--tint-fill)' : 'transparent',
                          color: p.color,
                          fontWeight: editorState.priority === p.id ? 800 : 500,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                        onClick={() => {
                          setEditorState((prev) => ({ ...prev, priority: p.id }))
                          setShowPriorityPicker(false)
                        }}
                      >
                        <span>{p.flag}</span>
                        <span>{isEn ? p.label_en : p.label_fa}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveEditor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Subject selector */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  {isEn ? 'Subject:' : 'درس:'}
                </label>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {STANDARD_SUBJECTS.map((s) => {
                    const active = editorState.subject === s
                    return (
                      <button
                        key={s}
                        type="button"
                        style={{
                          borderRadius: 10,
                          padding: '4px 10px',
                          fontSize: 11.5,
                          border: active ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                          background: active ? 'var(--tint-fill)' : 'var(--bg)',
                          color: active ? 'var(--primary)' : 'var(--ink)',
                          fontWeight: active ? 800 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => setEditorState((prev) => ({ ...prev, subject: s }))}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Topic / Title */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Topic / Chapter Title:' : 'عنوان مبحث و سرفصل فصل:'}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. 40 Derivative practice questions' : 'مثلاً: حل ۴۰ تست مشتق و کاربرد مشتق'}
                  value={editorState.topic}
                  onChange={(e) => setEditorState((prev) => ({ ...prev, topic: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              {/* Detailed Notes */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Detailed Mentor Instructions (Book pages, marked questions, advice):' : 'توضیحات تکمیلی استاد (منابع، صفحات کتاب، تست‌های مارک‌دار، نکات طلایی):'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder={isEn ? 'Source textbook, page numbers, specific exercises...' : 'مثلاً: کتاب تست خیلی‌سبز ص ۱۲۰ تا ۱۳۵، سوالات زوج و بررسی کامل پاسخ تشریحی...'}
                  value={editorState.notes}
                  onChange={(e) => setEditorState((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Study Method & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    {isEn ? 'Study Method:' : 'روش مطالعه:'}
                  </label>
                  <select
                    className="input"
                    value={editorState.study_method}
                    onChange={(e) => setEditorState((prev) => ({ ...prev, study_method: e.target.value }))}
                  >
                    {METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {isEn ? m.label_en : m.label_fa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    {isEn ? 'Duration (Minutes):' : 'مدت زمان (دقیقه):'}
                  </label>
                  <select
                    className="input"
                    value={editorState.duration_minutes}
                    onChange={(e) => setEditorState((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                  >
                    <option value={30}>۳۰ دقیقه</option>
                    <option value={45}>۴۵ دقیقه</option>
                    <option value={60}>۶۰ دقیقه (۱ ساعت)</option>
                    <option value={75}>۷۵ دقیقه (۱:۱۵ ساعت)</option>
                    <option value={90}>۹۰ دقیقه (۱:۳۰ ساعت)</option>
                    <option value={105}>۱۰۵ دقیقه (۱:۴۵ ساعت)</option>
                    <option value={120}>۱۲۰ دقیقه (۲ ساعت)</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setEditorState((prev) => ({ ...prev, isOpen: false }))}
                >
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button type="submit" className="btn primary" style={{ borderRadius: 12, padding: '10px 24px' }}>
                  {isEn ? 'Save Task' : 'ذخیره در برنامه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
