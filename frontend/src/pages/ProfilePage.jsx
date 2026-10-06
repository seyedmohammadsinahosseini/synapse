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
  const isEn = lang === 'en'
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
    user?.role === 'mentor'
      ? '#/mentor'
      : user?.role === 'admin'
      ? '#/admin'
      : '#/dashboard'

  const roleKey =
    user?.role === 'student'
      ? (isEn ? 'Student' : 'دانش‌آموز')
      : user?.role === 'mentor'
      ? (isEn ? 'Academic Mentor' : 'مشاور تحصیلی')
      : user?.role === 'admin'
      ? (isEn ? 'System Administrator' : 'مدیر سامانه')
      : user?.role || '—'

  return (
    <div className="profile-page-modern" style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── 1. Elevated Hero Header (Optically Centered Elements) ── */}
      <div
        className="profile-elevated-hero"
        style={{
          background: ROLE_BG[user?.role] || ROLE_BG.student,
          borderRadius: 24,
          padding: '32px 28px',
          color: '#fff',
          boxShadow: '0 20px 45px rgba(79, 70, 229, 0.25)',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            width: '100%',
          }}
        >
          {/* Avatar */}
          <div
            className="avatar"
            style={{
              width: 86,
              height: 86,
              fontSize: 36,
              background: 'rgba(255,255,255,0.24)',
              color: '#fff',
              borderRadius: '50%',
              backdropFilter: 'blur(10px)',
              border: '3px solid rgba(255,255,255,0.5)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
            }}
          >
            {(user?.full_name || '؟').slice(0, 1)}
          </div>

          {/* Name & Role */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {user?.full_name || t('profileTitle')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  padding: '4px 14px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{ROLE_ICON[user?.role]}</span>
                <span>{roleKey}</span>
              </span>
              <span style={{ opacity: 0.9, fontSize: 13.5 }}>
                {user?.email}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              style={{
                background: '#ffffff',
                color: '#4f46e5',
                borderRadius: 14,
                padding: '9px 22px',
                fontWeight: 800,
                fontSize: 13.5,
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setEditModalOpen(true)}
            >
              ✏️ {isEn ? 'Edit Profile Details' : 'ویرایش مشخصات فردی'}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              style={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.6)',
                borderRadius: 12,
                padding: '9px 18px',
                fontWeight: 700,
              }}
              onClick={() => navigate(backHome)}
            >
              {isEn ? '← Back to Home' : '← بازگشت به خانه'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      {/* ── 2. Optically Centered 4-Metric Squares Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Metric 1: Access Role */}
        <div
          className="card stat-card"
          style={{
            borderRadius: 20,
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
            border: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>{ROLE_ICON[user?.role]}</div>
          <span className="small muted" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
            {isEn ? 'Access Role' : 'سطح دسترسی'}
          </span>
          <b style={{ fontSize: 16, color: 'var(--ink)' }}>{roleKey}</b>
        </div>

        {/* Metric 2: Contact Phone */}
        <div
          className="card stat-card"
          style={{
            borderRadius: 20,
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
            border: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
          <span className="small muted" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
            {isEn ? 'Mobile Phone' : 'شماره تماس'}
          </span>
          <b dir="ltr" style={{ fontSize: 15, color: 'var(--ink)' }}>
            {user?.phone ? fa(user.phone) : (isEn ? 'Not recorded' : 'ثبت نشده')}
          </b>
        </div>

        {/* Metric 3: Account Status */}
        <div
          className="card stat-card"
          style={{
            borderRadius: 20,
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
            border: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
          <span className="small muted" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
            {isEn ? 'Account Status' : 'وضعیت حساب'}
          </span>
          <span
            className="badge"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a',
              fontSize: 12,
              padding: '3px 12px',
              borderRadius: 999,
              fontWeight: 800,
            }}
          >
            ✓ {isEn ? 'Active & Verified' : 'فعال و تاییدشده'}
          </span>
        </div>

        {/* Metric 4: Location / Province */}
        <div
          className="card stat-card"
          style={{
            borderRadius: 20,
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
            border: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
          <span className="small muted" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
            {isEn ? 'Location / Region' : 'استان / شهر محل سکونت'}
          </span>
          <b style={{ fontSize: 15, color: 'var(--ink)' }}>
            {user?.address || (isEn ? 'Tehran, Iran' : 'تهران، ایران')}
          </b>
        </div>
      </div>

      {/* ── 3. Profile Sections Grid (Centered Cards) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Account Summary Card */}
        <Card
          style={{
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>👤</div>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>
                {isEn ? 'Account Summary' : 'خلاصه اطلاعات کاربری'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <span className="small muted">{isEn ? 'Full Name:' : 'نام و نام خانوادگی:'}</span>
                <b>{user?.full_name || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <span className="small muted">{isEn ? 'Email Address:' : 'پست الکترونیک:'}</span>
                <b dir="ltr">{user?.email || '—'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <span className="small muted">{isEn ? 'Phone Number:' : 'شماره تماس:'}</span>
                <b dir="ltr">{user?.phone ? fa(user.phone) : (isEn ? 'Not recorded' : 'ثبت نشده')}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small muted">{isEn ? 'Address / City:' : 'آدرس / استان:'}</span>
                <b>{user?.address || (isEn ? 'Not specified' : 'ثبت نشده')}</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn ghost sm"
              style={{ borderRadius: 12, padding: '8px 20px', fontWeight: 700 }}
              onClick={() => setEditModalOpen(true)}
            >
              ✏️ {isEn ? 'Edit Info' : 'تغییر مشخصات'}
            </button>
          </div>
        </Card>

        {/* Security & Password Card */}
        <Card
          style={{
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: 'var(--ink)' }}>
              {isEn ? 'Security & Password' : 'امنیت و کلمه عبور'}
            </h3>
            <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.6, maxWidth: 280 }}>
              {isEn
                ? 'To keep your account secure, change your password periodically using strong letters and numbers.'
                : 'جهت حفظ امنیت حساب کاربری، توصیه می‌شود کلمه عبور خود را دوره‌ای تغییر داده و از رمزهای ترکیبی استفاده کنید.'}
            </p>
          </div>
          <button
            type="button"
            className="btn ghost"
            style={{ borderRadius: 12, width: '100%', justifyContent: 'center', fontWeight: 800 }}
            onClick={() => {
              setPwOpen(true)
              setPwErr('')
            }}
          >
            🔑 {isEn ? 'Change Password' : 'تغییر کلمه عبور'}
          </button>
        </Card>

        {/* Language & UI Settings */}
        <Card
          style={{
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌐</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: 'var(--ink)' }}>
              {isEn ? 'System Language' : 'زبان سامانه (Language)'}
            </h3>
            <div className="lang-switch" style={{ borderRadius: 14, width: '100%', maxWidth: 280, margin: '0 auto' }}>
              <span className={`lang-thumb ${lang === 'en' ? 'thumb-en' : ''}`} />
              <button
                type="button"
                key={'fa-' + lang}
                className={`lang-opt ${lang === 'fa' ? 'active' : ''}`}
                onClick={() => setLang('fa')}
              >
                <span className="flag">🇮🇷</span> {isEn ? 'Persian (FA)' : 'فارسی (پیش‌فرض)'}
              </button>
              <button
                type="button"
                key={'en-' + lang}
                className={`lang-opt ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                <span className="flag">🇬🇧</span> English (EN)
              </button>
            </div>
          </div>
          <span className="small muted" style={{ marginTop: 14, fontSize: 11.5 }}>
            {isEn ? 'Layout and typography adapt seamlessly' : 'چیدمان و نگارش به‌صورت خودکار هماهنگ می‌شود'}
          </span>
        </Card>

        {/* Session & Logout */}
        <Card
          style={{
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: 'var(--ink)' }}>
              {isEn ? 'Session & Logout' : 'مدیریت نشست و خروج'}
            </h3>
            <p className="small muted" style={{ marginBottom: 16, lineHeight: 1.6, maxWidth: 280 }}>
              {isEn
                ? 'Click below to securely end your active session and log out.'
                : 'برای خروج امن از پنل کاربری روی دکمه زیر کلیک کنید.'}
            </p>
          </div>
          <button
            type="button"
            className="btn danger sm block"
            style={{ borderRadius: 12, width: '100%', padding: '10px 0', fontWeight: 800 }}
            onClick={() => setLogoutAsk(true)}
          >
            🚪 {isEn ? 'Sign Out of Account' : 'خروج از حساب کاربری'}
          </button>
        </Card>
      </div>

      {/* Floating Edit Profile Modal */}
      {editModalOpen && form && (
        <Modal
          title={isEn ? '✏️ Edit Profile Details' : '✏️ ویرایش مشخصات فردی'}
          onClose={() => setEditModalOpen(false)}
        >
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
                  style={{ textAlign: isEn ? 'left' : 'right' }}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('phoneLabel')}</span>
                <input
                  className="input"
                  dir="ltr"
                  style={{ textAlign: isEn ? 'left' : 'right' }}
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
                placeholder={isEn ? 'City / Province of residence' : 'شهر یا استان محل سکونت'}
              />
            </label>
          </div>
          <div className="flex mt" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button type="button" className="btn ghost" onClick={() => setEditModalOpen(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn primary" disabled={saving} onClick={save}>
              {saving
                ? (isEn ? 'Saving...' : 'در حال ذخیره...')
                : (isEn ? 'Save Changes' : 'ذخیره تغییرات')}
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
            <button type="button" className="btn primary" disabled={pwBusy} onClick={changePass}>
              {t('saveChanges')}
            </button>
          </div>
        </Modal>
      )}

      {/* Logout Confirmation Modal */}
      {logoutAsk && (
        <Modal title={t('logoutConfirmTitle')} onClose={() => setLogoutAsk(false)}>
          <div className="small mb" style={{ fontSize: 14, lineHeight: 1.6 }}>
            ⚠️ {t('logoutConfirmText')}
          </div>
          <div className="flex" style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <button type="button" className="btn ghost sm" onClick={() => setLogoutAsk(false)}>
              {t('stayLogged')}
            </button>
            <button
              type="button"
              className="btn sm danger"
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
