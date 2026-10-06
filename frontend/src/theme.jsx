import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const ThemeCtx = createContext(null)
export const useTheme = () => useContext(ThemeCtx)

export const SKINS = [
  { id: 'modern', name_fa: 'مدرن و مینیمال', name_en: 'Modern Clean', icon: '✨', desc_fa: 'طراحی استاندارد، خوانا و تفکیک‌شده', desc_en: 'Minimal, crisp high-contrast design' },
  { id: 'liquid', name_fa: 'شیشه‌ای (Liquid Glass)', name_en: 'Liquid Glass', icon: '💎', desc_fa: 'بلور مات با جلوه عمیق شیشه‌ای و انعکاس نور', desc_en: 'Frosted acrylic glassmorphism with subtle glow' },
  { id: 'cyber', name_fa: 'دارک نئونی (Cyber Midnight)', name_en: 'Cyber Midnight', icon: '🌌', desc_fa: 'تم تیره عمیق با نورهای نئونی پرانرژی', desc_en: 'Deep dark background with electric neon accents' },
  { id: 'sepia', name_fa: 'کاغذ گرم (Warm Paper)', name_en: 'Warm Paper', icon: '📜', desc_fa: 'پالت ملایم و ارگونومیک برای مطالعه طولانی', desc_en: 'Warm, eye-friendly sepia study tones' },
]

export const ACCENTS = [
  { id: 'indigo', name_fa: 'نیلی سلطنتی', name_en: 'Royal Indigo', color: '#4f46e5', light: '#eef2ff' },
  { id: 'emerald', name_fa: 'زمردی درخشان', name_en: 'Emerald Glow', color: '#10b981', light: '#ecfdf5' },
  { id: 'cyan', name_fa: 'فیروزه‌ای الکتریک', name_en: 'Electric Cyan', color: '#06b6d4', light: '#ecfeff' },
  { id: 'purple', name_fa: 'بنفش ارغوانی', name_en: 'Mystic Purple', color: '#9333ea', light: '#faf5ff' },
  { id: 'rose', name_fa: 'رز غروب', name_en: 'Sunset Rose', color: '#f43f5e', light: '#fff1f2' },
  { id: 'amber', name_fa: 'کهربایی طلایی', name_en: 'Golden Amber', color: '#f59e0b', light: '#fffbeb' },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')
  const [skin, setSkin] = useState(() => localStorage.getItem('app_skin') || 'modern')
  const [accent, setAccent] = useState(() => localStorage.getItem('app_accent') || 'indigo')
  const [studioOpen, setStudioOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
    localStorage.setItem('app_skin', skin)
  }, [skin])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    localStorage.setItem('app_accent', accent)
    const accObj = ACCENTS.find(a => a.id === accent) || ACCENTS[0]
    document.documentElement.style.setProperty('--primary', accObj.color)
    document.documentElement.style.setProperty('--primary-light', accObj.light)
  }, [accent])

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
      setTimeout(() => document.documentElement.classList.remove('theme-anim'), 650)
    }
  }

  const changeSkin = (newSkin) => {
    setSkin(newSkin)
  }

  const changeAccent = (newAccent) => {
    setAccent(newAccent)
  }

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        toggle,
        skin,
        changeSkin,
        accent,
        changeAccent,
        studioOpen,
        openStudio: () => setStudioOpen(true),
        closeStudio: () => setStudioOpen(false),
      }}
    >
      {children}
    </ThemeCtx.Provider>
  )
}
