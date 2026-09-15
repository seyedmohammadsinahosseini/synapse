// Shared UI bits
import { useEffect, useState } from 'react'
import { fa } from './api.js'
import { useTheme } from './theme.jsx'
import { useLang, tSubject } from './i18n.jsx'

export function Logo({ size = 40, className = '' }) {
  const { theme } = useTheme()
  // black logo for light mode, white logo for dark mode
  const src = theme === 'dark' ? '/logo-dark.png?v=5' : '/logo-light.png?v=5'
  return (
    <span className={`logo ${className}`} style={{ height: size, display: 'inline-flex', alignItems: 'center' }}>
      <img key={theme} src={src} alt="Synapse" className="logo-img" style={{ height: size, width: 'auto', display: 'block', objectFit: 'contain' }} />
    </span>
  )
}

export function Card({ children, className = '', style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Stat({ label, value, icon, color }) {
  return (
    <Card className="stat">
      <div className="stat-icon" style={{ background: color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </Card>
  )
}

export function Badge({ children, color = '#6366f1' }) {
  return (
    <span className="badge" style={{ background: color + '1a', color }}>
      {children}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Bar({ value, max = 20, color }) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100))
  return (
    <div className="bar">
      <div
        className="bar-fill"
        style={{ width: pct + '%', background: color || '#6366f1' }}
      />
    </div>
  )
}

export function Empty({ text, children }) {
  return <div className="empty">{children || text}</div>
}

export function ScoreBadge({ score }) {
  const color = score >= 17 ? '#22c55e' : score >= 14 ? '#eab308' : score >= 10 ? '#f97316' : '#ef4444'
  return (
    <span className="score-badge" style={{ background: color }}>
      {fa(score)}
    </span>
  )
}

// ── Subject scores — animated list ────────────────────────────────────

const SUBJECT_ICONS = {
  'ریاضی': '📐', 'ریاضیات': '📐', 'math': '📐', 'mathematics': '📐',
  'فیزیک': '⚡', 'physics': '⚡',
  'شیمی': '🧪', 'chemistry': '🧪',
  'زیست‌شناسی': '🧬', 'زیستشناسی': '🧬', 'biology': '🧬',
  'علوم تجربی': '🔬', 'science': '🔬',
  'ادبیات فارسی': '📖', 'فارسی': '📖', 'literature': '📖', 'persian': '📖',
  'زبان انگلیسی': '🗣️', 'english': '🗣️',
  'عربی': '🕌', 'arabic': '🕌',
  'دین و زندگی': '📿', 'islamic studies': '📿',
  'مطالعات اجتماعی': '🏛️', 'social studies': '🏛️',
  'نگارش': '✍️', 'writing': '✍️',
  'هوش مصنوعی': '🤖', 'ai': '🤖',
  'برنامه‌نویسی': '💻', 'programming': '💻',
  'کامپیوتر': '🖥️', 'computer': '🖥️',
}
const ICON_BG = ['#eef2ff', '#fce7f3', '#dcfce7', '#fef3c7', '#e0f2fe', '#f3e8ff', '#ffe4e6', '#ecfdf5']
const subjectIcon = (s) => SUBJECT_ICONS[s] || '📘'

export function SubjectScores({ items, scoreKey = 'score', iconKey }) {
  const { lang } = useLang()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80)
    return () => clearTimeout(t)
  }, [])
  if (!items?.length) return <Empty>—</Empty>
  return (
    <div className="subject-scores">
      {items.map((it, i) => {
        const score = Number(it[scoreKey]) || 0
        const pct = Math.max(2, Math.min(100, (score / 20) * 100))
        const color = score >= 17 ? '#22c55e' : score >= 14 ? '#eab308' : score >= 10 ? '#f97316' : '#ef4444'
        return (
          <div className="subject-score" key={it.subject} style={{ animationDelay: `${i * 75}ms` }}>
            <div className="ss-icon" style={{ background: ICON_BG[i % ICON_BG.length] }}>
              {subjectIcon(it.subject)}
            </div>
            <div className="ss-main">
              <div className="ss-top">
                <span className="ss-name">{tSubject(it.subject, lang)}</span>
                <ScoreBadge score={score} />
              </div>
              <div className="ss-track">
                <div
                  className="ss-fill"
                  style={{
                    width: shown ? `${pct}%` : '0%',
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    transitionDelay: `${i * 75}ms`,
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
