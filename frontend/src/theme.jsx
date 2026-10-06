import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import {
  AERO_OCEAN_WP,
  AERO_GARDEN_WP,
  AERO_SKY_WP,
  Y2K_LIME_WP,
  XP_BLISS_WP,
} from './themeWallpapers.js'

export const SKINS = [
  { id: 'modern', name: 'دیفالت', name_fa: 'مدرن دیفالت', en: 'DEFAULT', name_en: 'Default Modern', desc: 'حالت اولیهٔ اتما', desc_fa: 'طراحی استاندارد و تفکیک‌شده', icon: '✨' },
  { id: 'aero', name: 'فروتیگر ایرو', name_fa: 'فروتیگر ایرو (Frutiger Aero)', en: 'FRUTIGER AERO', name_en: 'Frutiger Aero', desc: 'آسمان، آب و آینده‌ای خوش‌بینانه', desc_fa: 'آسمان، آب و شیشه‌های شفاف اقیانوسی', icon: '🌊' },
  { id: 'xp', name: 'ویندوز XP', name_fa: 'کلاسیک ویندوز XP', en: 'DESKTOP 2001', name_en: 'Windows XP Classic', desc: 'پنجره‌های آبی و تپه‌های آشنا', desc_fa: 'پنجره‌های آبی Luna و تپه‌های Bliss', icon: '🪟' },
  { id: 'y2k', name: 'کروم Y2K', name_fa: 'کروم نئون Y2K', en: 'DIGITAL FUTURE', name_en: 'Cyber Chrome Y2K', desc: 'فلز صیقلی و نور الکتریکی', desc_fa: 'فلز صیقلی، نئون سبز و سایبر', icon: '⚡' },
  { id: 'neo', name: 'پاپ رترو', name_fa: 'پاپ رترو نئو', en: 'NEO / RETRO', name_en: 'Neo Pop Retro', desc: 'رنگ جسور، خط ضخیم، پنجره رترو', desc_fa: 'رنگ‌های جسور و گرافیک رترو', icon: '🎨' },
  { id: 'liquid', name: 'لیکوئید گلس', name_fa: 'شیشه‌ای مایع (Liquid Glass)', en: 'LIQUID GLASS', name_en: 'Liquid Glass Flow', desc: 'لایه‌های شیشه‌ای و کنترل‌های شناور', desc_fa: 'بلور با انکسار نوری و شیشه‌های مات ژله‌ای', icon: '💎' },
]

export const DUETS = [
  {
    id: 'obsidian',
    name: 'آبسیدین نئون',
    desc: 'مشکی • صورتی و فیروزه‌ای — مطابق تصویر مرجع',
    colors: ['#ff3d81', '#22d3ee'],
    bg: '#050505',
    panel: '#191919',
  },
  {
    id: 'home',
    name: 'هوم چندرنگ',
    desc: 'بنفش • صورتی • آبی آسمانی • فیروزه‌ای — پالت صفحهٔ اصلی',
    colors: ['#7c3aed', '#ec4899'],
    extra: ['#0ea5e9', '#14b8a6'],
    bg: '#130f20',
    panel: '#1a1530',
  },
  {
    id: 'forest',
    name: 'جنگل روشن',
    desc: 'سبز زمردی • لیمویی',
    colors: ['#34d399', '#a3e635'],
    bg: '#051712',
    panel: '#123625',
  },
  {
    id: 'ocean',
    name: 'عمق اقیانوس',
    desc: 'فیروزه‌ای • آبی',
    colors: ['#22d3ee', '#3b82f6'],
    bg: '#041219',
    panel: '#0e2f40',
  },
  {
    id: 'sunset',
    name: 'غروب مرجانی',
    desc: 'نارنجی گرم • سرخابی',
    colors: ['#fb923c', '#f43f5e'],
    bg: '#170a1c',
    panel: '#3a1530',
  },
  {
    id: 'cosmic',
    name: 'شب کیهانی',
    desc: 'بنفش • نور فیروزه‌ای',
    colors: ['#a78bfa', '#22d3ee'],
    bg: '#0b0519',
    panel: '#201338',
  },
  {
    id: 'aurora',
    name: 'شفق قطبی',
    desc: 'زمردی • فیروزه‌ای • بنفش • آبی',
    colors: ['#10b981', '#06b6d4'],
    extra: ['#8b5cf6', '#38bdf8'],
    bg: '#06141a',
    panel: '#0e2a33',
  },
  {
    id: 'amber',
    name: 'کهربا و فیروزه',
    desc: 'کهربایی • فیروزه‌ای • مرجانی • لیمویی',
    colors: ['#f59e0b', '#2dd4bf'],
    extra: ['#fb7185', '#fde047'],
    bg: '#101311',
    panel: '#252b24',
  },
  {
    id: 'candy',
    name: 'آبنبات شب',
    desc: 'سرخابی • زرد • آبی یخی • مرجانی',
    colors: ['#d946ef', '#facc15'],
    extra: ['#38bdf8', '#fb7185'],
    bg: '#14081c',
    panel: '#2d1240',
  },
  {
    id: 'indigo',
    name: 'دریاچه نیلی',
    desc: 'نیلی • فیروزه‌ای • صورتی • آبی',
    colors: ['#6366f1', '#2dd4bf'],
    extra: ['#f472b6', '#60a5fa'],
    bg: '#0a0c1f',
    panel: '#171a42',
  },
]

