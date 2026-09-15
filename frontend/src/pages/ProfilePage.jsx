import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Modal, Badge } from '../ui.jsx'
import { useToast } from '../components/Toast.jsx'

const ROLE_ICON = { student: '🎓', mentor: '🧑‍🏫', admin: '🛡️' }
const ROLE_BG = {
  student: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  mentor: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
  admin: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
}

export default function ProfilePage({ navigate }) {
  const { t, lang, setLang } = useLang()
  const { user, update, logout } = useAuth()
  const { show, view } = useToast()

  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

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
    setSaving(true)
    setError('')
    try {
      const updated = await api('/api/auth/me', { method: 'PATCH', body: form })
      update(updated)
      setEditModalOpen(false)
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
    <div className="profile-page-modern">
      {/* ── Elevated Hero Card ── */}
      <div
        className="profile-elevated-hero"
        style={{
          background: ROLE_BG[user?.role] || ROLE_BG.student,
          borderRadius: 24,
          padding: '32px 28px',
          color: '#fff',
          boxShadow: '0 20px 45px rgba(79, 70, 229, 0.25)',
          marginBottom: 30,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              className="avatar"
              style={{
                width: 76,
                height: 76,
                fontSize: 32,
                background: 'rgba(255,255,255,0.22)',
                color: '#fff',
                borderRadius: 22,
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.4)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              }}
            >
              {(user?.full_name || '؟').slice(0, 1)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{user?.full_name || t('profileTitle')}</h2>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '4px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {ROLE_ICON[user?.role]} {roleKey}
                </span>
              </div>
              <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
                {user?.email} {user?.phone ? `· ${user.phone}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn"
              style={{
                background: '#ffffff',
                color: '#4f46e5',
                borderRadius: 14,
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                border: 'none',
              }}
              onClick={() => setEditModalOpen(true)}
            >
              ✏️ {lang === 'fa' ? 'ویرایش مشخصات فردی' : 'Edit Profile Details'}
            </button>
            <button
              className="btn ghost sm"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', borderRadius: 12, padding: '10px 16px' }}
              onClick={() => navigate(backHome)}
            >
              {lang === 'fa' ? '← بازگشت' : '← Back'}
            </button>
          </div>
        </div>

        {/* Floating Badges in Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '6px 14px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✉️ {user?.email}
          </span>
          {user?.role === 'mentor' && user?.code && (
            <span
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '6px 14px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              🔑 {lang === 'fa' ? 'کد اختصاصی مشاور:' : 'Mentor Code:'} {user.code}
            </span>
          )}
          <span
            style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '6px 14px',
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            🛡️ {lang === 'fa' ? 'امنیت: حساب احراز هویت شده' : 'Security: Verified Account'}
          </span>
        </div>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      {/* Grid of Profile Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Personal Overview Card */}
        <Card style={{ borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👤</span>
              <span>{lang === 'fa' ? 'خلاصه اطلاعات کاربری' : 'Account Summary'}</span>
            </h3>
            <button
              className="btn ghost sm"
              style={{ borderRadius: 10, fontSize: 12 }}
              onClick={() => setEditModalOpen(true)}
            >
              {lang === 'fa' ? 'تغییر مشخصات' : 'Edit Info'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
              <span className="small muted">{lang === 'fa' ? 'نام و نام خانوادگی:' : 'Full Name:'}</span>
              <b>{user?.full_name || '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
              <span className="small muted">{lang === 'fa' ? 'پست الکترونیک:' : 'Email Address:'}</span>
              <b dir="ltr">{user?.email || '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
              <span className="small muted">{lang === 'fa' ? 'شماره تماس:' : 'Phone Number:'}</span>
              <b dir="ltr">{user?.phone || '—'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="small muted">{lang === 'fa' ? 'آدرس / استان:' : 'Address / City:'}</span>
              <b>{user?.address || (lang === 'fa' ? 'ثبت نشده' : 'Not specified')}</b>
            </div>
          </div>
        </Card>

        {/* Security & Password Card */}
        <Card style={{ borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{lang === 'fa' ? 'امنیت و کلمه عبور' : 'Security & Password'}</h3>
          </div>
          <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.6 }}>
            {lang === 'fa'
              ? 'جهت حفظ امنیت حساب کاربری، توصیه می‌شود کلمه عبور خود را دوره‌ای تغییر داده و از رمزهای ترکیبی استفاده کنید.'
              : 'To keep your account secure, change your password periodically using strong letters and numbers.'
            }
          </p>
          <button
            className="btn ghost"
            style={{ borderRadius: 12, width: '100%', justifyContent: 'center' }}
            onClick={() => { setPwOpen(true); setPwErr('') }}
          >
            🔑 {lang === 'fa' ? 'تغییر کلمه عبور' : 'Change Password'}
          </button>
        </Card>

        {/* Language & UI Settings */}
        <Card style={{ borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🌐</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{lang === 'fa' ? 'زبان سامانه (Language)' : 'System Language'}</h3>
          </div>
          <div className="lang-switch" style={{ borderRadius: 14 }}>
            <span className={`lang-thumb ${lang === 'en' ? 'thumb-en' : ''}`} />
            <button
              key={'fa-' + lang}
              className={`lang-opt ${lang === 'fa' ? 'active' : ''}`}
              onClick={() => setLang('fa')}
            >
              <span className="flag">🇮🇷</span> {lang === 'fa' ? 'فارسی (پیش‌فرض)' : 'Persian (FA)'}
            </button>
            <button
              key={'en-' + lang}
              className={`lang-opt ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              <span className="flag">🇬🇧</span> English (EN)
            </button>
          </div>
        </Card>

        {/* Session & Logout */}
        <Card style={{ borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🚪</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{lang === 'fa' ? 'مدیریت نشست و خروج' : 'Session & Logout'}</h3>
          </div>
          <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.6 }}>
            {lang === 'fa'
              ? 'برای خروج امن از پنل کاربری روی دکمه زیر کلیک کنید.'
              : 'Click below to securely end your active session and log out.'
            }
          </p>
          <button
            className="btn sm logout-red"
            style={{ borderRadius: 12, width: '100%', padding: '10px 0' }}
            onClick={() => setLogoutAsk(true)}
          >
            🚪 {lang === 'fa' ? 'خروج از حساب کاربری' : 'Sign Out of Account'}
          </button>
        </Card>
      </div>

      {/* Floating Edit Profile Modal */}
      {editModalOpen && form && (
        <Modal title={lang === 'fa' ? '✏️ ویرایش مشخصات فردی' : '✏️ Edit Profile Details'} onClose={() => setEditModalOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>{t('fieldName')}</span>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </label>
            <div className="two-col">
              <label className="field">
                <span>{t('emailLabel')}</span>
                <input
                  className="input"
                  dir="ltr"
                  style={{ textAlign: lang === 'fa' ? 'right' : 'left' }}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('phoneLabel')}</span>
                <input
                  className="input"
                  dir="ltr"
                  style={{ textAlign: lang === 'fa' ? 'right' : 'left' }}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>{t('addressLabel')}</span>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={lang === 'fa' ? 'شهر یا استان محل سکونت' : 'City / Province of residence'}
              />
            </label>
          </div>
          <div className="flex mt" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button className="btn ghost" onClick={() => setEditModalOpen(false)}>{t('cancel')}</button>
            <button className="btn" disabled={saving} onClick={save}>
              {saving ? (lang === 'fa' ? 'در حال ذخیره...' : 'Saving...') : (lang === 'fa' ? 'ذخیره تغییرات' : 'Save Changes')}
            </button>
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {pwOpen && (
        <Modal title={t('changePass')} onClose={() => setPwOpen(false)}>
          <div className="small muted mb">{t('changePassSub')}</div>
          {pwErr && <div className="error-box">{pwErr}</div>}
          <label className="field">
            <span>{t('oldPass')}</span>
            <input
              className="input"
              type="password"
              value={pw.old_password}
              onChange={(e) => setPw({ ...pw, old_password: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t('newPass')}</span>
            <input
              className="input"
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t('newPassRepeat')}</span>
            <input
              className="input"
              type="password"
              value={pw.new_password2}
              onChange={(e) => setPw({ ...pw, new_password2: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && changePass()}
            />
          </label>
          <div className="flex mt" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn" disabled={pwBusy} onClick={changePass}>{t('saveChanges')}</button>
          </div>
        </Modal>
      )}

      {/* Logout Confirmation Modal */}
      {logoutAsk && (
        <Modal title={t('logoutConfirmTitle')} onClose={() => setLogoutAsk(false)}>
          <div className="small mb" style={{ fontSize: 14, lineHeight: 1.6 }}>⚠️ {t('logoutConfirmText')}</div>
          <div className="flex" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button className="btn ghost sm" onClick={() => setLogoutAsk(false)}>
              {t('stayLogged')}
            </button>
            <button
              className="btn sm logout-red"
              onClick={() => {
                setLogoutAsk(false)
                logout()
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
