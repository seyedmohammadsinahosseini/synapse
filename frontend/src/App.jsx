import { Component, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth.jsx'
import { LangProvider, useLang } from './i18n.jsx'
import { ThemeProvider, useTheme } from './theme.jsx'
import { api, clearSession, getToken } from './api.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import HomePage from './pages/HomePage.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import PlanPage from './pages/PlanPage.jsx'
import ReportCardPage from './pages/ReportCardPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import ConsultBooking from './pages/ConsultBooking.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import MentorDashboard from './pages/MentorDashboard.jsx'
import MentorStudents from './pages/MentorStudents.jsx'
import MentorSupervise from './pages/MentorSupervise.jsx'
import MentorSchedule from './pages/MentorSchedule.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ExamPanel from './pages/ExamPanel.jsx'
import QuestionGenerator from './pages/QuestionGenerator.jsx'
import SlideBar from './components/SlideBar.jsx'
import AdminSupportBell from './components/AdminSupportBell.jsx'
import FloatingAssistant from './components/FloatingAssistant.jsx'
import FloatingMentorChat from './components/FloatingMentorChat.jsx'
import AppearanceStudio from './components/AppearanceStudio.jsx'
import FloatingSettingsPanel from './components/FloatingSettingsPanel.jsx'
import { getTodayDisplayDate } from './utils/dateUtils.js'
import { Logo } from './ui.jsx'

// ── tiny hash router ───────────────────────────────────────────────────
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = (path) => {
    window.location.hash = path
  }
  return [hash, navigate]
}

/** Catches a crashing page and shows the error instead of a blank screen. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(err, info) {
    console.error('[page error]', err, info)
  }
  render() {
    if (this.state.err) {
      return (
        <div className="crash-box">
          <div style={{ fontSize: 40 }}>🤯</div>
          <div className="small muted">یک خطای غیرمنتظره رخ داد / Something went wrong</div>
          <pre dir="ltr">{String(this.state.err && (this.state.err.message || this.state.err))}</pre>
          <div className="flex" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button className="btn" onClick={() => { this.setState({ err: null }); window.location.hash = '#/dashboard' }}>
              بازگشت به خانه / Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function Shell({ children, route, navigate, bare = false, hideFloats = false }) {
  const { user } = useAuth()
  const { t, lang, setLang } = useLang()
  const [showStudio, setShowStudio] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const role = user?.role
  const showRail = !bare && !!role
  const loggedIn = !!user

  const cls = ['app-shell']
  if (role === 'student' && !bare) cls.push('dual-fabs')
  if (lang === 'en') cls.push('lang-en')
  if (showRail) cls.push('has-permanent-rail')

  const todayStr = getTodayDisplayDate(lang)

  return (
    <div className={cls.join(' ')}>
      <header className="topbar">
        {/* Brand Header: Logo + Name Always Visible */}
        <a className="brand" href="#/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={32} />
          <span style={{ fontWeight: 900, fontSize: 17.5, color: 'var(--ink)' }}>{t('appName')}</span>
        </a>

        {/* Center: Persian / Gregorian Date Display (Mathematically & Optically Dead-Centered) */}
        <div
          className="topbar-center-date"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span
            className="badge topbar-date-pill"
            style={{
              background: 'var(--tint-fill)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              padding: '5px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              boxShadow: 'var(--shadow-subtle)',
              pointerEvents: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            🗓️ {todayStr}
          </span>
        </div>

        {/* User / Settings / Bell Actions */}
        <div className="topbar-user" style={{ position: 'relative' }}>
          {role === 'admin' && <AdminSupportBell />}

          {/* Minimalist Monochrome Outline Settings Button */}
          <button
            type="button"
            className="btn ghost sm icon-btn topbar-settings-btn"
            onClick={() => setShowSettings((v) => !v)}
            title={lang === 'fa' ? 'تنظیمات و حساب کاربری' : 'Settings & Profile'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              padding: 0,
              display: 'grid',
              placeItems: 'center',
              border: showSettings ? '1.5px solid var(--primary)' : '1px solid var(--line)',
              background: showSettings ? 'var(--tint-fill)' : 'transparent',
              color: 'var(--ink)',
              transition: 'all 0.18s var(--ease-spring)',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Floating Settings Popover */}
          <FloatingSettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onOpenStudio={() => setShowStudio(true)}
            navigate={navigate}
          />
        </div>
      </header>

      <div className={`app-frame ${showRail ? 'with-rail' : ''}`}>
        <main className={`app-main${route === '#/chat' ? ' chat-main' : ''}`}>
          <div className="route-page-container" key={route}>
            <ErrorBoundary key={route}>{children}</ErrorBoundary>
          </div>
        </main>
        {/* Permanent slim rail */}
        {showRail && <SlideBar role={role} route={route} navigate={navigate} />}
      </div>

      {/* Appearance Studio Modal */}
      <AppearanceStudio isOpen={showStudio} onClose={() => setShowStudio(false)} />

      {/* Footer only on auth pages */}
      {!bare && !loggedIn && <footer className="app-footer">{t('footer')}</footer>}

      {/* Floating assistants */}
      {!bare && !hideFloats && role === 'student' && (
        <FloatingAssistant navigate={navigate} />
      )}
      {!bare && !hideFloats && role === 'student' && (
        <FloatingMentorChat studentId={user.id} raised />
      )}
      {!bare && !hideFloats && role === 'mentor' && (
        <FloatingMentorChat mode="mentor" />
      )}
    </div>
  )
}

