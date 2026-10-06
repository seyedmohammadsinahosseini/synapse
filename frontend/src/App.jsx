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
import SlideBar from './components/SlideBar.jsx'
import AdminSupportBell from './components/AdminSupportBell.jsx'
import FloatingAssistant from './components/FloatingAssistant.jsx'
import FloatingMentorChat from './components/FloatingMentorChat.jsx'
import AppearanceStudio from './components/AppearanceStudio.jsx'
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
  const { theme, toggle } = useTheme()
  const [showStudio, setShowStudio] = useState(false)
  const role = user?.role
  const showRail = !bare && !!role
  const loggedIn = !!user

  const cls = ['app-shell']
  if (role === 'student' && !bare) cls.push('dual-fabs')
  if (lang === 'en') cls.push('lang-en')

  return (
    <div className={cls.join(' ')}>
      <header className="topbar">
        {!showRail ? (
          <a className="brand" href="#/">
            <Logo size={34} />
            <span>{t('appName')}</span>
          </a>
        ) : (
          <div className="topbar-space" style={{ width: 10 }}></div>
        )}
        <div className="topbar-user">
          {role === 'admin' && <AdminSupportBell />}

          {/* Appearance studio skin button */}
          <button
            type="button"
            className="btn ghost sm icon-btn"
            style={{ borderRadius: 10, fontSize: 16 }}
            onClick={() => setShowStudio(true)}
            title={lang === 'fa' ? 'شخصی‌سازی پوسته و تم' : 'Appearance Studio'}
          >
            🎨
          </button>

          <div className="theme-uiverse-wrap" title={t(theme === 'dark' ? 'themeLight' : 'themeDark')}>
            <input
              className="theme-uiverse-input"
              id="theme-dn-toggle"
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggle}
              aria-label="Toggle dark/light theme"
            />
            <label className="theme-uiverse-toggle" htmlFor="theme-dn-toggle">
              <span className="toggle__handler">
                <span className="crater crater--1" />
                <span className="crater crater--2" />
                <span className="crater crater--3" />
              </span>
              <span className="star star--1" />
              <span className="star star--2" />
              <span className="star star--3" />
              <span className="star star--4" />
              <span className="star star--5" />
              <span className="star star--6" />
            </label>
          </div>
          {/* language toggle lives in Profile — shown in the top bar only on
              the login/register pages so guests can still switch */}
          {!loggedIn && (
            <button
              className="btn ghost sm lang-btn"
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            >
              {lang === 'fa' ? 'EN' : 'FA'}
            </button>
          )}
          {loggedIn && (
            <span className="chip">{user.full_name}</span>
          )}
        </div>
      </header>

      <div className={`app-frame ${showRail ? 'with-rail' : ''}`}>
        <main className={`app-main${route === '#/chat' ? ' chat-main' : ''}`}>
          <ErrorBoundary key={route}>{children}</ErrorBoundary>
        </main>
        {/* floating drawer — overlays the page; never resizes it */}
        {showRail && <SlideBar role={role} route={route} navigate={navigate} />}
      </div>

      {/* Appearance Studio Modal */}
      <AppearanceStudio isOpen={showStudio} onClose={() => setShowStudio(false)} />

      {/* the footer text only belongs to the auth screens */}
      {!bare && !loggedIn && <footer className="app-footer">{t('footer')}</footer>}

      {/* floating chats — on the inline-end edge (left in fa / right in en),
          opposite the slide-bar; hidden inside the full messenger page and
          while taking an exam */}
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

  // profile — available to every role from the slide-bar
  if (route === '#/profile') {
    return (
      <Shell route={route} navigate={navigate}>
        <ProfilePage {...params} />
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

// Validate a stored token once at boot — ALWAYS, even if a user object is
// cached. A stale token would otherwise load the panel and 401 on every call.
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return checked
}

function BootGate({ children }) {
  const ok = useBootCheck()
  if (!ok) return <div className="empty">…</div>
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <BootGate>
            <Routes />
          </BootGate>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  )
}
