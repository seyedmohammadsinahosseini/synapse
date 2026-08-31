import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Logo } from '../ui.jsx'

export default function Login({ navigate }) {
  const { login } = useAuth()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const msg = sessionStorage.getItem('session_msg')
    if (msg) {
      setError(msg)
      sessionStorage.removeItem('session_msg')
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      login(data.token, data.user)
      const home =
        data.user.role === 'admin'
          ? '#/admin'
          : data.user.role === 'mentor'
          ? '#/mentor'
          : '#/dashboard'
      navigate(home)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <Card className="auth-card">
        <div className="auth-hero">
          <Logo size={56} />
          <h1>{t('loginTitle')}</h1>
          <p>{t('loginSub')}</p>
        </div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={submit}>
          <label className="field">
            <span>{t('emailLabel')}</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
            />
          </label>
          <label className="field">
            <span>{t('passwordLabel')}</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('pwPlaceholder')}
              required
            />
          </label>
          <button className="btn block" disabled={loading}>
            {loading ? t('loggingIn') : t('loginBtn')}
          </button>
        </form>
        <p className="small muted mt" style={{ textAlign: 'center' }}>
          {t('noAccount')} <a href="#/register">{t('signupLink')}</a>
        </p>
      </Card>
      <a className="auth-back" href="#/">
        <span>{t('homeBack')}</span>
      </a>
    </div>
  )
}
