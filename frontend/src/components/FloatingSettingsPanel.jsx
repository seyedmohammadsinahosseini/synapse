import { useEffect, useRef } from 'react'
import { useAuth } from '../auth.jsx'
import { useTheme } from '../theme.jsx'
import { useLang } from '../i18n.jsx'
import { clearSession } from '../api.js'
import AnimatedThemeToggle from './AnimatedThemeToggle.jsx'

export default function FloatingSettingsPanel({ isOpen, onClose, onOpenStudio, navigate }) {
  const { user } = useAuth()
  const { theme, toggle, skin, SKINS } = useTheme()
  const { lang, setLang, t } = useLang()
  const isEn = lang === 'en'
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeSkinObj = SKINS.find((s) => s.id === skin) || SKINS[0]

  const handleLogout = () => {
    clearSession()
    window.location.hash = '#/login'
    window.location.reload()
  }

  const handleGoProfile = () => {
    onClose()
    navigate('#/profile')
  }

  return (
    <div
      ref={panelRef}
      className="glass-card floating-settings-popover"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        [isEn ? 'right' : 'left']: 0,
        width: 320,
        zIndex: 1000,
        borderRadius: 20,
        padding: 18,
        boxShadow: 'var(--shadow-modal)',
        border: '1px solid var(--line)',
        background: 'color-mix(in srgb, var(--card) 92%, transparent)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        animation: 'spring-pop 0.28s var(--ease-spring) both',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. User Header & Profile Overview */}
      {user ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingBottom: 14,
            borderBottom: '1px solid var(--line)',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--grad)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              flexShrink: 0,
            }}
          >
            {user.full_name ? user.full_name.slice(0, 1) : 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <b
              style={{
                display: 'block',
                fontSize: 14.5,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.full_name || (isEn ? 'Synapse User' : 'کاربر سیناپس')}
            </b>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span
                className="badge"
                style={{
                  fontSize: 10.5,
                  padding: '2px 8px',
                  background: 'var(--tint-fill)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                }}
              >
                {user.role === 'admin'
                  ? (isEn ? 'Admin' : 'مدیر ارشد')
                  : user.role === 'mentor'
                  ? (isEn ? 'Mentor' : 'مشاور تحصیلی')
                  : (isEn ? 'Student' : 'دانش‌آموز')}
              </span>
              <span
                className="small muted"
                style={{
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email || user.username || ''}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
          <b style={{ fontSize: 14, color: 'var(--ink)' }}>{isEn ? 'System Settings' : 'تنظیمات سامانه'}</b>
        </div>
      )}

      {/* 2. Quick Settings Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Day / Night Theme Switch with Animated Sun/Moon Uiverse Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--bg)',
            borderRadius: 14,
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              {isEn ? 'Theme Mode' : 'حالت روز / شب'}
            </span>
          </div>
          <AnimatedThemeToggle
            isDark={theme === 'dark'}
            onToggle={toggle}
            isEn={isEn}
          />
        </div>

        {/* Appearance Studio Trigger */}
        <button
          type="button"
          className="btn ghost"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 700,
          }}
          onClick={() => {
            onClose()
            onOpenStudio()
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎨</span>
            <span>{isEn ? 'Appearance & Skins' : 'استودیو پوسته و تم'}</span>
          </div>
          <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontSize: 11 }}>
            {activeSkinObj.name_en || activeSkinObj.name}
          </span>
        </button>

        {/* Language Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--bg)',
            borderRadius: 14,
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🌐</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              {isEn ? 'Language' : 'زبان رابط کاربری'}
            </span>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            style={{ borderRadius: 10, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
          >
            {lang === 'fa' ? 'EN (English)' : 'فا (فارسی)'}
          </button>
        </div>

        {/* Full Profile Link (for logged-in user) */}
        {user && (
          <button
            type="button"
            className="btn ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 700,
              gap: 8,
            }}
            onClick={handleGoProfile}
          >
            <span>👤</span>
            <span>{isEn ? 'View & Edit Profile' : 'مشاهده و ویرایش مشخصات'}</span>
          </button>
        )}
      </div>

      {/* 3. Footer / Logout */}
      {user && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn danger sm block"
            style={{ borderRadius: 12, padding: '8px 14px', fontWeight: 800 }}
            onClick={handleLogout}
          >
            🚪 {isEn ? 'Sign Out / Logout' : 'خروج از حساب کاربری'}
          </button>
        </div>
      )}
    </div>
  )
}
