import React from 'react'

/**
 * High-fidelity Uiverse Sun / Moon / Stars Animated Toggle Switch
 * Transitions smoothly between Day and Night with animated celestial bodies:
 * - Day: Sky-blue track, fluffy drifting clouds, bright golden sun knob with warm radial gradient.
 * - Night: Midnight-indigo track, twinkling stars, cratered silver moon with crater details.
 */
export default function AnimatedThemeToggle({ isDark, onToggle, label = '', isEn = false }) {
  const handleChange = (e) => {
    e.stopPropagation()
    if (onToggle) onToggle()
  }

  const titleText = isDark
    ? isEn
      ? 'Night mode is active'
      : 'حالت شب فعال است'
    : isEn
    ? 'Day mode is active'
    : 'حالت روز فعال است'

  return (
    <div className="uiverse-toggle-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
          {label}
        </span>
      )}
      <label className="uiverse-theme-switch" title={titleText}>
        <input
          type="checkbox"
          checked={!!isDark}
          onChange={handleChange}
          aria-label={isEn ? 'Toggle Night/Day Mode' : 'تغییر حالت شب و روز'}
        />
        <span className="uiverse-theme-slider">
          {/* Day Mode Clouds */}
          <span className="cloud-1" aria-hidden="true" />
          <span className="cloud-2" aria-hidden="true" />

          {/* Night Mode Stars */}
          <span className="star-1" aria-hidden="true" />
          <span className="star-2" aria-hidden="true" />
          <span className="star-3" aria-hidden="true" />

          {/* Knob: Sun in Day mode, Moon in Night mode */}
          <span className="knob" aria-hidden="true">
            <span className="crater-1" />
            <span className="crater-2" />
          </span>
        </span>
      </label>
    </div>
  )
}
