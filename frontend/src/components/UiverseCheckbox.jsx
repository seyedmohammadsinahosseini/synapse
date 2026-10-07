import React from 'react'

/**
 * Uiverse Animated Task Checkbox by MattiaCode-IT
 * Features dynamic ripple feedback, spring pop checkmark, and accessible keyboard support
 */
export default function UiverseCheckbox({
  id,
  checked,
  onChange,
  label,
  children,
  className = '',
  disabled = false,
}) {
  const inputId = id || `task-check-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div className={`checkbox-container ${className}`}>
      <input
        type="checkbox"
        id={inputId}
        className="task-checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => {
          e.stopPropagation()
          if (onChange) onChange(e.target.checked)
        }}
      />
      <label
        htmlFor={inputId}
        className="checkbox-label"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkbox-box" aria-hidden="true">
          <div className="checkbox-fill" />
          <div className="checkmark">
            <svg viewBox="0 0 24 24" className="check-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <div className="success-ripple" />
        </div>
        {(label || children) && (
          <span className="checkbox-text">
            {label || children}
          </span>
        )}
      </label>
    </div>
  )
}
