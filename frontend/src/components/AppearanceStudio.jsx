import { useRef } from 'react'
import { useTheme } from '../theme.jsx'
import { useLang } from '../i18n.jsx'

function InfoIcon({ text }) {
  return (
    <span
      className="option-info"
      tabIndex={0}
      role="note"
      aria-label={text}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.focus()
      }}
    >
      i
      <span className="option-info-tip" role="tooltip">
        {text}
      </span>
    </span>
  )
}

function ChoiceSetting({ label, value, options, onChange, tooltip }) {
  return (
    <div className="choice-setting">
      <b>
        {label}
        {tooltip && <InfoIcon text={tooltip} />}
      </b>
      <div>
        {options.map(([id, title]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {title}
          </button>
        ))}
      </div>
    </div>
  )
}

function SwitchRow({ label, note, checked, onChange }) {
  return (
    <label className="setting-row">
      <span>
        <b>
          {label}
          {note && <InfoIcon text={note} />}
        </b>
        {note && <small>{note}</small>}
      </span>
      <input
        className="switch-input"
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export default function AppearanceStudio({ isOpen, onClose }) {
  const {
    settings,
    updateSettings,
    resetSettings,
    SKINS,
    DUETS,
  } = useTheme()
  const { lang } = useLang()
  const isEn = lang === 'en'
  const livePreviewRef = useRef(null)

  if (!isOpen) return null

  const s = settings
  const isConfigurable = s.skin === 'modern' || s.skin === 'liquid'

  const handleLivePointerMove = (e) => {
    if (!livePreviewRef.current) return
    const bar = livePreviewRef.current.querySelector('.lg-preview-bar')
    if (bar) {
      const rect = bar.getBoundingClientRect()
      bar.style.setProperty('--lg-pointer-x', `${e.clientX - rect.left}px`)
      bar.style.setProperty('--lg-pointer-y', `${e.clientY - rect.top}px`)
      bar.setAttribute('data-lg-lit', 'true')
    }
  }

  const handleLivePointerLeave = () => {
    if (!livePreviewRef.current) return
    const bar = livePreviewRef.current.querySelector('.lg-preview-bar')
    if (bar) bar.removeAttribute('data-lg-lit')
  }

  return (
    <div
      className="studio-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="theme-preview-dialog appearance-studio"
        aria-describedby="theme-preview-desc"
        style={{
          width: 'min(780px, calc(100vw - 32px))',
          height: 'min(86vh, 760px)',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 24,
          background: 'var(--card, #ffffff)',
          color: 'var(--ink, #1f2937)',
          border: '1px solid var(--line)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Pinned at Top) */}
        <div
          className="preview-dialog-head"
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h2>{isEn ? 'Appearance & Theme Studio' : 'استودیو طراحی و شخصی‌سازی پوسته'}</h2>
            <p id="theme-preview-desc" style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {isEn
                ? 'Select a visual skin, twin duet palette, and interactive optical glass effects.'
                : 'پوسته گرافیکی، پالت‌های دورنگ، جلوه‌های شیشه‌ای و تنظیمات بصری دلخواه خود را انتخاب کنید.'}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={isEn ? 'Close' : 'بستن'}
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* 2. Scrollable Body Content */}
        <div
          className="studio-modal-body"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '18px 24px',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {/* Skin Catalog Grid */}
          <div style={{ marginBottom: 24 }}>
            <b style={{ display: 'block', fontSize: 13, marginBottom: 12, color: 'var(--ink)' }}>
              {isEn ? 'Visual Skin Catalog:' : 'کاتالوگ پوسته‌های بصری سامانه:'}
            </b>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))',
                gap: 12,
              }}
            >
              {SKINS.map((sk) => {
                const active = s.skin === sk.id
                return (
                  <button
                    key={sk.id}
                    type="button"
                    className={`skin-choice preview-${sk.id}`}
                    aria-pressed={active}
                    onClick={() => updateSettings({ skin: sk.id })}
                  >
                    <div className="mini-window">
                      <div className="mini-top">
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="mini-body">
                        <aside />
                        <main>
                          <i />
                          <div>
                            <b />
                            <b />
                          </div>
                        </main>
                      </div>
                      {active && <span className="selected-check">✓</span>}
                    </div>
                    <div className="skin-description">
                      <span>{sk.en}</span>
                      <strong>{sk.name_en || sk.name}</strong>
                      <small>{isEn ? sk.desc : sk.desc_fa || sk.desc}</small>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Skin Settings Section */}
          <section className="skin-settings" id="skin-settings">
            <div className="section-label">
              <h3>
                ⚙️ {isEn ? 'Settings for ' : 'تنظیمات '}
                {SKINS.find((sk) => sk.id === s.skin)?.name}
              </h3>
              <small>{isEn ? 'Auto-saved' : 'ذخیره خودکار'}</small>
            </div>

            {/* Mode Switch (Modern only) */}
            {s.skin === 'modern' && (
              <label className="setting-row">
                <span>
                  <b>
                    {isEn ? 'Display Mode' : 'حالت نمایش'}
                    <InfoIcon text={isEn ? 'Day or Night ambient mode' : 'روشن یا تیره؛ رنگ روز و شب جداگانه ذخیره می‌شود.'} />
                  </b>
                  <small>{isEn ? 'Day & Night modes save independently.' : 'رنگ روز و شب جداگانه ذخیره می‌شود.'}</small>
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{
                      background: s.mode === 'day' ? 'var(--brand)' : 'var(--surface-2)',
                      color: s.mode === 'day' ? '#fff' : 'var(--text)',
                      borderRadius: 10,
                    }}
                    onClick={() => updateSettings({ mode: 'day' })}
                  >
                    ☀️ {isEn ? 'Day' : 'روز'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{
                      background: s.mode === 'night' ? 'var(--brand)' : 'var(--surface-2)',
                      color: s.mode === 'night' ? '#fff' : 'var(--text)',
                      borderRadius: 10,
                    }}
                    onClick={() => updateSettings({ mode: 'night' })}
                  >
                    🌙 {isEn ? 'Night' : 'شب'}
                  </button>
                </div>
              </label>
            )}

            {/* Duet Palettes (Configurable skins: Modern & Liquid) */}
            {isConfigurable && (
              <>
                <div className="palette-pairs">
                  <div className="duet-heading">
                    <div>
                      <b>{isEn ? 'Color Duet Pairs' : 'دو رنگ، یک حال‌وهوای کامل'}</b>
                      <p>
                        {isEn
                          ? 'Backgrounds, luminous borders, buttons and particles update harmoniously.'
                          : 'زمینه، حاشیه‌های نورانی، دکمه‌ها و حباب‌ها با هم تغییر می‌کنند.'}
                      </p>
                    </div>
                    <InfoIcon
                      text={
                        isEn
                          ? 'Obsidian Neon applies high-contrast midnight black, electric magenta & cyan.'
                          : 'پالت‌ها با هماهنگی کامل سطوح و نوارها طراحی شده‌اند. آبسیدین در حالت شب همان ترکیب مشکی، صورتی و فیروزه‌ای اصیل است.'
                      }
                    />
                  </div>

                  <div className="duet-catalog">
                    {DUETS.map((d) => {
                      const isSelected =
                        s.duet === d.id && !s.rgb && (s.skin !== 'liquid' || s.liquidPalette)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`duet-choice ${['obsidian', 'home'].includes(d.id) ? 'duet-featured' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() =>
                            updateSettings({
                              liquidPalette: true,
                              duet: d.id,
                              mode: ['obsidian', 'home'].includes(d.id) ? 'night' : s.mode,
                              colors: { day: d.colors[0], night: d.colors[0] },
                              rgb: false,
                              ...(['obsidian', 'home'].includes(d.id) ? { live: 'combined' } : {}),
                            })
                          }
                          style={{
                            '--pair-a': d.colors[0],
                            '--pair-b': d.colors[1],
                            '--pair-bg': d.bg,
                            '--pair-panel': d.panel,
                            '--pair-c': (d.extra || d.colors)[0],
                            '--pair-d': (d.extra || d.colors)[1],
                          }}
                        >
                          <span className="duet-art" aria-hidden="true">
                            <span className="duet-orb a" />
                            <span className="duet-orb b" />
                            {d.extra && <span className="duet-orb c" />}
                            {d.extra && <span className="duet-orb d" />}
                            <span className="duet-mini-top" />
                            <span className="duet-mini-sidebar" />
                            <span className="duet-mini-card" />
                            <span className="duet-mini-cta" />
                          </span>
                          <span className="duet-meta">
                            <b>
                              {d.name}
                              {isSelected && <span style={{ marginLeft: 6, color: 'var(--brand)' }}>✓</span>}
                            </b>
                            <small>{d.desc}</small>
                          </span>
                          {d.id === 'obsidian' && <span className="duet-ref">تم تصویر مرجع</span>}
                          {d.id === 'home' && <span className="duet-ref">پالت هوم اصلی</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Individual Accent Color Swatches */}
                <div className="color-section" style={{ marginTop: 20 }}>
                  <label htmlFor="custom-accent" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
                    {isEn ? 'Primary Accent Color for ' : 'رنگ اصلی حالت '}
                    {s.mode === 'night' ? (isEn ? 'Night' : 'شب') : (isEn ? 'Day' : 'روز')}
                    <InfoIcon text={isEn ? 'Picking a single color turns off duet palettes' : 'رنگ کنترل‌ها و سطوح؛ انتخاب رنگ تکی پالت دورنگ را خاموش می‌کند.'} />
                  </label>
                  <div className="color-swatches">
                    {['#315bc5', '#216b50', '#8844a8', '#ad3858', '#9a641d', '#555b66'].map((hex) => {
                      const curMode = (s.mode || 'day') === 'night' ? 'night' : 'day'
                      const curColors = s.colors || { day: '#6253ba', night: '#216b50' }
                      const isSelected = !s.rgb && curColors[curMode] === hex
                      return (
                        <button
                          key={hex}
                          type="button"
                          style={{ background: hex }}
                          className="swatch"
                          aria-label={'Color ' + hex}
                          aria-pressed={isSelected}
                          onClick={() =>
                            updateSettings({
                              liquidPalette: true,
                              colors: { ...curColors, [curMode]: hex },
                              rgb: false,
                              duet: undefined,
                            })
                          }
                        >
                          {isSelected && '✓'}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      className="swatch rainbow"
                      aria-label="RGB Rainbow rotation"
                      aria-pressed={s.rgb}
                      onClick={() => updateSettings({ liquidPalette: true, rgb: !s.rgb })}
                    >
                      {s.rgb ? '✓' : <span>RGB</span>}
                    </button>

                    <label className="custom-color">
                      <input
                        id="custom-accent"
                        type="color"
                        value={
                          (s.colors && s.colors[(s.mode || 'day') === 'night' ? 'night' : 'day']) ||
                          (s.mode === 'night' ? '#216b50' : '#6253ba')
                        }
                        onChange={(e) => {
                          const curMode = (s.mode || 'day') === 'night' ? 'night' : 'day'
                          const curColors = s.colors || { day: '#6253ba', night: '#216b50' }
                          updateSettings({
                            liquidPalette: true,
                            colors: { ...curColors, [curMode]: e.target.value },
                            rgb: false,
                            duet: undefined,
                          })
                        }}
                      />
                      <span>{isEn ? 'Custom' : 'دلخواه'}</span>
                    </label>
                  </div>
                  <p className="settings-note" style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    {isEn
                      ? 'Accent affects background tints, borders, and controls with accessible text contrast.'
                      : 'رنگ به زمینه، سطوح و کنترل‌ها می‌رسد؛ کنتراست متن جداگانه حفظ می‌شود.'}
                  </p>
                </div>
              </>
            )}

            {/* Frutiger Aero Options */}
            {s.skin === 'aero' && (
              <>
                <ChoiceSetting
                  label={isEn ? 'Nature Scenery Vibe' : 'حال‌وهوای طبیعت'}
                  value={s.aero || 'sky'}
                  options={[
                    ['sky', isEn ? 'Blue Sky' : 'آسمان آبی'],
                    ['ocean', isEn ? 'Aqua Ocean' : 'اقیانوس فیروزه‌ای'],
                    ['garden', isEn ? 'Green Garden' : 'باغ سبز'],
                  ]}
                  onChange={(v) => updateSettings({ aero: v })}
                  tooltip={isEn ? 'High-gloss sky, water, or garden backgrounds' : 'تصویر مستقل آسمان، آب یا باغ همراه با رنگ کنترل‌ها.'}
                />
                <label className="range-setting">
                  <span>
                    {isEn ? 'Glass Intensity' : 'شدت جلوه شیشه‌ای'}
                    <InfoIcon text={isEn ? 'Transparency & blur amount' : 'شفافیت و محوشدگی در تم‌های شیشه‌ای.'} />
                    <b>{s.glass || 55}٪</b>
                  </span>
                  <input
                    aria-label="Glass Intensity"
                    type="range"
                    min="0"
                    max="100"
                    value={s.glass || 55}
                    onChange={(e) => updateSettings({ glass: Number(e.target.value) })}
                  />
                  <small>{isEn ? 'Text background retains high legibility.' : 'زمینه متن برای خوانایی کاملاً محو نمی‌شود.'}</small>
                </label>
              </>
            )}

            {/* Windows XP Options */}
            {s.skin === 'xp' && (
              <ChoiceSetting
                label={isEn ? 'XP Window Theme' : 'رنگ پنجره‌های XP'}
                value={s.xp || 'blue'}
                options={[
                  ['blue', 'Luna آبی'],
                  ['olive', 'زیتونی Olive'],
                  ['silver', 'نقره‌ای Silver'],
                ]}
                onChange={(v) => updateSettings({ xp: v })}
                tooltip={isEn ? 'Classic Windows XP Luna themes' : 'قاب‌های کلاسیک Luna؛ تصویر Bliss ثابت است.'}
              />
            )}

            {/* Y2K Options */}
            {s.skin === 'y2k' && (
              <ChoiceSetting
                label={isEn ? 'Metallic Glow' : 'نور فلز'}
                value={s.y2k || 'cyan'}
                options={[
                  ['cyan', isEn ? 'Ice Chrome' : 'یخی / کروم'],
                  ['lime', isEn ? 'Cyber Console Lime' : 'سبز / کنسول'],
                ]}
                onChange={(v) => updateSettings({ y2k: v })}
                tooltip={isEn ? 'Polished metal & neon cyber console' : 'کروم آبی یا سبک کنسولی سبز با تصویر مستقل.'}
              />
            )}

            {/* Neo Pop Options */}
            {s.skin === 'neo' && (
              <ChoiceSetting
                label={isEn ? 'Graphic Language' : 'زبان گرافیکی'}
                value={s.neo || 'pop'}
                options={[
                  ['pop', isEn ? 'Yellow Pop & Cyan' : 'پاپ زرد و فیروزه‌ای'],
                  ['pink', isEn ? 'Retro Pink Window' : 'پنجره رترو صورتی'],
                ]}
                onChange={(v) => updateSettings({ neo: v })}
                tooltip={isEn ? 'High contrast retro graphic windows' : 'رنگ‌بندی پاپ یا رترو صورتی با کادرهای ضخیم.'}
              />
            )}

            {/* Liquid Glass Options */}
            {s.skin === 'liquid' && (
              <>
                <ChoiceSetting
                  label={isEn ? 'Day / Night Mode' : 'حالت روز و شب'}
                  value={s.mode || 'day'}
                  options={[
                    ['day', isEn ? 'Day' : 'روز'],
                    ['night', isEn ? 'Night' : 'شب'],
                  ]}
                  onChange={(v) => updateSettings({ mode: v })}
                />

                <ChoiceSetting
                  label={isEn ? 'Glass Material' : 'جنس شیشه'}
                  value={s.liquid === 'matte' ? 'matte' : 'clear'}
                  options={[
                    ['clear', isEn ? 'Crystal Clear' : 'شفاف کریستالی'],
                    ['matte', isEn ? 'Frosted Matte' : 'مات ژله‌ای'],
                  ]}
                  onChange={(v) => updateSettings({ liquid: v })}
                  tooltip={isEn ? 'Clear optical glass vs frosted matte' : 'شفاف یا مات؛ شدت شیشه جداگانه تنظیم می‌شود.'}
                />

                {/* Interactive Live Glass Preview */}
                <div
                  ref={livePreviewRef}
                  className="liquid-live-preview"
                  onMouseMove={handleLivePointerMove}
                  onMouseLeave={handleLivePointerLeave}
                >
                  <div className="lg-preview-bar" data-lg="bar">
                    <span>💎 {isEn ? 'Interactive Liquid Glass Bar' : 'پیش‌نمایش زندهٔ نوار شیشه‌ای'}</span>
                    <span>✨</span>
                  </div>
                  <small>
                    {isEn
                      ? 'Hover pointer over the bar to see refraction & lighting'
                      : 'نشانگر را روی کنترل ببرید؛ سپس شفافیت را تغییر دهید.'}
                  </small>
                </div>

                <label className="range-setting">
                  <span>
                    {isEn ? 'Global Glass Translucency' : 'شفافیت سراسری شیشه'}
                    <InfoIcon text={isEn ? 'Controls backdrop blur and glass refraction' : 'از پوشیده‌تر تا شفاف‌تر؛ روی پنل‌های اصلی و ناوبری اعمال می‌شود.'} />
                    <b>{s.glass || 55}٪</b>
                  </span>
                  <input
                    aria-label="Liquid Glass Opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={s.glass || 55}
                    onChange={(e) => updateSettings({ glass: Number(e.target.value) })}
                  />
                  <div className="liquid-range-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{isEn ? 'Covered / Dense' : 'پوشیده‌تر'}</span>
                    <span>{isEn ? 'High Transparency' : 'شفاف‌تر'}</span>
                  </div>
                  <small>{isEn ? 'Forms and panels adjust dynamically.' : 'فرم‌ها و پنل‌ها هم‌زمان تغییر می‌کنند؛ متن مستقل از افکت عدسی باقی می‌ماند.'}</small>
                </label>
              </>
            )}

            {/* Animation & Live Toggles */}
            {isConfigurable && (
              <>
                {s.skin !== 'liquid' && (
                  <SwitchRow
                    label={isEn ? 'Drifting Background Bubbles' : 'حباب‌های شناور پس‌زمینه'}
                    note={isEn ? 'Soft colored ambient particles in background' : 'حباب‌های شناور رنگی در پس‌زمینه؛ کاهش حرکت دستگاه رعایت می‌شود.'}
                    checked={s.particles !== false}
                    onChange={(v) => updateSettings({ particles: v, live: v || s.ink ? 'combined' : 'off' })}
                  />
                )}
                {typeof navigator !== 'undefined' &&
                  !/Android/i.test(navigator.userAgent) &&
                  !['neo', 'aero', 'xp', 'y2k'].includes(s.skin) && (
                    <SwitchRow
                      label={isEn ? 'Cursor Ribbon Ink Trails' : 'جوهر دنبال نشانگر موس'}
                      note={isEn ? 'Flowing ribbon ink responding to cursor speed' : 'ردّ روبانی هماهنگ با رنگ تم؛ کاهش حرکت دستگاه رعایت می‌شود.'}
                      checked={s.ink !== false}
                      onChange={(v) => updateSettings({ ink: v, live: v || s.particles ? 'combined' : 'off' })}
                    />
                  )}
              </>
            )}

            {s.skin === 'modern' ? (
              <SwitchRow
                label={isEn ? 'Card Glow & Micro-animations' : 'حرکت و درخشش کارت‌ها'}
                note={isEn ? 'Spotlight hover reflection and smooth card transitions' : 'انیمیشن‌ها و درخشش کارت‌ها و دکمه‌ها با هم هماهنگ می‌شوند.'}
                checked={s.motion}
                onChange={(v) => updateSettings({ motion: v, glow: v })}
              />
            ) : null}

            <SwitchRow
              label={isEn ? 'Output Color Synchronization' : 'هماهنگی رنگ خروجی‌ها'}
              note={isEn ? 'Synchronize export accents while keeping document base clean' : 'کاغذ سفید می‌ماند؛ رنگ لحظه ساخت در خروجی ثبت می‌شود.'}
              checked={s.exportSync !== false}
              onChange={(v) => updateSettings({ exportSync: v })}
            />
          </section>
        </div>

        {/* 3. Footer (Pinned at Bottom) */}
        <footer className="studio-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="text-button"
            onClick={resetSettings}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🔄 {isEn ? 'Reset Theme Defaults' : 'بازنشانی ظاهر'}
          </button>
          <button
            type="button"
            className="primary-button btn primary"
            onClick={onClose}
            style={{ borderRadius: 12, padding: '10px 24px', fontSize: 13.5, fontWeight: 700 }}
          >
            ✓ {isEn ? 'Done, looks great!' : 'تمام، ذخیره تغییرات'}
          </button>
        </footer>
      </div>
    </div>
  )
}