export const ACCENTS = [
  { id: 'indigo', label_fa: 'نیلی سلطنتی', label_en: 'Royal Indigo', hex: '#6366f1', light: '#eef2ff' },
  { id: 'emerald', label_fa: 'زمردی درخشان', label_en: 'Emerald Glow', hex: '#10b981', light: '#ecfdf5' },
  { id: 'cyan', label_fa: 'فیروزه‌ای الکتریک', label_en: 'Electric Cyan', hex: '#06b6d4', light: '#ecfeff' },
  { id: 'purple', label_fa: 'بنفش ارغوانی', label_en: 'Mystic Purple', hex: '#9333ea', light: '#faf5ff' },
  { id: 'rose', label_fa: 'رز غروب', label_en: 'Sunset Rose', hex: '#f43f5e', light: '#fff1f2' },
  { id: 'amber', label_fa: 'کهربایی طلایی', label_en: 'Golden Amber', hex: '#f59e0b', light: '#fffbeb' },
]

export const DEFAULT_SETTINGS = {
  skin: 'modern',
  mode: 'day',
  colors: { day: '#6253ba', night: '#216b50' },
  rgb: false,
  live: 'combined',
  motion: true,
  glow: true,
  particles: true,
  ink: true,
  glass: 55,
  aero: 'sky',
  xp: 'blue',
  y2k: 'cyan',
  neo: 'pop',
  liquid: 'clear',
  glassAero: 'regular',
  liquidScene: 'arctic',
  liquidReduceTransparency: false,
  liquidContrast: false,
  exportSync: true,
  density: 'comfortable',
}

export const isSkinConfigurable = (settings) => settings.skin === 'modern' || settings.skin === 'liquid'

export function blendColor(c1, c2, ratio) {
  const parse = (hex) => [1, 3, 5].map((s) => parseInt(hex.slice(s, s + 2), 16))
  const [r1, g1, b1] = parse(c1)
  const [r2, g2, b2] = parse(c2)
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio)
    .toString(16)
    .padStart(2, '0')
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio)
    .toString(16)
    .padStart(2, '0')
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio)
    .toString(16)
    .padStart(2, '0')
  return `#${r}${g}${b}`
}