function Routes() {
  const [hash, navigate] = useHashRoute()
  const { user } = useAuth()

  const route = hash.split('?')[0]
  const query = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null

  if (!user) {
    let guestPage
    if (route === '#/register') guestPage = <Register navigate={navigate} />
    else if (route === '#/login') guestPage = <Login navigate={navigate} />
    else guestPage = <HomePage navigate={navigate} />
    return (
      <Shell route={route} navigate={navigate}>
        {guestPage}
      </Shell>
    )
  }

  const role = user.role
  const params = { navigate }

  // exam — immersive, no rail/floats
  if (route.startsWith('#/exam/')) {
    if (role !== 'student') {
      window.location.hash = '#/dashboard'
      return null
    }
    return (
      <Shell route={route} navigate={navigate} bare>
        <ExamPanel examId={route.split('/')[2]} navigate={navigate} />
      </Shell>
    )
  }

  // profile — accessible from top settings menu
  if (route === '#/profile') {
    return (
      <Shell route={route} navigate={navigate}>
        <ProfilePage {...params} />
      </Shell>
    )
  }

  // Question Generator & Assessment Studio
  if (route === '#/questions' || route === '#/questions/generate' || route === '#/question-generator') {
    return (
      <Shell route={route} navigate={navigate}>
        <QuestionGenerator {...params} />
      </Shell>
    )
  }

  if (role === 'student') {
    if (route === '#/plan') {
      return (
        <Shell route={route} navigate={navigate}>
          <PlanPage {...params} />
        </Shell>
      )
    }
    if (route === '#/report-cards' || route === '#/report-card') {
      return (
        <Shell route={route} navigate={navigate}>
          <ReportCardPage {...params} />
        </Shell>
      )
    }
    if (route === '#/chat') {
      return (
        <Shell route={route} navigate={navigate} hideFloats>
          <ChatPage {...params} />
        </Shell>
      )
    }
    if (route === '#/consult') {
      return (
        <Shell route={route} navigate={navigate}>
          <ConsultBooking {...params} />
        </Shell>
      )
    }
    if (route === '#/history') {
      return (
        <Shell route={route} navigate={navigate}>
          <HistoryPage {...params} />
        </Shell>
      )
    }
    return (
      <Shell route={route} navigate={navigate}>
        <StudentDashboard {...params} />
      </Shell>
    )
  }

  if (role === 'mentor') {
    if (route === '#/chat') {
      const preselect = query?.get('student')
      return (
        <Shell route={route} navigate={navigate} hideFloats>
          <ChatPage {...params} preselectStudent={preselect ? Number(preselect) : null} />
        </Shell>
      )
    }
    if (route.startsWith('#/mentor/student/')) {
      return (
        <Shell route={route} navigate={navigate}>
          <MentorSupervise studentId={Number(route.split('/')[3])} {...params} />
        </Shell>
      )
    }
    if (route === '#/mentor/students') {
      return (
        <Shell route={route} navigate={navigate}>
          <MentorStudents {...params} />
        </Shell>
      )
    }
    if (route === '#/mentor/schedule') {
      return (
        <Shell route={route} navigate={navigate}>
          <MentorSchedule {...params} />
        </Shell>
      )
    }
    return (
      <Shell route={route} navigate={navigate}>
        <MentorDashboard {...params} />
      </Shell>
    )
  }

  if (role === 'admin') {
    const section = route === '#/admin/students' ? 'students'
      : route === '#/admin/mentors' ? 'mentors'
      : route === '#/admin/questions' ? 'questions'
      : 'stats'
    return (
      <Shell route={route} navigate={navigate}>
        <AdminDashboard {...params} section={section} navigate={navigate} />
      </Shell>
    )
  }

  return (
    <Shell route={route} navigate={navigate}>
      <StudentDashboard {...params} navigate={navigate} />
    </Shell>
  )
}

function useBootCheck() {
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!getToken()) {
      setChecked(true)
      return
    }
    api('/api/auth/me')
      .catch(() => clearSession())
      .finally(() => setChecked(true))
  }, [])
  return checked
}

function BootGate({ children }) {
  const ok = useBootCheck()
  if (!ok) return <div className="empty">…</div>
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <BootGate>
              <Routes />
            </BootGate>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
