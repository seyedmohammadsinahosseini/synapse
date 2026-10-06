import { useEffect, useRef, useState } from 'react'
import { soundEngine } from '../utils/audioSynth.js'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'

const MODES = [
  { id: 'pomo25', label_fa: 'پومودورو (۲۵ دقیقه)', label_en: 'Pomodoro (25m)', minutes: 25, xp: 50 },
  { id: 'deep50', label_fa: 'تمرکز عمیق (۵۰ دقیقه)', label_en: 'Deep Work (50m)', minutes: 50, xp: 120 },
  { id: 'break10', label_fa: 'استراحت کوتاه (۱۰ دقیقه)', label_en: 'Short Break (10m)', minutes: 10, xp: 0 },
  { id: 'break20', label_fa: 'استراحت بلند (۲۰ دقیقه)', label_en: 'Long Break (20m)', minutes: 20, xp: 0 },
]

const AMBIENTS = [
  { id: 'mute', icon: '🔇', label_fa: 'بدون صدا (سکوت)', label_en: 'Mute' },
  { id: 'rain', icon: '🌧️', label_fa: 'صدای باران ملایم', label_en: 'Gentle Rain' },
  { id: 'waves', icon: '🌊', label_fa: 'امواج آرام اقیانوس', label_en: 'Ocean Waves' },
  { id: 'whitenoise', icon: '☕', label_fa: 'نویز سفید کتابخانه', label_en: 'Library Focus Noise' },
  { id: 'alpha', icon: '🧘', label_fa: 'فرکانس آلفا ۴۳۲Hz', label_en: 'Alpha Waves (432Hz)' },
]

const SUBJECTS = ['زیست‌شناسی', 'شیمی', 'ریاضی', 'فیزیک', 'ادبیات فارسی', 'عربی', 'زبان انگلیسی', 'دین و زندگی']