export function rainbowColor(hueDegree) {
  const fn = (offset) => {
    const s = (offset + hueDegree / 30) % 12
    return Math.round(255 * (0.45 - 0.32 * Math.max(-1, Math.min(s - 3, 9 - s, 1))))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${fn(0)}${fn(8)}${fn(4)}`
}

export function relativeLuminance(hex) {
  return [1, 3, 5]
    .map((s) => parseInt(hex.slice(s, s + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, curr, idx) => acc + curr * [0.2126, 0.7152, 0.0722][idx], 0)
}

export function computeThemeVars(incomingSettings, rgbHue = 260) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(incomingSettings || {}),
    colors: {
      ...DEFAULT_SETTINGS.colors,
      ...((incomingSettings && incomingSettings.colors) || {}),
    },
  }
  let isNight = settings.mode === 'night'
  const currentMode = isNight ? 'night' : 'day'
  let skinColor =
    settings.rgb && isSkinConfigurable(settings)
      ? rainbowColor(rgbHue)
      : (settings.colors && settings.colors[currentMode]) || (isNight ? '#216b50' : '#6253ba')

  if (settings.skin === 'aero') {
    isNight = false
    skinColor = { sky: '#087ca5', ocean: '#007f80', garden: '#448326' }[settings.aero] || '#087ca5'
  } else if (settings.skin === 'xp') {
    isNight = false
    skinColor = { blue: '#215cce', olive: '#617c32', silver: '#5a617d' }[settings.xp] || '#215cce'
  } else if (settings.skin === 'y2k') {
    isNight = true
    skinColor = settings.y2k === 'lime' ? '#91db47' : '#42cae9'
  } else if (settings.skin === 'neo') {
    isNight = false
    skinColor = settings.neo === 'pink' ? '#a70cad' : '#08685f'
  }

  let bg = blendColor(isNight ? '#1a2027' : '#f5f6fa', skinColor, isNight ? 0.1 : 0.035)
  let surface = blendColor(isNight ? '#252c35' : '#ffffff', skinColor, isNight ? 0.09 : 0.012)
  let surface2 = blendColor(surface, skinColor, isNight ? 0.1 : 0.06)
  let text = isNight ? '#f4f2f9' : '#1f2330'
  let textMuted = isNight ? '#c5c1d1' : '#4e5468'
  let brand = skinColor

  while (!isNight && relativeLuminance(brand) > 0.15) {
    brand = blendColor(brand, '#000000', 0.12)
  }
  if (isNight) {
    brand = blendColor(skinColor, '#ffffff', 0.4)
  }

  if (settings.skin === 'xp') {
    bg = '#ece9d8'
    surface = '#ffffff'
    surface2 = '#e3eafa'
  } else if (settings.skin === 'aero') {
    bg = blendColor('#cfeaf7', skinColor, 0.14)
    surface = blendColor('#e9f7fd', skinColor, 0.08)
    surface2 = blendColor('#c4e6f4', skinColor, 0.16)
  } else if (settings.skin === 'neo') {
    bg = settings.neo === 'pink' ? '#f1b1ee' : '#f3dd56'
    surface = '#fffef8'
    surface2 = settings.neo === 'pink' ? '#ffd6f2' : '#bde9dd'
  } else if (settings.skin === 'y2k') {
    bg = '#070c13'
    surface = '#17222e'
    surface2 = '#253644'
  }

  const duet = DUETS.find((d) => d.id === settings.duet)
  const isDuetActive =
    !!duet && isSkinConfigurable(settings) && (settings.skin !== 'liquid' || !!settings.liquidPalette) && !settings.rgb
  const secondaryAccent = isDuetActive ? duet.colors[1] : skinColor

  if (isDuetActive) {
    if (isNight) {
      bg = duet.bg
      surface = duet.panel
      surface2 = blendColor(surface, '#ffffff', 0.055)
    } else {
      bg = blendColor('#f9f9fc', duet.colors[1], 0.035)
      surface = '#ffffff'
      surface2 = blendColor(surface, skinColor, 0.06)
    }
  }

  if (settings.skin === 'liquid' && !settings.liquidPalette) {
    skinColor = {
      arctic: ['#0864c8', '#87bfff'],
      lagoon: ['#086d65', '#72dfca'],
      dusk: ['#7041b3', '#d1aeff'],
    }[settings.liquidScene || 'arctic'][isNight ? 1 : 0]
    brand = skinColor
    bg = isNight ? '#101825' : '#eaf0f8'
    surface = isNight ? '#233044' : '#f9fbff'
    surface2 = isNight ? '#293a50' : '#edf2f9'
    text = isNight ? '#f3f7ff' : '#17253a'
    textMuted = isNight ? '#bac9dd' : '#506176'
  }

  const onBrandColor = relativeLuminance(brand) > 0.18 ? '#101827' : '#ffffff'
  const primaryColor = isNight ? blendColor(skinColor, '#000000', 0.3) : brand

  const vars = {
    bg,
    surface,
    'surface-2': surface2,
    'surface-3': blendColor(surface2, skinColor, 0.08),
    text,
    'text-muted': textMuted,
    'text-faint': textMuted,
    brand,
    'brand-2': brand,
    'on-brand': isDuetActive && settings.skin === 'modern' ? '#11131c' : onBrandColor,
    'brand-soft': blendColor(surface, brand, 0.1),
    'brand-soft-strong': blendColor(surface, brand, 0.18),
    'brand-line': blendColor(surface, brand, 0.35),
    border: blendColor(surface, skinColor, isNight ? 0.34 : 0.3),
    'border-soft': blendColor(surface, skinColor, isNight ? 0.3 : 0.2),
    panel: surface,
    'grad-brand': isDuetActive
      ? `linear-gradient(110deg, ${secondaryAccent}, ${skinColor})`
      : `linear-gradient(135deg, ${brand}, ${brand})`,
    'rv-glow': skinColor,
    'rv-glow2': isDuetActive ? secondaryAccent : blendColor(skinColor, isNight ? '#729aff' : '#a0bfff', 0.55),
    'rv-login': blendColor(skinColor, '#111727', 0.65),
    'rv-login-accent': '#eeeeff',
    accent: brand,
    'skin-color': skinColor,
    'rv-blur': `${10 + (settings.glass || 55) * 0.25}px`,
    'glass-alpha': String(0.91 - (settings.glass || 55) * 0.004),
    wallpaper:
      duet && isSkinConfigurable(settings)
        ? `radial-gradient(ellipse at 10% 15%, ${secondaryAccent}${isNight ? '25' : '17'}, transparent 62%), radial-gradient(ellipse at 85% 90%, ${skinColor}${isNight ? '20' : '12'}, transparent 60%)${
            duet && duet.extra
              ? `, radial-gradient(ellipse at 88% 12%, ${duet.extra[0]}${isNight ? '1f' : '12'}, transparent 55%), radial-gradient(ellipse at 12% 88%, ${duet.extra[1]}${isNight ? '1f' : '12'}, transparent 55%)`
              : ''
          }`
        : 'none',
    'secondary-accent': secondaryAccent,
  }

  if (settings.skin === 'aero') {
    vars.wallpaper =
      settings.aero === 'ocean'
        ? `url("${AERO_OCEAN_WP}")`
        : settings.aero === 'garden'
        ? `url("${AERO_GARDEN_WP}")`
        : `url("${AERO_SKY_WP}")`
  } else if (settings.skin === 'y2k' && settings.y2k === 'lime') {
    vars.wallpaper = `url("${Y2K_LIME_WP}")`
  } else if (settings.skin === 'xp') {
    vars.wallpaper = `url("${XP_BLISS_WP}")`
  } else if (settings.skin === 'liquid') {
    if (isNight) {
      vars.bg = '#070c16'
      vars.surface = '#0e1626'
      vars['surface-2'] = '#131d30'
      vars.panel = '#0e1626'
      vars.wallpaper = `radial-gradient(ellipse at 12% 12%, ${skinColor}12, transparent 58%), radial-gradient(ellipse at 88% 88%, ${skinColor}0d, transparent 55%)`
    }
    vars['lg-glass-fill'] =
      settings.liquid === 'tinted'
        ? isNight
          ? '#243247e8'
          : '#f6f9ffeb'
        : isNight
        ? `rgba(28, 43, 64, ${(0.84 - (settings.glass || 55) * 0.0062).toFixed(3)})`
        : `rgba(241, 247, 255, ${(0.84 - (settings.glass || 55) * 0.0062).toFixed(3)})`
    vars['lg-pane-fill'] = isNight
      ? `rgba(22, 38, 57, ${(0.88 - (settings.glass || 55) * 0.005).toFixed(3)})`
      : `rgba(248, 252, 255, ${(0.88 - (settings.glass || 55) * 0.005).toFixed(3)})`
    vars['lg-blur'] = `${18 + (settings.glass || 55) * 0.16}px`
    vars['lg-accent'] = skinColor
    vars['lg-glass-tint'] = blendColor(skinColor, isNight ? '#172940' : '#ffffff', 0.88)

    const scenes = {
      arctic: isNight
        ? ['#0a1c33', '#161130', '#062025', '#281a21']
        : ['#1e4d7b', '#3a2f73', '#0e5b52', '#743a56'],
      lagoon: isNight
        ? ['#091d24', '#0c1f1f', '#07211c', '#242113']
        : ['#175263', '#1c4e49', '#0c5941', '#77652b'],
      dusk: isNight
        ? ['#191226', '#121326', '#0e1826', '#261721']
        : ['#4a3670', '#33356e', '#2c4a72', '#7c4456'],
    }
    const pal = settings.liquidPalette
      ? [
          blendColor(bg, skinColor, isNight ? 0.35 : 0.22),
          blendColor(bg, secondaryAccent, isNight ? 0.3 : 0.22),
          blendColor(bg, secondaryAccent, isNight ? 0.4 : 0.3),
          blendColor(bg, skinColor, isNight ? 0.23 : 0.15),
        ]
      : scenes[settings.liquidScene || 'arctic']

    ;['lg-blue', 'lg-violet', 'lg-teal', 'lg-warm'].forEach((k, idx) => {
      vars[k] = pal[idx]
    })

    vars['lg-overlay'] = settings.liquidPalette ? blendColor(surface, skinColor, 0.04) + 'f2' : isNight ? '#233147f5' : '#f3f7fff0'
    vars['lg-inset'] = settings.liquidPalette ? blendColor(surface, skinColor, 0.06) + '55' : isNight ? '#263f563d' : '#eef6ff45'
    vars['lg-field'] = settings.liquidPalette ? blendColor(surface, skinColor, 0.03) + (isNight ? '99' : '75') : isNight ? '#15283c99' : '#ffffff75'

    if (settings.liquidPalette) {
      const rgbaFn = (hexVal, alphaVal) =>
        `rgba(${[1, 3, 5].map((i) => parseInt(hexVal.slice(i, i + 2), 16)).join(',')}, ${alphaVal.toFixed(3)})`
      vars['lg-pane-fill'] = rgbaFn(surface, 0.88 - (settings.glass || 55) * 0.005)
      vars['lg-glass-fill'] = rgbaFn(surface, settings.liquid === 'tinted' ? 0.9 : 0.84 - (settings.glass || 55) * 0.0062)
    }
  }

  const statusColors = isNight
    ? { success: '#8fe2b8', danger: '#ffa8b9', warning: '#f3ce81', info: '#a1caff' }
    : { success: '#18704a', danger: '#b62845', warning: '#865b0b', info: '#215f9f' }

  Object.entries(statusColors).forEach(([st, hexVal]) => {
    vars[st] = hexVal
    vars[`${st}-bg`] = blendColor(surface, hexVal, 0.11)
    vars[`${st}-border`] = blendColor(surface, hexVal, 0.35)
    vars[`${st}-strong-bg`] = vars[`${st}-bg`]
    vars[`${st}-strong-text`] = hexVal
  })

  if (isDuetActive) {
    vars.border = isNight ? '#ffffff29' : blendColor(surface, skinColor, 0.23)
    vars['border-soft'] = isNight ? '#ffffff19' : blendColor(surface, skinColor, 0.15)
    if (duet.id === 'obsidian' && isNight) {
      vars.wallpaper = 'radial-gradient(ellipse at 50% 0%, #141414, transparent 65%)'
    }
  }

  vars['on-status'] = isNight ? '#14202e' : '#ffffff'

  // Standard Synapse platform mappings:
  vars.primary = brand
  vars['primary-2'] = secondaryAccent
  vars.ink = text
  vars.muted = textMuted
  vars.card = surface
  vars.line = vars.border
  vars.grad = vars['grad-brand']

  return {
    dark: isNight,
    color: skinColor,
    primary: primaryColor,
    vars,
    bg,
    surface,
    sub: surface2,
    text,
    muted: textMuted,
    brand,
  }
}

export function applyTheme(doc, settings, rgbHue = 260) {
  const result = computeThemeVars(settings, rgbHue)
  const el = doc.documentElement

  el.dataset.skin = settings.skin
  el.dataset.duet = (settings.skin === 'modern' || settings.skin === 'liquid') && !settings.rgb && settings.duet ? settings.duet : ''
  el.dataset.mode = result.dark ? 'night' : 'day'
  el.dataset.theme = result.dark ? 'dark' : 'light'
  el.dataset.variant =
    settings.skin === 'neo'
      ? settings.neo
      : settings.skin === 'aero'
      ? settings.aero
      : settings.skin === 'xp'
      ? settings.xp
      : settings.skin === 'liquid'
      ? 'regular'
      : settings.y2k
  el.dataset.liquidScene = settings.liquidScene || 'arctic'
  el.dataset.liquidOpaque = 'false'
  el.dataset.liquidMaterial = settings.skin === 'liquid' && settings.liquid === 'matte' ? 'matte' : 'glass'
  el.dataset.liquidContrast = 'false'
  el.dataset.density = settings.density || 'comfortable'
  el.dataset.effects = settings.skin === 'liquid' || settings.motion ? 'on' : 'off'
  el.dataset.spotlight = settings.skin === 'modern' && settings.glow && settings.motion ? 'on' : 'off'
  el.style.colorScheme = result.dark ? 'dark' : 'light'

  Object.entries(result.vars).forEach(([key, val]) => {
    el.style.setProperty(`--${key}`, val)
  })

  return result
}

// Ensure refraction SVG filter exists in DOM for true liquid refraction
function ensureGlassFilter(doc) {
  if (doc.getElementById('rava-glass-refraction-svg')) return
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = 'rava-glass-refraction-svg'
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:fixed;pointer-events:none;overflow:hidden;width:0;height:0;'
  svg.innerHTML = `
    <defs>
      <filter id="rava-glass-refraction" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="1" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="smooth" />
        <feDisplacementMap in="SourceGraphic" in2="smooth" scale="12" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation=".7" />
      </filter>
    </defs>
  `
  doc.body.appendChild(svg)
}

function ravaInkAllowed(doc, settings) {
  if (!doc) return false
  const view = doc.defaultView || window
  if (
    !view ||
    ['neo', 'aero', 'xp', 'y2k'].includes(settings.skin) ||
    settings.live === 'off' ||
    settings.ink === false ||
    !settings.motion
  )
    return false
  if (typeof view.navigator !== 'undefined' && /Android/i.test(view.navigator.userAgent)) return false
  return (
    view.matchMedia &&
    view.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !view.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function setupLiquidGlassLighting(doc, settings) {
  if (!doc) return () => {}
  const view = doc.defaultView || window
  if (!view) return () => {}
  const reduced = view.matchMedia ? view.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }
  let currentTarget = null
  let rafId = 0
  let pointerX = 0
  let pointerY = 0

  const clear = () => {
    if (currentTarget) {
      currentTarget.removeAttribute('data-lg-lit')
      currentTarget = null
    }
  }

  const update = () => {
    rafId = 0
    if (currentTarget) {
      currentTarget.style.setProperty('--lg-pointer-x', `${pointerX}px`)
      currentTarget.style.setProperty('--lg-pointer-y', `${pointerY}px`)
    }
  }

  const move = (ev) => {
    if (doc.hidden || reduced.matches || ev.pointerType === 'touch') return
    const el = ev.target?.closest?.('[data-lg="bar"], [data-lg="surface"], .lg-preview-bar')
    if (currentTarget !== el) {
      clear()
      currentTarget = el || null
      currentTarget?.setAttribute('data-lg-lit', 'true')
    }
    if (currentTarget) {
      const rect = currentTarget.getBoundingClientRect()
      pointerX = ev.clientX - rect.left
      pointerY = ev.clientY - rect.top
      if (!rafId) rafId = view.requestAnimationFrame(update)
    }
  }

  doc.addEventListener('pointermove', move, { passive: true })
  doc.addEventListener('pointerleave', clear)

  return () => {
    clear()
    if (rafId) view.cancelAnimationFrame(rafId)
    doc.removeEventListener('pointermove', move)
    doc.removeEventListener('pointerleave', clear)
  }
}

/**
 * Pure Declarative React Background Stage:
 * Renders Wallpaper, Ambient Floating Particles, and Interactive Ink Canvas
 * without imperative DOM tree mutations (append/prepend/remove), preventing any React reconciliation crashes.
 */
function StudioCanvasStage({ settings }) {
  const canvasRef = useRef(null)
  const particlesAllowed = isSkinConfigurable(settings)
  const inkAllowed = ravaInkAllowed(typeof document !== 'undefined' ? document : null, settings)

  useEffect(() => {
    if (!inkAllowed || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let raf = 0
    let points = []
    let lastMove = 0
    let dpr = 1

    function resize() {
      if (!canvas || !ctx) return
      dpr = Math.min(1.5, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(window.innerWidth * dpr))
      canvas.height = Math.max(1, Math.round(window.innerHeight * dpr))
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    function frame(now) {
      raf = 0
      if (!ctx || !canvas || document.hidden) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      points = points.filter((p) => now - p.t < 430).slice(-90)
      const fade = Math.max(0, 1 - Math.max(0, now - lastMove - 45) / 330)
      if (fade <= 0) {
        points = []
        return
      }
      if (points.length < 3) return

      const night = document.documentElement.dataset.mode === 'night'
      const css = window.getComputedStyle(document.documentElement)
      const readColor = (name, fallback) => {
        const val = css.getPropertyValue(name).trim()
        return /^#[\da-f]{6}$/i.test(val) ? val : fallback
      }
      const primary = readColor('--skin-color', '#6253ba')
      const secondary = readColor('--secondary-accent', primary)
      const headColor = night ? blendColor(primary, '#ffffff', 0.45) : blendColor(primary, '#ffffff', 0.1)
      const rgba = (hex, alpha) =>
        'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',') + ',' + alpha + ')'

      const n = points.length,
        tail = points[0],
        head = points[n - 1]
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = night ? 'lighter' : 'source-over'

      const grad = ctx.createLinearGradient(
        tail.x,
        tail.y,
        head.x + (head.x === tail.x ? 1 : 0),
        head.y + (head.y === tail.y ? 1 : 0),
      )
      grad.addColorStop(0, rgba(secondary, 0))
      grad.addColorStop(0.24, rgba(secondary, night ? 0.18 : 0.13))
      grad.addColorStop(0.72, rgba(primary, night ? 0.7 : 0.47))
      grad.addColorStop(1, rgba(headColor, night ? 0.9 : 0.68))

      function ribbonPath(strand) {
        const coords = points.map((p, i) => {
          const p0 = points[Math.max(0, i - 1)],
            p1 = points[Math.min(n - 1, i + 1)]
          const dx = p1.x - p0.x,
            dy = p1.y - p0.y
          const len = Math.hypot(dx, dy) || 1
          const u = i / (n - 1)
          const fan = (1 - u) * (7 + 29 * Math.sin(Math.PI * u))
          const wave = 5 * (1 - u) * Math.sin(u * 14 + strand * 0.18 + now * 0.0015)
          const displacement = (strand / 9) * (fan + wave)
          return { x: p.x - (dy / len) * displacement, y: p.y + (dx / len) * displacement }
        })
        ctx.beginPath()
        ctx.moveTo(coords[0].x, coords[0].y)
        for (let i = 1; i < n - 1; i++) {
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, (coords[i].x + coords[i + 1].x) / 2, (coords[i].y + coords[i + 1].y) / 2)
        }
        ctx.lineTo(coords[n - 1].x, coords[n - 1].y)
      }

      for (let strand = -9; strand <= 9; strand++) {
        ribbonPath(strand)
        ctx.strokeStyle = grad
        ctx.lineWidth = strand % 4 === 0 ? 3.8 : 2.2
        ctx.shadowColor = headColor
        ctx.shadowBlur = night ? 23 : 10
        ctx.globalAlpha = fade * (night ? 0.43 : 0.4)
        ctx.stroke()
      }
      ctx.restore()
      raf = window.requestAnimationFrame(frame)
    }

    function move(ev) {
      if (document.hidden || ev.pointerType === 'touch') return
      if (ctx && (ev.pointerType === 'mouse' || ev.pointerType === 'pen')) {
        const now = window.performance.now(),
          x = ev.clientX,
          y = ev.clientY
        const prev = points[points.length - 1]
        if (
          prev &&
          (now - lastMove > 1500 ||
            Math.hypot(x - prev.x, y - prev.y) > Math.max(window.innerWidth, window.innerHeight) * 0.6)
        ) {
          points = []
        }
        const from = points[points.length - 1]
        if (!from) {
          points.push({ x, y, t: now })
        } else {
          const dist = Math.hypot(x - from.x, y - from.y)
          const steps = Math.max(1, Math.min(14, Math.ceil(dist / 12)))
          for (let i = 1; i <= steps; i++) {
            points.push({ x: from.x + ((x - from.x) * i) / steps, y: from.y + ((y - from.y) * i) / steps, t: now })
          }
          if (points.length > 90) points.splice(0, points.length - 90)
        }
        lastMove = now
        if (!raf) raf = window.requestAnimationFrame(frame)
      }
    }

    document.addEventListener('pointermove', move, { passive: true })

    return () => {
      document.removeEventListener('pointermove', move)
      window.removeEventListener('resize', resize)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [inkAllowed, settings.mode, settings.skin, settings.duet])

  return (
    <div
      className="skin-wallpaper"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 1. Ambient Floating Particles */}
      {particlesAllowed && settings.live !== 'off' && settings.particles !== false && settings.motion && (
        <div
          className="studio-background"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <i
              key={i}
              className="studio-particle"
              style={{
                width: `${75 + ((i * 37) % 115)}px`,
                height: `${75 + ((i * 37) % 115)}px`,
                left: `${(i * 31 + 7) % 100}%`,
                top: `${(i * 43 + 13) % 100}%`,
                animationDuration: `${10 + (i % 9)}s`,
                animationDelay: `-${i * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 2. Interactive Ribbon Trail Canvas */}
      {inkAllowed && (
        <canvas
          ref={canvasRef}
          className="studio-ink rava-ink-ribbons"
          style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', display: 'block' }}
        />
      )}
    </div>
  )
}

