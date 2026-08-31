import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const ThemeCtx = createContext(null)
export const useTheme = () => useContext(ThemeCtx)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app_theme', theme)
  }, [theme])

  // Animate the light <-> dark switch:
  //  - modern browsers get a circular "ripple" reveal from the toggle button
  //    (View Transitions API) — the logo swap rides along inside it
  //  - others get a smooth color morph (.theme-anim on <html>)
  const toggle = (e) => {
    const next = theme === 'dark' ? 'light' : 'dark'

    const rect = e && e.currentTarget ? e.currentTarget.getBoundingClientRect() : null
    const rx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const ry = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    document.documentElement.style.setProperty('--ripple-x', rx + 'px')
    document.documentElement.style.setProperty('--ripple-y', ry + 'px')

    const apply = () =>
      flushSync(() => {
        setTheme(next)
        document.documentElement.setAttribute('data-theme', next)
      })

    if (document.startViewTransition) {
      document.startViewTransition(apply)
    } else {
      document.documentElement.classList.add('theme-anim')
      apply()
      setTimeout(
        () => document.documentElement.classList.remove('theme-anim'),
        650
      )
    }
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