export default function PomodoroTimer({ onCompleteSession, initialSubject = 'زیست‌شناسی' }) {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const [mode, setMode] = useState('pomo25')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [studyMethod, setStudyMethod] = useState('test')
  const [ambient, setAmbient] = useState('rain')
  const [volume, setVolume] = useState(0.4)
  const [isMuted, setIsMuted] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(() => {
    return parseInt(localStorage.getItem('synapse_pomo_count') || '0', 10)
  })
  const [showCelebration, setShowCelebration] = useState(false)

  const timerRef = useRef(null)

  const activeModeObj = MODES.find((m) => m.id === mode) || MODES[0]
  const totalSeconds = activeModeObj.minutes * 60
  const progressPct = ((totalSeconds - secondsLeft) / totalSeconds) * 100

  // Format MM:SS
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  // Mode change
  const handleModeChange = (newModeId) => {
    setIsRunning(false)
    soundEngine.stop()
    const target = MODES.find((m) => m.id === newModeId) || MODES[0]
    setMode(newModeId)
    setSecondsLeft(target.minutes * 60)
  }

  // Play / Pause
  const togglePlay = () => {
    if (isRunning) {
      setIsRunning(false)
      soundEngine.stop()
    } else {
      setIsRunning(true)
      if (ambient !== 'mute' && !isMuted) {
        soundEngine.setVolume(volume)
        soundEngine.play(ambient)
      }
    }
  }

  // Reset
  const handleReset = () => {
    setIsRunning(false)
    soundEngine.stop()
    setSecondsLeft(activeModeObj.minutes * 60)
  }

  // Change Ambient Sound
  const handleAmbientChange = (newAmbientId) => {
    setAmbient(newAmbientId)
    if (isRunning) {
      if (newAmbientId === 'mute' || isMuted) {
        soundEngine.stop()
      } else {
        soundEngine.setVolume(volume)
        soundEngine.play(newAmbientId)
      }
    }
  }

  // Volume change
  const handleVolumeChange = (v) => {
    const val = parseFloat(v)
    setVolume(val)
    soundEngine.setVolume(val)
    if (isMuted && val > 0) {
      setIsMuted(false)
    }
  }

  // Mute toggle
  const handleMuteToggle = () => {
    const muted = soundEngine.toggleMute()
    setIsMuted(muted)
  }

  // Countdown effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            setIsRunning(false)
            soundEngine.stop()
            soundEngine.playChime()

            // Reward XP & Save
            const newCount = completedSessions + 1
            setCompletedSessions(newCount)
            localStorage.setItem('synapse_pomo_count', String(newCount))

            // Add XP to total
            const curXp = parseInt(localStorage.getItem('synapse_user_xp') || '150', 10)
            const earned = activeModeObj.xp || 50
            localStorage.setItem('synapse_user_xp', String(curXp + earned))

            setShowCelebration(true)
            if (onCompleteSession) {
              onCompleteSession({
                subject,
                studyMethod,
                durationMinutes: activeModeObj.minutes,
                xpEarned: earned,
                timestamp: new Date().toISOString(),
              })
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, activeModeObj, subject, studyMethod, completedSessions, onCompleteSession])

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stop()
    }
  }, [])

  return (
    <div className="pomodoro-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Pulse Glow when running */}
      {isRunning && (
        <div
          className="pomo-ambient-halo"
          style={{
            position: 'absolute',
            inset: '-20px',
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.16), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'pulseGlow 3s infinite ease-in-out',
          }}
        />
      )}

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18, position: 'relative', zIndex: 1 }}>
        {MODES.map((m) => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              className="btn sm"
              style={{
                borderRadius: 12,
                fontSize: 12.5,
                fontWeight: 700,
                padding: '6px 14px',
                background: active ? 'var(--primary)' : 'var(--bg)',
                color: active ? '#fff' : 'var(--ink)',
                border: active ? '1px solid var(--primary)' : '1px solid var(--line)',
                boxShadow: active ? '0 4px 14px rgba(79, 70, 229, 0.3)' : 'none',
              }}
              onClick={() => handleModeChange(m.id)}
            >
              {isEn ? m.label_en : m.label_fa}
            </button>
          )
        })}
      </div>

      {/* Circular Progress & Clock Display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '14px 0', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'conic-gradient(var(--primary) ' + progressPct + '%, var(--tint-fill) ' + progressPct + '% 100%)',
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            transition: 'background 0.3s ease',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 2, color: 'var(--ink)' }}>
              {timeFormatted}
            </div>
            <div className="small muted" style={{ marginTop: 2, fontWeight: 600 }}>
              {isEn ? activeModeObj.label_en : activeModeObj.label_fa}
            </div>
            {isRunning && (
              <span className="badge" style={{ marginTop: 6, fontSize: 10, background: '#dcfce7', color: '#16a34a' }}>
                ● {isEn ? 'Focus Session Active' : 'جلسه تمرکز فعال است'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Play / Pause Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          className="btn"
          style={{
            borderRadius: 14,
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 800,
            background: isRunning ? '#f59e0b' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#fff',
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={togglePlay}
        >
          <span>{isRunning ? '⏸️' : '▶️'}</span>
          <span>{isRunning ? (isEn ? 'Pause Timer' : 'توقف موقت') : (isEn ? 'Start Focus Session' : 'شروع جلسه تمرکز')}</span>
        </button>

        <button
          type="button"
          className="btn ghost"
          style={{ borderRadius: 14, padding: '12px 18px', fontSize: 14 }}
          onClick={handleReset}
          title={isEn ? 'Reset' : 'بازنشانی زمان'}
        >
          🔄
        </button>
      </div>

      {/* Embedded Ambient Soundscape Player Controls */}
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 16,
          padding: '14px 18px',
          border: '1px solid var(--line)',
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎧</span>
            <b style={{ fontSize: 13.5, color: 'var(--ink)' }}>
              {isEn ? 'Ambient Soundscape Player:' : 'صداهای آرام‌بخش و تمرکز:'}
            </b>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mute button */}
            <button
              type="button"
              className="btn ghost sm"
              style={{ borderRadius: 8, padding: '4px 8px', fontSize: 14 }}
              onClick={handleMuteToggle}
              title={isMuted ? (isEn ? 'Unmute' : 'وصل صدا') : (isEn ? 'Mute' : 'قطع صدا')}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Volume slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{ width: 85, accentColor: 'var(--primary)', cursor: 'pointer' }}
                title={`${Math.round(volume * 100)}%`}
              />
              <span className="small muted" style={{ fontSize: 11, width: 28 }}>
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Ambient Type Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
          {AMBIENTS.map((amb) => {
            const active = ambient === amb.id
            return (
              <button
                key={amb.id}
                type="button"
                className="btn sm"
                style={{
                  borderRadius: 10,
                  fontSize: 11.5,
                  padding: '6px 8px',
                  background: active ? 'var(--tint-fill)' : 'var(--card)',
                  color: active ? 'var(--primary)' : 'var(--muted)',
                  border: active ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                  fontWeight: active ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => handleAmbientChange(amb.id)}
              >
                <span>{amb.icon}</span>
                <span>{isEn ? amb.label_en : amb.label_fa}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Task & Subject Association */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative', zIndex: 1 }}>
        <div>
          <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
            {isEn ? 'Target Subject:' : 'درس مورد مطالعه:'}
          </label>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
            {isEn ? 'Study Method:' : 'روش مطالعه:'}
          </label>
          <select className="input" value={studyMethod} onChange={(e) => setStudyMethod(e.target.value)}>
            <option value="test">🎯 {isEn ? 'Testing' : 'تست‌زنی'}</option>
            <option value="study">📖 {isEn ? 'Deep Conceptual' : 'مفهومی و کتاب'}</option>
            <option value="essay">✍️ {isEn ? 'Essay Exercise' : 'حل تمرین تشریحی'}</option>
            <option value="review">🔁 {isEn ? 'Revision & Summary' : 'مرور و خلاصه‌نویسی'}</option>
          </select>
        </div>
      </div>

      {/* Completed Sessions Stats Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)', position: 'relative', zIndex: 1 }}>
        <span className="small muted">
          🔥 {isEn ? 'Completed Focus Sessions:' : 'پارت‌های تکمیل‌شده امروز:'} <b>{fa(completedSessions)}</b>
        </span>
        <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800 }}>
          ⚡ +{fa(activeModeObj.xp)} XP
        </span>
      </div>

      {/* Celebration Modal / Banner */}
      {showCelebration && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
          <h3 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: 22 }}>
            {isEn ? 'Brilliant Focus Session Completed!' : 'آفرین! جلسه تمرکز با موفقیت تمام شد'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 320, margin: '0 0 16px 0' }}>
            {isEn
              ? `You dedicated ${activeModeObj.minutes} minutes of deep work to ${subject} and earned ${activeModeObj.xp} XP!`
              : `شما ${fa(activeModeObj.minutes)} دقیقه مطالعه عمیق روی ${subject} داشتید و ${fa(activeModeObj.xp)} امتیاز XP کسب کردید!`
            }
          </p>
          <button
            className="btn"
            style={{ borderRadius: 12, padding: '10px 24px', background: '#22c55e', color: '#fff', fontWeight: 700 }}
            onClick={() => setShowCelebration(false)}
          >
            {isEn ? 'Claim Reward & Continue' : 'ثبت پارت و ادامه'}
          </button>
        </div>
      )}
    </div>
  )
}
