import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export const SKINS = [
  { id: 'modern', name_fa: 'مدرن و مینیمال', name_en: 'Modern Clean', icon: '✨', desc_fa: 'طراحی استاندارد، خوانا و تفکیک‌شده', desc_en: 'Minimal, crisp high-contrast design' },
  { id: 'liquid', name_fa: 'شیشه‌ای (Liquid Glass)', name_en: 'Liquid Glass', icon: '💎', desc_fa: 'بلور مات با جلوه عمیق شیشه‌ای و انعکاس نور', desc_en: 'Frosted acrylic glassmorphism with subtle glow' },
  { id: 'cyber', name_fa: 'دارک نئونی (Cyber Midnight)', name_en: 'Cyber Midnight', icon: '🌌', desc_fa: 'تم تیره عمیق با نورهای نئونی پرانرژی', desc_en: 'Deep dark background with electric neon accents' },
  { id: 'sepia', name_fa: 'کاغذ گرم (Warm Paper)', name_en: 'Warm Paper', icon: '📜', desc_fa: 'پالت ملایم و ارگونومیک برای مطالعه طولانی', desc_en: 'Warm, eye-friendly sepia study tones' },
]

export const ACCENTS = [
  { id: 'indigo', label_fa: 'نیلی سلطنتی', label_en: 'Royal Indigo', hex: '#4f46e5', light: '#eef2ff' },
  { id: 'emerald', label_fa: 'زمردی درخشان', label_en: 'Emerald Glow', hex: '#10b981', light: '#ecfdf5' },
  { id: 'cyan', label_fa: 'فیروزه‌ای الکتریک', label_en: 'Electric Cyan', hex: '#06b6d4', light: '#ecfeff' },
  { id: 'purple', label_fa: 'بنفش ارغوانی', label_en: 'Mystic Purple', hex: '#9333ea', light: '#faf5ff' },
  { id: 'rose', label_fa: 'رز غروب', label_en: 'Sunset Rose', hex: '#f43f5e', light: '#fff1f2' },
  { id: 'amber', label_fa: 'کهربایی طلایی', label_en: 'Golden Amber', hex: '#f59e0b', light: '#fffbeb' },
]

const ThemeCtx = createContext({
  theme: 'light',
  mode: 'light',
  toggle: () => {},
  toggleMode: () => {},
  skin: 'modern',
  setSkin: () => {},
  changeSkin: () => {},
  accent: 'indigo',
  setAccent: () => {},
  changeAccent: () => {},
  SKINS,
  ACCENTS,
  studioOpen: false,
  openStudio: () => {},
  closeStudio: () => {},
})

export const useTheme = () => useContext(ThemeCtx)

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
    const accObj = ACCENTS.find((a) => a.id === accent) || ACCENTS[0]
    document.documentElement.style.setProperty('--primary', accObj.hex)
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
        mode: theme,
        toggle,
        toggleMode: toggle,
        skin,
        setSkin: changeSkin,
        changeSkin,
        accent,
        setAccent: changeAccent,
        changeAccent,
        SKINS,
        ACCENTS,
        studioOpen,
        openStudio: () => setStudioOpen(true),
        closeStudio: () => setStudioOpen(false),
      }}
    >
      {children}
    </ThemeCtx.Provider>
  )
}
