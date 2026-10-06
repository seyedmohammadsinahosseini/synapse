import { useState, useEffect, useRef } from 'react'
import { useLang } from '../i18n.jsx'
import { fa, faCompact } from '../api.js'
import { soundEngine } from '../utils/audioSynth.js'

const PRIORITIES = [
  { id: 'high', label_fa: 'مهم و سخت', label_en: 'High / Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', flag: '🚩' },
  { id: 'medium', label_fa: 'معمولی و متوسط', label_en: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', flag: '🚩' },
  { id: 'low', label_fa: 'عادی یا ساده', label_en: 'Low / Simple', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', flag: '🚩' },
  { id: 'none', label_fa: 'هیچ / خنثی', label_en: 'None', color: '#94a3b8', bg: 'transparent', flag: '🏳️' },
]

const METHODS = [
  { id: 'test', label_fa: 'تست‌زنی', label_en: 'Testing / MCQ', icon: '🎯', color: '#6366f1' },
  { id: 'study', label_fa: 'مطالعه مفهومی', label_en: 'Deep Concept', icon: '📖', color: '#10b981' },
  { id: 'essay', label_fa: 'حل تمرین تشریحی', label_en: 'Essay Exercise', icon: '✍️', color: '#0ea5e9' },
  { id: 'review', label_fa: 'مرور و خلاصه‌نویسی', label_en: 'Review & Summary', icon: '🔄', color: '#f59e0b' },
]

const QUICK_SUBJECTS = ['زیست‌شناسی', 'شیمی', 'ریاضی', 'فیزیک', 'ادبیات فارسی', 'عربی', 'زبان انگلیسی', 'دین و زندگی']

const SEED_TASKS = [
  {
    id: 't1',
    date_str: new Date().toISOString().split('T')[0],
    subject: 'زیست‌شناسی',
    title: 'فصل ۴ دوازدهم: جهش و تنوع ژنتیکی',
    notes: 'حل ۵۰ تست کتاب خیلی سبز (ص ۹۸ تا ۱۱۵) و نشانه‌گذاری تست‌های نکته‌دار ترکیبی.',
    duration_minutes: 90,
    study_method: 'test',
    priority: 'high',
    question_count: 50,
    completed: false,
    order: 0,
  },
  {
    id: 't2',
    date_str: new Date().toISOString().split('T')[0],
    subject: 'شیمی',
    title: 'اسیدها و بازها (مسائل pH و استوکیومتری)',
    notes: 'مرور روابط تعادل یونی و رسم نمودارهای تیتراسیون اسید-باز.',
    duration_minutes: 75,
    study_method: 'study',
    priority: 'medium',
    question_count: 20,
    completed: false,
    order: 1,
  },
  {
    id: 't3',
    date_str: new Date().toISOString().split('T')[0],
    subject: 'زبان انگلیسی',
    title: 'مرور لغات جعبه لایتنر و گرامر مجهول',
    notes: '۳۰ لغت جدید از واژگان ۵۰۴ و حل یک متن درک مطلب ریدینگ کنکور.',
    duration_minutes: 45,
    study_method: 'review',
    priority: 'low',
    question_count: 15,
    completed: true,
    order: 2,
  },
]

export default function TickTickCalendar({ onStartPomodoro, externalPlanData }) {
  const { lang } = useLang()
  const isEn = lang === 'en'

  // Current view anchor date (defaults to today)
  const [currentAnchorDate, setCurrentAnchorDate] = useState(() => new Date())
  const [daysCount, setDaysCount] = useState(7) // 7 days, 14 days, or 30 days
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoSortByPriority, setAutoSortByPriority] = useState(true)

  // Tasks state
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_ticktick_tasks')
      return saved ? JSON.parse(saved) : SEED_TASKS
    } catch {
      return SEED_TASKS
    }
  })

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverDayStr, setDragOverDayStr] = useState(null)

  // Floating Popover Creation & Edit State
  const [popoverState, setPopoverState] = useState({
    isOpen: false,
    targetDateStr: null,
    editingTaskId: null,
    subject: 'زیست‌شناسی',
    title: '',
    notes: '',
    duration_minutes: 90,
    study_method: 'test',
    priority: 'medium',
    question_count: 30,
    position: { x: 0, y: 0 },
  })

  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const scrollContainerRef = useRef(null)

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('synapse_ticktick_tasks', JSON.stringify(tasks))
  }, [tasks])

  // Generate continuous list of dates around the current anchor
  const displayedDays = []
  const startDay = new Date(currentAnchorDate)
  // Align start to Saturday if Persian, or Monday/Sunday
  const dayOfWeek = startDay.getDay()
  const diffToSat = (dayOfWeek + 1) % 7
  startDay.setDate(startDay.getDate() - diffToSat)

  const todayIso = new Date().toISOString().split('T')[0]

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDay)
    d.setDate(startDay.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    let jalaliDayName = ''
    let jalaliDateFormatted = ''
    let gregorianFormatted = ''

    try {
      jalaliDayName = d.toLocaleDateString('fa-IR', { weekday: 'long' })
      jalaliDateFormatted = d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' })
      gregorianFormatted = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    } catch {
      jalaliDayName = 'روز'
      jalaliDateFormatted = dateStr
      gregorianFormatted = dateStr
    }

    displayedDays.push({
      dateStr,
      dateObj: d,
      jalaliDayName,
      jalaliDateFormatted,
      gregorianFormatted,
      isToday: dateStr === todayIso,
    })
  }

  // Navigate functions
  const handlePrevDays = () => {
    const next = new Date(currentAnchorDate)
    next.setDate(next.getDate() - daysCount)
    setCurrentAnchorDate(next)
  }

  const handleNextDays = () => {
    const next = new Date(currentAnchorDate)
    next.setDate(next.getDate() + daysCount)
    setCurrentAnchorDate(next)
  }

  const handleJumpToToday = () => {
    setCurrentAnchorDate(new Date())
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  // Open Popover to Add Task
  const handleOpenAddPopover = (e, dateStr) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverState({
      isOpen: true,
      targetDateStr: dateStr,
      editingTaskId: null,
      subject: 'زیست‌شناسی',
      title: '',
      notes: '',
      duration_minutes: 90,
      study_method: 'test',
      priority: 'medium',
      question_count: 30,
      position: { x: Math.min(window.innerWidth - 380, Math.max(20, rect.left - 100)), y: Math.min(window.innerHeight - 450, rect.top + 30) },
    })
    setShowPriorityMenu(false)
  }

  // Open Popover to Edit Task
  const handleOpenEditPopover = (e, task) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverState({
      isOpen: true,
      targetDateStr: task.date_str,
      editingTaskId: task.id,
      subject: task.subject,
      title: task.title,
      notes: task.notes || '',
      duration_minutes: task.duration_minutes || 90,
      study_method: task.study_method || 'test',
      priority: task.priority || 'medium',
      question_count: task.question_count || 20,
      position: { x: Math.min(window.innerWidth - 380, Math.max(20, rect.left - 100)), y: Math.min(window.innerHeight - 450, rect.top + 30) },
    })
    setShowPriorityMenu(false)
  }

  // Save Task (Create or Update)
  const handleSavePopover = (e) => {
    e.preventDefault()
    if (!popoverState.title.trim()) return

    if (popoverState.editingTaskId) {
      // Update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === popoverState.editingTaskId) {
            return {
              ...t,
              subject: popoverState.subject,
              title: popoverState.title.trim(),
              notes: popoverState.notes.trim(),
              duration_minutes: Number(popoverState.duration_minutes) || 60,
              study_method: popoverState.study_method,
              priority: popoverState.priority,
              question_count: Number(popoverState.question_count) || 0,
            }
          }
          return t
        })
      )
    } else {
      // New task
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date_str: popoverState.targetDateStr,
        subject: popoverState.subject,
        title: popoverState.title.trim(),
        notes: popoverState.notes.trim(),
        duration_minutes: Number(popoverState.duration_minutes) || 60,
        study_method: popoverState.study_method,
        priority: popoverState.priority,
        question_count: Number(popoverState.question_count) || 0,
        completed: false,
        order: Date.now(),
      }
      setTasks((prev) => [...prev, newTask])
    }

    setPopoverState((prev) => ({ ...prev, isOpen: false }))
  }

  // Toggle Task Completion
  const handleToggleTask = (taskId, e) => {
    e.stopPropagation()
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextState = !t.completed
          if (nextState) {
            soundEngine.playChime()
            // Add 25 XP
            const curXp = parseInt(localStorage.getItem('synapse_user_xp') || '150', 10)
            localStorage.setItem('synapse_user_xp', String(curXp + 25))
          }
          return { ...t, completed: nextState }
        }
        return t
      })
    )
  }

  // Delete Task
  const handleDeleteTask = (taskId, e) => {
    e.stopPropagation()
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  // Move Task to Next Day
  const handleMoveToNextDay = (task, e) => {
    e.stopPropagation()
    const cur = new Date(task.date_str)
    cur.setDate(cur.getDate() + 1)
    const nextDateStr = cur.toISOString().split('T')[0]

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, date_str: nextDateStr } : t))
    )
  }

  // Change Task Priority Directly
  const handleSetPriority = (taskId, newPriority, e) => {
    e.stopPropagation()
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    )
  }

  // Drag and Drop Handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, dateStr) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverDayStr !== dateStr) {
      setDragOverDayStr(dateStr)
    }
  }

  const handleDragLeave = () => {
    setDragOverDayStr(null)
  }

  const handleDrop = (e, targetDateStr) => {
    e.preventDefault()
    setDragOverDayStr(null)
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain')
    if (!taskId) return

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, date_str: targetDateStr, order: Date.now() }
        }
        return t
      })
    )
    setDraggedTaskId(null)
  }

  // Priority Rank Sorter
  const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 }

  const getSortedDayTasks = (dateStr) => {
    let dayTasks = tasks.filter((t) => t.date_str === dateStr)

    // Filter by subject
    if (filterSubject !== 'all') {
      dayTasks = dayTasks.filter((t) => t.subject === filterSubject)
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      dayTasks = dayTasks.filter((t) => t.priority === filterPriority)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      dayTasks = dayTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      )
    }

    // Sort
    return dayTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1 // incompleted tasks on top
      }
      if (autoSortByPriority) {
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
        if (pDiff !== 0) return pDiff
      }
      return (a.order || 0) - (b.order || 0)
    })
  }

  // Total summary calculations
  const totalTasksCount = tasks.length
  const completedTasksCount = tasks.filter((t) => t.completed).length
  const highPriorityCount = tasks.filter((t) => t.priority === 'high' && !t.completed).length
  const totalMinutesPlanned = tasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0)
  const totalHoursPlanned = (totalMinutesPlanned / 60).toFixed(1)

  const activePopPriority = PRIORITIES.find((p) => p.id === popoverState.priority) || PRIORITIES[1]

  return (
    <div style={{ position: 'relative' }}>
      {/* ═══════════════════════════════════════════════════════════════
          TOP CONTROLS & NAVIGATION BAR
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 16,
          borderRadius: 18,
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Left / Navigation controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="btn ghost sm"
                style={{ borderRadius: 10, padding: '6px 12px', fontWeight: 800 }}
                onClick={handlePrevDays}
                title={isEn ? 'Previous Days' : 'روزهای قبل'}
              >
                ◀ {isEn ? 'Prev' : 'قبلی'}
              </button>

              <button
                type="button"
                className="btn primary sm"
                style={{ borderRadius: 10, padding: '6px 14px', fontWeight: 800 }}
                onClick={handleJumpToToday}
              >
                📍 {isEn ? 'Today' : 'امروز'}
              </button>

              <button
                type="button"
                className="btn ghost sm"
                style={{ borderRadius: 10, padding: '6px 12px', fontWeight: 800 }}
                onClick={handleNextDays}
                title={isEn ? 'Next Days' : 'روزهای بعد'}
              >
                {isEn ? 'Next' : 'بعدی'} ▶
              </button>
            </div>

            {/* Days range span switcher (7 days, 14 days) */}
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 3, border: '1px solid var(--line)' }}>
              {[
                { count: 7, label_fa: '۷ روزه (هفتگی)', label_en: '7 Days' },
                { count: 14, label_fa: '۱۴ روزه (دو هفته)', label_en: '14 Days' },
                { count: 30, label_fa: '۳۰ روزه (ماهانه)', label_en: '30 Days' },
              ].map((span) => {
                const active = daysCount === span.count
                return (
                  <button
                    key={span.count}
                    type="button"
                    style={{
                      border: 'none',
                      background: active ? 'var(--card)' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--muted)',
                      fontWeight: active ? 800 : 500,
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => setDaysCount(span.count)}
                  >
                    {isEn ? span.label_en : span.label_fa}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right / Filters and Auto-Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <input
              type="text"
              className="input sm"
              placeholder={isEn ? '🔍 Search tasks...' : '🔍 جستجو در برنامه‌ها...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 160, borderRadius: 10 }}
            />

            {/* Subject Filter */}
            <select
              className="input sm"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ borderRadius: 10, fontSize: 12.5 }}
            >
              <option value="all">{isEn ? 'All Subjects' : 'همه دروس'}</option>
              {QUICK_SUBJECTS.map((s) => (
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
              <option value="high">🚩 {isEn ? 'High / Urgent' : 'مهم و سخت'}</option>
              <option value="medium">🚩 {isEn ? 'Medium' : 'معمولی'}</option>
              <option value="low">🚩 {isEn ? 'Low' : 'ساده و عادی'}</option>
            </select>

            {/* Priority Auto-Sort Toggle */}
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
              title={isEn ? 'Sort by priority red flags on top' : 'شناور کردن برنامه‌های قرمز و مهم در بالای ستون'}
            >
              🚩 {isEn ? 'Priority Top' : 'اولویت بالا'}
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--line)',
            fontSize: 12,
            color: 'var(--muted)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            📋 {isEn ? 'Total Planned Tasks:' : 'کل تسک‌های ثبت‌شده:'} <b>{fa(totalTasksCount)}</b>
          </span>
          <span>
            ✅ {isEn ? 'Completed:' : 'تکمیل‌شده:'} <b>{fa(completedTasksCount)}</b> (
            {fa(totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0)}%)
          </span>
          <span>
            ⏱️ {isEn ? 'Total Study Time:' : 'مجموع ساعات مطالعه:'} <b>{fa(totalHoursPlanned)} {isEn ? 'Hours' : 'ساعت'}</b>
          </span>
          {highPriorityCount > 0 && (
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800 }}>
              🚩 {fa(highPriorityCount)} {isEn ? 'High Priority Remaining' : 'برنامه مهم و سخت باقی‌مانده'}
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HORIZONTAL CONTINUOUS DRAG-AND-DROP DAY COLUMNS MATRIX
         ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 16,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {displayedDays.map((day) => {
          const dayTasks = getSortedDayTasks(day.dateStr)
          const totalDayMinutes = dayTasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0)
          const totalDayHours = (totalDayMinutes / 60).toFixed(1)
          const isOverDrag = dragOverDayStr === day.dateStr

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => handleDragOver(e, day.dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateStr)}
              style={{
                flex: '0 0 310px',
                minWidth: 290,
                maxWidth: 340,
                background: day.isToday
                  ? 'var(--card)'
                  : isOverDrag
                  ? 'var(--tint-fill)'
                  : 'var(--card)',
                borderRadius: 20,
                border: day.isToday
                  ? '2px solid var(--primary)'
                  : isOverDrag
                  ? '2px dashed var(--primary)'
                  : '1px solid var(--line)',
                boxShadow: day.isToday ? '0 10px 30px rgba(79, 70, 229, 0.12)' : '0 4px 14px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border 0.2s, background 0.2s',
                overflow: 'hidden',
              }}
            >
              {/* Day Header */}
              <div
                style={{
                  padding: '14px 16px',
                  background: day.isToday
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
                    <b style={{ fontSize: 15, color: day.isToday ? 'var(--primary)' : 'var(--ink)' }}>
                      {isEn ? day.gregorianFormatted.split(',')[0] : day.jalaliDayName}
                    </b>
                    {day.isToday && (
                      <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, padding: '2px 6px' }}>
                        {isEn ? 'Today' : 'امروز'}
                      </span>
                    )}
                  </div>
                  <div className="small muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {isEn ? day.gregorianFormatted : `${day.jalaliDateFormatted} (${day.gregorianFormatted})`}
                  </div>
                </div>

                <div style={{ textAlign: isEn ? 'right' : 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>
                    ⏱️ {fa(totalDayHours)} {isEn ? 'h' : 'س'}
                  </div>
                  <div className="small muted" style={{ fontSize: 10 }}>
                    {fa(dayTasks.length)} {isEn ? 'tasks' : 'برنامه'}
                  </div>
                </div>
              </div>

              {/* Add Task Button for Day */}
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
                  onClick={(e) => handleOpenAddPopover(e, day.dateStr)}
                >
                  <span>+</span>
                  <span>{isEn ? 'Add Task to Day' : 'افزودن برنامه به این روز'}</span>
                </button>
              </div>

              {/* Tasks List in Day Column */}
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
                {dayTasks.length === 0 ? (
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
                      opacity: 0.7,
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 4 }}>☕</span>
                    <span>{isEn ? 'No tasks scheduled' : 'برنامه‌ای برای این روز ثبت نشده'}</span>
                  </div>
                ) : (
                  dayTasks.map((task) => {
                    const prioObj = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[3]
                    const methodObj = METHODS.find((m) => m.id === task.study_method) || METHODS[0]

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={(e) => handleOpenEditPopover(e, task)}
                        style={{
                          background: task.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg)',
                          border: task.completed
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : `1px solid var(--line)`,
                          borderRight: !isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderLeft: isEn && prioObj.id !== 'none' ? `4px solid ${prioObj.color}` : undefined,
                          borderRadius: 14,
                          padding: '12px 14px',
                          cursor: 'grab',
                          boxShadow: '0 3px 10px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {/* Top Line: Checkbox, Title & Priority Flag */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                          {/* Round Checkbox */}
                          <div
                            onClick={(e) => handleToggleTask(task.id, e)}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: task.completed ? '2px solid #22c55e' : '2px solid var(--line)',
                              background: task.completed ? '#22c55e' : 'transparent',
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
                            title={isEn ? 'Mark done' : 'تیک انجام'}
                          >
                            {task.completed && '✓'}
                          </div>

                          {/* Task Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <b
                                style={{
                                  fontSize: 13.5,
                                  color: 'var(--ink)',
                                  textDecoration: task.completed ? 'line-through' : 'none',
                                  opacity: task.completed ? 0.65 : 1,
                                  lineHeight: 1.4,
                                }}
                              >
                                {task.title}
                              </b>

                              {/* Priority Flag Tag */}
                              {prioObj.id !== 'none' && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: prioObj.color,
                                    flexShrink: 0,
                                  }}
                                  title={isEn ? prioObj.label_en : prioObj.label_fa}
                                >
                                  {prioObj.flag}
                                </span>
                              )}
                            </div>

                            {/* Detailed Notes snippet */}
                            {task.notes && (
                              <p
                                style={{
                                  fontSize: 11.5,
                                  color: 'var(--muted)',
                                  margin: '4px 0 0 0',
                                  lineHeight: 1.4,
                                  opacity: task.completed ? 0.5 : 0.9,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {task.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bottom Metadata & Quick Actions */}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--tint-fill)', color: 'var(--primary)', fontWeight: 700 }}>
                              {task.subject}
                            </span>
                            <span className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--card)', color: methodObj.color, border: '1px solid var(--line)' }}>
                              {methodObj.icon} {isEn ? methodObj.label_en : methodObj.label_fa}
                            </span>
                            <span className="small muted">⏱️ {fa(task.duration_minutes)}m</span>
                          </div>

                          {/* Quick Action Buttons on hover/mobile */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {onStartPomodoro && (
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: '2px 5px', fontSize: 11 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onStartPomodoro(task)
                                }}
                                title={isEn ? 'Start Focus Timer' : 'شروع پارت تمرکز پومودورو'}
                              >
                                ▶️
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ padding: '2px 5px', fontSize: 11 }}
                              onClick={(e) => handleMoveToNextDay(task, e)}
                              title={isEn ? 'Move to next day' : 'انتقال به روز بعد'}
                            >
                              ➡️
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ padding: '2px 5px', fontSize: 11, color: '#ef4444' }}
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title={isEn ? 'Delete task' : 'حذف برنامه'}
                            >
                              🗑️
                            </button>
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
          FLOATING CREATION & EDITING POPOVER MODAL (TICKTICK STYLE)
         ═══════════════════════════════════════════════════════════════ */}
      {popoverState.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPopoverState((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: '100%',
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>
                    {popoverState.editingTaskId
                      ? isEn
                        ? 'Edit Study Task'
                        : 'ویرایش برنامه مطالعاتی'
                      : isEn
                      ? 'Add New Study Task'
                      : 'افزودن برنامه جدید'}
                  </h3>
                  <div className="small muted" style={{ fontSize: 11 }}>
                    📅 {popoverState.targetDateStr}
                  </div>
                </div>
              </div>

              {/* Priority Flag Dropdown (Top Right Corner) */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    borderRadius: 12,
                    background: activePopPriority.bg || 'var(--bg)',
                    border: `1.5px solid ${activePopPriority.color}`,
                    color: activePopPriority.color,
                    fontWeight: 800,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                >
                  <span>{activePopPriority.flag}</span>
                  <span style={{ fontSize: 12 }}>{isEn ? activePopPriority.label_en : activePopPriority.label_fa}</span>
                  <span style={{ fontSize: 10 }}>▼</span>
                </button>

                {/* Priority Selection Menu */}
                {showPriorityMenu && (
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
                          background: popoverState.priority === p.id ? 'var(--tint-fill)' : 'transparent',
                          color: p.color,
                          fontWeight: popoverState.priority === p.id ? 800 : 500,
                          cursor: 'pointer',
                          textAlign: isEn ? 'left' : 'right',
                          fontSize: 12,
                        }}
                        onClick={() => {
                          setPopoverState((prev) => ({ ...prev, priority: p.id }))
                          setShowPriorityMenu(false)
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

            {/* Form Inputs */}
            <form onSubmit={handleSavePopover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Subject Quick Selector Pills */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  {isEn ? 'Subject:' : 'درس مورد نظر:'}
                </label>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {QUICK_SUBJECTS.map((s) => {
                    const active = popoverState.subject === s
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
                        onClick={() => setPopoverState((prev) => ({ ...prev, subject: s }))}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Task Title Input */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Task Title & Chapter:' : 'عنوان برنامه و سرفصل فصل:'}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. Math: 30 Derivative practice questions' : 'مثلاً: ریاضی: حل ۳۰ تست مشتق و کاربرد مشتق'}
                  value={popoverState.title}
                  onChange={(e) => setPopoverState((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              {/* Detailed Notes Textarea */}
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Detailed Instructions & Source Notes:' : 'توضیحات تکمیلی، منابع و صفحات کتاب:'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder={isEn ? 'Source books, page numbers, marked questions, specific formulas...' : 'مثلاً: کتاب تست خیلی‌سبز ص ۱۲۴ تا ۱۳۰، تست‌های زوج و بررسی دقیق پاسخ تشریحی...'}
                  value={popoverState.notes}
                  onChange={(e) => setPopoverState((prev) => ({ ...prev, notes: e.target.value }))}
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
                    value={popoverState.study_method}
                    onChange={(e) => setPopoverState((prev) => ({ ...prev, study_method: e.target.value }))}
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
                    value={popoverState.duration_minutes}
                    onChange={(e) => setPopoverState((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                  >
                    <option value={30}>۳۰ دقیقه (پارت کوتاه)</option>
                    <option value={45}>۴۵ دقیقه</option>
                    <option value={60}>۶۰ دقیقه (۱ ساعت)</option>
                    <option value={75}>۷۵ دقیقه (۱:۱۵ ساعت)</option>
                    <option value={90}>۹۰ دقیقه (۱:۳۰ ساعت)</option>
                    <option value={120}>۱۲۰ دقیقه (۲ ساعت)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setPopoverState((prev) => ({ ...prev, isOpen: false }))}
                >
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button type="submit" className="btn primary" style={{ borderRadius: 12, padding: '10px 24px' }}>
                  {isEn ? 'Save Task' : 'ذخیره در تقویم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
