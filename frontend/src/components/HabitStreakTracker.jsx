import { useState, useEffect } from 'react'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'

const DEFAULT_HABITS = [
  { id: 'h1', title_fa: 'حل حداقل ۵۰ تست تالیفی/سراسری', title_en: 'Solve 50+ Practice Questions', icon: '🎯', category: 'study' },
  { id: 'h2', title_fa: 'مرور لایتنر (لغات زبان و فرمول‌ها)', title_en: 'Leitner Box Flashcard Review', icon: '🗂️', category: 'review' },
  { id: 'h3', title_fa: 'تحلیل دقیق پاسخ‌نامه آزمون', title_en: 'Detailed Test Error Analysis', icon: '🔍', category: 'analysis' },
  { id: 'h4', title_fa: 'حداقل ۳ پارت تمرکز پومودورو', title_en: 'Complete 3+ Focus Sessions', icon: '⏱️', category: 'focus' },
  { id: 'h5', title_fa: 'خواب منظم قبل از ساعت ۲۳:۳۰', title_en: 'Sleep Before 11:30 PM', icon: '🌙', category: 'health' },
]

export default function HabitStreakTracker() {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const [habits, setHabits] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_habits')
      return saved ? JSON.parse(saved) : DEFAULT_HABITS
    } catch {
      return DEFAULT_HABITS
    }
  })

  // Date formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0]

  const [completedMap, setCompletedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_habit_history')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('synapse_habits', JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    localStorage.setItem('synapse_habit_history', JSON.stringify(completedMap))
  }, [completedMap])

  // Toggle habit for today
  const toggleHabitToday = (habitId) => {
    const currentTodayList = completedMap[todayStr] || []
    let updated
    if (currentTodayList.includes(habitId)) {
      updated = currentTodayList.filter((id) => id !== habitId)
    } else {
      updated = [...currentTodayList, habitId]
    }
    setCompletedMap({
      ...completedMap,
      [todayStr]: updated,
    })
  }

  // Add new custom habit
  const handleAddHabit = (e) => {
    e.preventDefault()
    if (!newHabitTitle.trim()) return
    const newHabit = {
      id: 'h_' + Date.now(),
      title_fa: newHabitTitle.trim(),
      title_en: newHabitTitle.trim(),
      icon: '✨',
      category: 'custom',
    }
    setHabits([...habits, newHabit])
    setNewHabitTitle('')
    setShowAddForm(false)
  }

  // Delete habit
  const deleteHabit = (id) => {
    setHabits(habits.filter((h) => h.id !== id))
  }

  // Build 30-day historical matrix (last 30 days)
  const days30 = []
  const todayObj = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(todayObj.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const doneCount = (completedMap[dStr] || []).length
    const pct = habits.length > 0 ? doneCount / habits.length : 0
    days30.push({
      dateStr: dStr,
      dayNum: d.getDate(),
      month: d.toLocaleString(isEn ? 'en-US' : 'fa-IR', { month: 'short' }),
      doneCount,
      pct,
      isToday: dStr === todayStr,
    })
  }

  // Calculate Streak
  let currentStreak = 0
  let checkDate = new Date()
  while (true) {
    const cStr = checkDate.toISOString().split('T')[0]
    const done = (completedMap[cStr] || []).length
    if (cStr === todayStr && done === 0) {
      // If today is not done yet, check yesterday to not break the streak prematurely
      checkDate.setDate(checkDate.getDate() - 1)
      const yStr = checkDate.toISOString().split('T')[0]
      const yDone = (completedMap[yStr] || []).length
      if (yDone > 0) {
        currentStreak = 1
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      } else {
        break
      }
    }
    if (done > 0) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const todayCompleted = completedMap[todayStr] || []
  const todayPct = habits.length > 0 ? Math.round((todayCompleted.length / habits.length) * 100) : 0

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header with Streak Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              {isEn ? 'Daily Habits & Consistency Matrix' : 'ماتریس عادات روزانه و زنجیره استمرار'}
            </h3>
          </div>
          <p className="small muted" style={{ margin: '4px 0 0 0' }}>
            {isEn ? 'Build unbreakable study habits day by day' : 'ساخت عادات موفقیت کنکور با پایش روزانه و زنجیره استمرار'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 14,
              padding: '6px 14px',
            }}
          >
            <span style={{ fontSize: 22 }}>🔥</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
                {isEn ? 'STREAK' : 'زنجیره فعلی'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#d97706', lineHeight: 1 }}>
                {fa(currentStreak)} {isEn ? 'Days' : 'روز متوالی'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Contribution Heatmap Grid */}
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1px solid var(--line)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="small muted" style={{ fontWeight: 700 }}>
            {isEn ? 'Last 30 Days Consistency:' : 'کارنامه استمرار ۳۰ روز گذشته:'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }} className="muted">
            <span>{isEn ? 'Less' : 'کمتر'}</span>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--tint-fill)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#86efac' }} />
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#15803d' }} />
            <span>{isEn ? 'More' : 'بیشتر'}</span>
          </div>
        </div>

        {/* Heatmap blocks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gap: 6,
          }}
        >
          {days30.map((d) => {
            let bg = 'var(--tint-fill)'
            if (d.pct > 0.75) bg = '#15803d'
            else if (d.pct > 0.4) bg = '#22c55e'
            else if (d.pct > 0) bg = '#86efac'

            return (
              <div
                key={d.dateStr}
                title={`${d.dateStr}: ${fa(d.doneCount)} / ${fa(habits.length)} (${Math.round(d.pct * 100)}%)`}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: bg,
                  border: d.isToday ? '2px solid var(--primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            )
          })}
        </div>
      </div>

      {/* Today's Habit Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 700 }}>
          <span>{isEn ? "Today's Habit Completion" : 'پیشرفت عادات امروز:'}</span>
          <span style={{ color: 'var(--primary)' }}>
            {fa(todayCompleted.length)} / {fa(habits.length)} ({fa(todayPct)}%)
          </span>
        </div>
        <div style={{ width: '100%', height: 8, background: 'var(--tint-fill)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${todayPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #3b82f6)',
              borderRadius: 999,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      {/* Habits Checklist for Today */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.map((habit) => {
          const isDone = todayCompleted.includes(habit.id)
          return (
            <div
              key={habit.id}
              onClick={() => toggleHabitToday(habit.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 12,
                background: isDone ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg)',
                border: isDone ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--line)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: isDone ? '2px solid #22c55e' : '2px solid var(--line)',
                    background: isDone ? '#22c55e' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 'bold',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isDone ? '✓' : ''}
                </div>
                <span style={{ fontSize: 18 }}>{habit.icon || '📌'}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isDone ? 700 : 500,
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--ink)' : 'var(--ink)',
                    opacity: isDone ? 0.8 : 1,
                  }}
                >
                  {isEn ? habit.title_en : habit.title_fa}
                </span>
              </div>

              {habit.category === 'custom' && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ padding: '2px 6px', fontSize: 12, color: 'var(--muted)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteHabit(habit.id)
                  }}
                  title={isEn ? 'Delete habit' : 'حذف عادت'}
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Custom Habit Form */}
      <div style={{ marginTop: 14 }}>
        {!showAddForm ? (
          <button
            type="button"
            className="btn ghost sm"
            style={{ width: '100%', borderRadius: 10, borderStyle: 'dashed' }}
            onClick={() => setShowAddForm(true)}
          >
            + {isEn ? 'Add Custom Daily Habit' : 'افزودن عادت جدید'}
          </button>
        ) : (
          <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              className="input sm"
              placeholder={isEn ? 'e.g. 15 minutes physics formula review...' : 'مثلاً: ۱۵ دقیقه مرور فرمول‌های فیزیک...'}
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit" className="btn sm primary" style={{ borderRadius: 8 }}>
              {isEn ? 'Save' : 'ثبت'}
            </button>
            <button
              type="button"
              className="btn sm ghost"
              style={{ borderRadius: 8 }}
              onClick={() => {
                setShowAddForm(false)
                setNewHabitTitle('')
              }}
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
