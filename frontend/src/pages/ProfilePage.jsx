import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Modal } from '../ui.jsx'
import { useToast } from '../components/Toast.jsx'

const ROLE_ICON = { student: '🎓', mentor: '🧑‍🏫', admin: '🛡️' }

/** User Profile management — shared across all roles. Allows updating contact info and credentials. */
export default function ProfilePage({ navigate }) {
  const { t, lang, setLang } = useLang()
  const { user, update, logout } = useAuth()
  const { show, view } = useToast()

  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ old_password: '', new_password: '', new_password2: '' })
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const [logoutAsk, setLogoutAsk] = useState(false)

  useEffect(() => {
    api('/api/auth/me')
      .then((u) =>
        setForm({
          full_name: u.full_name || '',
          email: u.email || '',
          phone: u.phone || '',
          address: u.address || '',
        })
      )
      .catch((e) => setError(e.message))
  }, [])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const updated = await api('/api/auth/me', { method: 'PATCH', body: form })
      update(updated)
      show(t('savedOk'))
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const changePass = async () => {
    setPwErr('')
    if (pw.new_password !== pw.new_password2) {
      setPwErr(t('passMismatch'))
      return
    }
    setPwBusy(true)
    try {
      await api('/api/auth/me/password', { method: 'POST', body: pw })
      setPwOpen(false)
      setPw({ old_password: '', new_password: '', new_password2: '' })
      show(t('passChanged'))
    } catch (e) {
      setPwErr(e.message)
    } finally {
      setPwBusy(false)
    }
  }

  const backHome =
    user?.role === 'mentor' ? '#/mentor'
    : user?.role === 'admin' ? '#/admin'
    : '#/dashboard'

  const roleKey =
    user?.role === 'student' ? t('studentRole')
    : user?.role === 'mentor' ? t('mentorRole')
    : user?.role === 'admin' ? t('adminRole') : user?.role || '—'

  return (
    <div>
      <div className="hero">
        <div className="flex wrap between">
          <div className="flex" style={{ gap: 14 }}>
            <div className="avatar" style={{ width: 58, height: 58, fontSize: 26, background: 'rgba(255,255,255,.25)', color: '#fff' }}>
              {(user?.full_name || '؟').slice(0, 1)}
            </div>
            <div>
              <h2>{ROLE_ICON[user?.role]} {t('profileTitle')}</h2>
              <p>{t('profileSub')}</p>
            </div>
          </div>
          <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate(backHome)}>
            ← {t('backBtn')}
          </button>
        </div>
        <div className="flex wrap mt">
          <span className="badge">{t('roleLabel')}: {roleKey}</span>
          {user?.role === 'mentor' && user?.code && (
            <span className="badge">{t('codeLabel')}: {user.code}</span>
          )}
          <span className="badge">ID: {fa(user?.id)}</span>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* personal info */}
      <div className="section-title">👤 {t('myInfo')}</div>
      <Card style={{ maxWidth: 720 }}>
        {!form && <div className="empty">…</div>}
        {form && (
          <>
            <label className="field"><span>{t('fieldName')}</span>
              <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
            <div className="two-col">
              <label className="field"><span>{t('emailLabel')}</span>
                <input className="input" dir="ltr" style={{ textAlign: 'right' }} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="field"><span>{t('phoneLabel')}</span>
                <input className="input" dir="ltr" style={{ textAlign: 'right' }} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            </div>
            <label className="field"><span>{t('addressLabel')}</span>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <div className="flex" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" disabled={saving} onClick={save}>{t('saveChanges')}</button>
            </div>
          </>
        )}
      </Card>

      {/* password */}
      <div className="section-title">🔒 {t('changePass')}</div>
      <Card style={{ maxWidth: 720 }}>
        <div className="small muted mb">{t('changePassSub')}</div>
        <div className="small muted mb" style={{ fontSize: 12 }}>{t('passNote')}</div>
        <button className="btn ghost" onClick={() => { setPwOpen(true); setPwErr('') }}>
          🔒 {t('changePass')}
        </button>
      </Card>

      {pwOpen && (
        <Modal title={t('changePass')} onClose={() => setPwOpen(false)}>
          <div className="small muted mb">{t('changePassSub')}</div>
          {pwErr && <div className="error-box">{pwErr}</div>}
          <label className="field"><span>{t('oldPass')}</span>
            <input className="input" type="password" value={pw.old_password}
              onChange={(e) => setPw({ ...pw, old_password: e.target.value })} /></label>
          <label className="field"><span>{t('newPass')}</span>
            <input className="input" type="password" value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></label>
          <label className="field"><span>{t('newPassRepeat')}</span>
            <input className="input" type="password" value={pw.new_password2}
              onChange={(e) => setPw({ ...pw, new_password2: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && changePass()} /></label>
          <div className="small muted mb" style={{ fontSize: 12 }}>{t('passNote')}</div>
          <div className="flex" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" disabled={pwBusy} onClick={changePass}>{t('saveChanges')}</button>
          </div>
        </Modal>
      )}

      {/* language */}
      <div className="section-title">🌐 {t('appLanguage')}</div>
      <Card style={{ maxWidth: 720 }}>
        <div className="lang-switch">
          <span className={`lang-thumb ${lang === 'en' ? 'thumb-en' : ''}`} />
          <button
            key={'fa-' + lang}
            className={`lang-opt ${lang === 'fa' ? 'active' : ''}`}
            onClick={() => setLang('fa')}
          >
            <span className="flag">🇮🇷</span> فارسی
          </button>
          <button
            key={'en-' + lang}
            className={`lang-opt ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            <span className="flag">🇬🇧</span> English
          </button>
        </div>
        <div className="small muted mt" style={{ fontSize: 12 }}>{t('langHint')}</div>
      </Card>

      {/* logout — red, with a confirmation */}
      <div className="section-title">🚪 {t('logoutBtn')}</div>
      <Card style={{ maxWidth: 720 }}>
        <div className="small muted mb">
          {t('logoutBtn')}
        </div>
        <button className="btn sm logout-red" onClick={() => setLogoutAsk(true)}>
          🚪 {t('logoutBtn')}
        </button>
      </Card>

      {logoutAsk && (
        <Modal title={t('logoutConfirmTitle')} onClose={() => setLogoutAsk(false)}>
          <div className="small mb">⚠️ {t('logoutConfirmText')}</div>
          <div className="flex" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost sm" onClick={() => setLogoutAsk(false)}>
              {t('stayLogged')}
            </button>
            <button
              className="btn sm logout-red"
              onClick={() => {
                setLogoutAsk(false)
                logout()
                // after logout, guests always land on the Home page first
                window.location.hash = '#/'
              }}
            >
              {t('confirmLogout')}
            </button>
          </div>
        </Modal>
      )}

      {view}
    </div>
  )
}