const ThemeCtx = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
  theme: 'light',
  mode: 'day',
  toggle: () => {},
  toggleMode: () => {},
  skin: 'modern',
  setSkin: () => {},
  changeSkin: () => {},
  accent: 'indigo',
  setAccent: () => {},
  changeAccent: () => {},
  duet: undefined,
  setDuet: () => {},
  SKINS,
  DUETS,
  ACCENTS,
  studioOpen: false,
  openStudio: () => {},
  closeStudio: () => {},
})

export const useTheme = () => useContext(ThemeCtx)

function loadInitialSettings() {
  try {
    const raw = localStorage.getItem('rava-studio-v3')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        colors: {
          ...DEFAULT_SETTINGS.colors,
          ...(parsed && typeof parsed.colors === 'object' ? parsed.colors : {}),
        },
      }
    }
  } catch (_) {}

  // Fallback to legacy keys if present
  const legacyTheme = localStorage.getItem('app_theme') || 'light'
  const legacySkin = localStorage.getItem('app_skin') || 'modern'
  const legacyAccent = localStorage.getItem('app_accent') || 'indigo'
  return {
    ...DEFAULT_SETTINGS,
    skin: SKINS.some((s) => s.id === legacySkin) ? legacySkin : 'modern',
    mode: legacyTheme === 'dark' ? 'night' : 'day',
    duet: legacyAccent === 'obsidian' ? 'obsidian' : undefined,
    colors: { ...DEFAULT_SETTINGS.colors },
  }
}

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(loadInitialSettings)
  const [studioOpen, setStudioOpen] = useState(false)
  const rgbHueRef = useRef(260)

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const prevSafe = prev || DEFAULT_SETTINGS
      const next = typeof partial === 'function' ? partial(prevSafe) : { ...prevSafe, ...partial }
      const safeNext = {
        ...DEFAULT_SETTINGS,
        ...next,
        colors: {
          ...DEFAULT_SETTINGS.colors,
          ...(prevSafe.colors || {}),
          ...(next.colors || {}),
        },
      }
      try {
        localStorage.setItem('rava-studio-v3', JSON.stringify(safeNext))
      } catch (_) {}
      return safeNext
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } })
    try {
      localStorage.setItem('rava-studio-v3', JSON.stringify(DEFAULT_SETTINGS))
    } catch (_) {}
  }, [])

  // Apply theme variables & datasets whenever settings change
  useEffect(() => {
    applyTheme(document, settings, rgbHueRef.current)
    const cleanupLighting = setupLiquidGlassLighting(document, settings)
    return () => {
      if (cleanupLighting) cleanupLighting()
    }
  }, [settings])

  // RGB rotating hue loop if RGB mode enabled
  useEffect(() => {
    if (!settings.rgb || !isSkinConfigurable(settings) || !settings.motion) return
    const interval = setInterval(() => {
      if (document.hidden) return
      rgbHueRef.current = (rgbHueRef.current + 1.2) % 360
      applyTheme(document, settings, rgbHueRef.current)
    }, 150)
    return () => clearInterval(interval)
  }, [settings])

  const toggle = useCallback(() => {
    updateSettings((prev) => ({
      mode: (prev && prev.mode) === 'night' ? 'day' : 'night',
    }))
  }, [updateSettings])

  const changeSkin = useCallback(
    (newSkin) => {
      updateSettings({ skin: newSkin })
    },
    [updateSettings],
  )

  const changeAccent = useCallback(
    (newAccent) => {
      const duetFound = DUETS.find((d) => d.id === newAccent)
      if (duetFound) {
        updateSettings({
          liquidPalette: true,
          duet: newAccent,
          mode: ['obsidian', 'home'].includes(newAccent) ? 'night' : settings.mode || 'day',
          colors: { day: duetFound.colors[0], night: duetFound.colors[0] },
          rgb: false,
        })
      } else {
        const accFound = ACCENTS.find((a) => a.id === newAccent)
        const hex = accFound ? accFound.hex : newAccent
        const currentMode = (settings.mode || 'day') === 'night' ? 'night' : 'day'
        const currentColors = settings.colors || DEFAULT_SETTINGS.colors
        updateSettings({
          liquidPalette: true,
          colors: { ...currentColors, [currentMode]: hex },
          rgb: false,
          duet: undefined,
        })
      }
    },
    [settings.mode, settings.colors, updateSettings],
  )

  const currentTheme = settings.mode === 'night' ? 'dark' : 'light'

  return (
    <ThemeCtx.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        theme: currentTheme,
        mode: settings.mode,
        toggle,
        toggleMode: toggle,
        skin: settings.skin,
        setSkin: changeSkin,
        changeSkin,
        accent: settings.duet || 'indigo',
        setAccent: changeAccent,
        changeAccent,
        duet: settings.duet,
        setDuet: (d) => updateSettings({ duet: d }),
        SKINS,
        DUETS,
        ACCENTS,
        studioOpen,
        openStudio: () => setStudioOpen(true),
        closeStudio: () => setStudioOpen(false),
      }}
    >
      {/* 1. Optical Refraction SVG Filter */}
      <svg id="rava-glass-refraction-svg" aria-hidden="true" style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id="rava-glass-refraction" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="1" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="smooth" />
            <feDisplacementMap in="SourceGraphic" in2="smooth" scale="12" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation=".7" />
          </filter>
        </defs>
      </svg>

      {/* 2. Declarative Wallpaper, Particles, and Canvas Layer */}
      <StudioCanvasStage settings={settings} />

      {/* 3. Main Application Tree */}
      <div className="app-content-root" style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeCtx.Provider>
  )
}
