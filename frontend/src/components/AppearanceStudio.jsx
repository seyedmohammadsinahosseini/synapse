import { useTheme } from '../theme.jsx'
import { useLang } from '../i18n.jsx'

export default function AppearanceStudio({ isOpen, onClose }) {
  const { skin, setSkin, accent, setAccent, mode, toggleMode, SKINS, ACCENTS } = useTheme()
  const { lang } = useLang()
  const isEn = lang === 'en'

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 22,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>🎨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 19 }}>
                {isEn ? 'Appearance Studio & Skin Customizer' : 'استودیو شخصی‌سازی تم و پوسته‌های سیناپس'}
              </h3>
              <p className="small muted" style={{ margin: '2px 0 0 0' }}>
                {isEn ? 'Choose your favorite visual theme & vibrant accent color' : 'پوسته گرافیکی، افکت شیشه‌ای و پالت رنگی دلخواه خود را انتخاب کنید'}
              </p>
            </div>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose} style={{ fontSize: 16, borderRadius: 8 }}>
            ✕
          </button>
        </div>

        {/* 1. Skin Theme Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink)' }}>
            1. {isEn ? 'Choose UI Visual Skin:' : 'انتخاب تم و پوسته اصلی (Skin):'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {SKINS.map((s) => {
              const active = skin === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  style={{
                    background: active ? 'var(--tint-fill)' : 'var(--bg)',
                    border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '12px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSkin(s.id)}
                >
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <b style={{ fontSize: 12.5, color: active ? 'var(--primary)' : 'var(--ink)' }}>
                    {isEn ? s.name_en : s.name_fa}
                  </b>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {isEn ? s.desc_en : s.desc_fa}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Accent Color Palette Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink)' }}>
            2. {isEn ? 'Primary Accent Palette:' : 'پالت رنگی هایلایت (Accent Color):'}
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ACCENTS.map((a) => {
              const active = accent === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 12,
                    padding: '8px 14px',
                    background: active ? 'var(--tint-fill)' : 'var(--bg)',
                    border: active ? `2px solid ${a.hex}` : '1px solid var(--line)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setAccent(a.id)}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: a.hex }} />
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: 'var(--ink)' }}>
                    {isEn ? a.label_en : a.label_fa}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Dark / Light Mode Switch */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--bg)',
            borderRadius: 14,
            border: '1px solid var(--line)',
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {isEn ? 'Dark / Light Ambient Mode' : 'حالت تیره / روشن'}
            </div>
            <div className="small muted">
              {isEn ? 'Toggle background luminance to reduce eye strain' : 'تغییر روشنایی پس‌زمینه برای کاهش خستگی چشم در شب'}
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            style={{ borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}
            onClick={toggleMode}
          >
            {mode === 'dark' ? '☀️ ' + (isEn ? 'Switch to Light' : 'تغییر به روز') : '🌙 ' + (isEn ? 'Switch to Dark' : 'تغییر به شب')}
          </button>
        </div>

        {/* Live Preview Sample */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            background: 'var(--tint-fill)',
            border: '1px solid var(--tint-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="small muted" style={{ fontWeight: 600 }}>{isEn ? 'Active Preview' : 'پیش‌نمایش زنده تم:'}</div>
            <b style={{ color: 'var(--primary)', fontSize: 14 }}>
              {SKINS.find((s) => s.id === skin)?.name_fa} • {ACCENTS.find((a) => a.id === accent)?.label_fa}
            </b>
          </div>
          <button
            type="button"
            className="btn primary sm"
            style={{ borderRadius: 10 }}
            onClick={onClose}
          >
            ✓ {isEn ? 'Apply & Close' : 'تأیید و اعمال'}
          </button>
        </div>
      </div>
    </div>
  )
}
