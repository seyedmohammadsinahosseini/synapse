import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../i18n.jsx'
import { Logo } from '../ui.jsx'

/**
 * Slide-bar navigation — a floating drawer on the inline-start edge
 * (right side in Persian / left side in English — the edge OPPOSITE the
 * floating chat buttons).
 *
 * Two states:
 *  - collapsed (default): a slim icon-only rail that OVERLAYS the page, so it
 *    never squeezes the content and the page footer scrolls underneath it.
 *  - expanded: opens wider ON TOP of the content (page size does not change).
 *    Clicking anywhere outside the bar (or pressing Esc) collapses it again.
 *
 * The "profile" entry sits pinned at the very bottom, right above the
 * expand/collapse toggle.
 */
export default function SlideBar({ role, route, navigate }) {
  const { t, lang } = useLang()
  const [expanded, setExpanded] = useState(false)
  const ref = useRef(null)

  const items = useMemo(() => {
    const nav = {
      student: [
        { key: 'home', icon: '🏠', labelKey: 'navHome', route: '#/dashboard' },
        { key: 'plan', icon: '📋', labelKey: 'navPlan', route: '#/plan' },
        { key: 'report_cards', icon: '📊', labelKey: 'navReportCards', route: '#/report-cards' },
        { key: 'chat', icon: '💬', labelKey: 'navChat', route: '#/chat' },
        { key: 'consult', icon: '🗓️', labelKey: 'navConsult', route: '#/consult' },
        { key: 'history', icon: '🎓', labelKey: 'navHistory', route: '#/history' },
      ],
      mentor: [
        { key: 'home', icon: '🏠', labelKey: 'navDashboard', route: '#/mentor' },
        { key: 'students', icon: '👨‍🎓', labelKey: 'navStudents', route: '#/mentor/students' },
        { key: 'chat', icon: '💬', labelKey: 'navChat', route: '#/chat' },
        { key: 'schedule', icon: '🗓️', labelKey: 'navSchedule', route: '#/mentor/schedule' },
      ],
      admin: [
        { key: 'stats', icon: '📊', labelKey: 'navStats', route: '#/admin' },
        { key: 'students', icon: '👨‍🎓', labelKey: 'navStudents', route: '#/admin/students' },
        { key: 'mentors', icon: '🧑‍🏫', labelKey: 'navMentors', route: '#/admin/mentors' },
        { key: 'questions', icon: '📚', labelKey: 'navQuestions', route: '#/admin/questions' },
      ],
    }[role] || []
    return nav
  }, [role])

  const r = (route || '').split('?')[0]

  const isActive = (it) => {
    switch (it.key) {
      case 'home': return r === '#/dashboard' || r === '#/mentor' || r === '#/mentor/'
      case 'students':
        return r === '#/admin/students' || r === '#/mentor/students' || r.startsWith('#/mentor/student/')
      case 'chat': return r === '#/chat'
      case 'plan': return r === '#/plan'
      case 'report_cards': return r === '#/report-cards' || r === '#/report-card'
      case 'consult': return r === '#/consult'
      case 'history': return r === '#/history'
      case 'schedule': return r === '#/mentor/schedule'
      case 'stats': return r === '#/admin' || r === '#/admin/'
      case 'mentors': return r === '#/admin/mentors'
      case 'questions': return r === '#/admin/questions'
      case 'profile': return r === '#/profile'
      default: return false
    }
  }

  const go = (route) => {
    setExpanded(false)
    navigate(route)
  }

  // collapse when clicking anywhere outside the rail
  useEffect(() => {
    if (!expanded) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setExpanded(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  const faRailRight = lang === 'fa'
  const chev = expanded
    ? (faRailRight ? '⏵' : '⏴')   // collapse → point back toward the edge
    : (faRailRight ? '⏴' : '⏵')   // expand → point toward the content

  const homeRoute = role === 'student' ? '#/dashboard' : role === 'mentor' ? '#/mentor' : '#/admin'

  return (
    <aside
      ref={ref}
      className={`slide-bar ${expanded ? 'rail-open' : 'rail-closed'}`}
    >
      {/* Platform Brand & Logo Header */}
      <div
        className="slide-bar-brand"
        title="Synapse"
        onClick={() => go(homeRoute)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          gap: 10,
          padding: expanded ? '14px 16px' : '12px 0',
          cursor: 'pointer',
          borderBottom: '1px solid var(--line)',
          transition: 'all .2s ease',
        }}
      >
        <Logo size={expanded ? 30 : 26} />
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              {t('appName')}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {role === 'mentor' ? 'پنل مشاور تخصصی' : role === 'admin' ? 'پنل مدیریت سیستم' : 'سامانه هوشمند کنکور'}
            </span>
          </div>
        )}
      </div>

      <div className="slide-bar-scroll">
        {items.map((it) => {
          const active = isActive(it)
          return (
            <button
              key={it.key}
              className={`slide-item ${active ? 'active' : ''}`}
              title={t(it.labelKey)}
              onClick={() => go(it.route)}
            >
              <span className="slide-ico">{it.icon}</span>
              {expanded && <span className="slide-label">{t(it.labelKey)}</span>}
            </button>
          )
        })}
      </div>

      <div className="slide-bar-foot">
        <button
          className={`slide-item slide-profile ${isActive({ key: 'profile', route: '#/profile' }) ? 'active' : ''}`}
          title={t('navProfile')}
          onClick={() => go('#/profile')}
        >
          <span className="slide-ico">👤</span>
          {expanded && <span className="slide-label">{t('navProfile')}</span>}
        </button>
        <button
          className="slide-toggle"
          title={t('slideToggle')}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {chev}
        </button>
      </div>
    </aside>
  )
}

