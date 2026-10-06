import { useMemo } from 'react'
import { useLang } from '../i18n.jsx'

// Minimalist Monochrome SVG Icons (Clean in Light & Dark Mode)
const Icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  plan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  ),
  questions: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  report_cards: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  consult: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  students: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  mentors: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <polyline points="10 2 10 10 13 7 16 10 16 2" />
    </svg>
  ),
}

/**
 * Modern Slim Permanent Rail SlideBar
 * - Permanently docked (no open/close toggle)
 * - Ultra-slim (minimal footprint ~64px-76px)
 * - Translucent soft background
 * - Minimalist monochrome icons (crisp in Light & Dark mode)
 * - Includes dedicated "Question Generator" section
 */
export default function SlideBar({ role, route, navigate }) {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const items = useMemo(() => {
    const nav = {
      student: [
        { key: 'home', icon: Icons.home, label: isEn ? 'Dashboard' : 'داشبورد', route: '#/dashboard' },
        { key: 'plan', icon: Icons.plan, label: isEn ? 'Study Plan' : 'برنامه مطالعاتی', route: '#/plan' },
        { key: 'questions', icon: Icons.questions, label: isEn ? 'Questions' : 'ساخت سوالات', route: '#/questions' },
        { key: 'report_cards', icon: Icons.report_cards, label: isEn ? 'Report Cards' : 'کارنامه‌ها', route: '#/report-cards' },
        { key: 'chat', icon: Icons.chat, label: isEn ? 'Messenger' : 'پیام‌ها', route: '#/chat' },
        { key: 'consult', icon: Icons.consult, label: isEn ? 'Consultation' : 'رزرو مشاوره', route: '#/consult' },
        { key: 'history', icon: Icons.history, label: isEn ? 'History' : 'سوابق تحصیلی', route: '#/history' },
      ],
      mentor: [
        { key: 'home', icon: Icons.home, label: isEn ? 'Dashboard' : 'داشبورد', route: '#/mentor' },
        { key: 'students', icon: Icons.students, label: isEn ? 'Students' : 'دانش‌آموزان', route: '#/mentor/students' },
        { key: 'questions', icon: Icons.questions, label: isEn ? 'Questions' : 'ساخت سوالات', route: '#/questions' },
        { key: 'chat', icon: Icons.chat, label: isEn ? 'Messenger' : 'پیام‌ها', route: '#/chat' },
        { key: 'schedule', icon: Icons.consult, label: isEn ? 'Schedule' : 'جلسات مشاوره', route: '#/mentor/schedule' },
      ],
      admin: [
        { key: 'stats', icon: Icons.report_cards, label: isEn ? 'Overview' : 'آمار و گزارشات', route: '#/admin' },
        { key: 'students', icon: Icons.students, label: isEn ? 'Students' : 'دانش‌آموزان', route: '#/admin/students' },
        { key: 'mentors', icon: Icons.mentors, label: isEn ? 'Mentors' : 'مشاوران', route: '#/admin/mentors' },
        { key: 'questions', icon: Icons.questions, label: isEn ? 'Questions' : 'بانک سوالات', route: '#/questions' },
      ],
    }[role] || []
    return nav
  }, [role, isEn])

  const r = (route || '').split('?')[0]

  const isActive = (it) => {
    switch (it.key) {
      case 'home':
        return r === '#/dashboard' || r === '#/mentor' || r === '#/mentor/'
      case 'students':
        return r === '#/admin/students' || r === '#/mentor/students' || r.startsWith('#/mentor/student/')
      case 'chat':
        return r === '#/chat'
      case 'plan':
        return r === '#/plan'
      case 'questions':
        return r === '#/questions' || r === '#/admin/questions'
      case 'report_cards':
        return r === '#/report-cards' || r === '#/report-card'
      case 'consult':
        return r === '#/consult'
      case 'history':
        return r === '#/history'
      case 'schedule':
        return r === '#/mentor/schedule'
      case 'stats':
        return r === '#/admin' || r === '#/admin/'
      case 'mentors':
        return r === '#/admin/mentors'
      default:
        return false
    }
  }

  return (
    <aside
      className="slide-bar slim-permanent-rail"
      style={{
        position: 'fixed',
        top: 64,
        bottom: 0,
        [isEn ? 'left' : 'right']: 0,
        width: 78,
        background: 'color-mix(in srgb, var(--surface) 75%, transparent)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderInlineEnd: '1px solid var(--line)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 6px',
        gap: 8,
        transition: 'all 0.25s var(--ease-spring)',
      }}
    >
      <div
        className="slide-bar-scroll"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((it) => {
          const active = isActive(it)
          return (
            <button
              key={it.key}
              type="button"
              className={`slide-item slim-rail-item ${active ? 'active' : ''}`}
              title={it.label}
              onClick={() => navigate(it.route)}
              style={{
                width: 66,
                minHeight: 58,
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 4px 5px 4px',
                gap: 4,
                background: active ? 'var(--tint-fill)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--ink)',
                border: active ? '1.5px solid var(--primary)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s var(--ease-spring)',
                boxShadow: active ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  color: active ? 'var(--primary)' : 'var(--ink)',
                  opacity: active ? 1 : 0.82,
                  transition: 'transform 0.18s var(--ease-spring)',
                }}
              >
                {it.icon}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? 800 : 600,
                  color: active ? 'var(--primary)' : 'var(--ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 62,
                  lineHeight: 1.25,
                  textAlign: 'center',
                  letterSpacing: '-0.01em',
                }}
              >
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
