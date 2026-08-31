// Small API client for the FastAPI backend + shared helpers.
//
// Session storage note: we use sessionStorage (per-tab) instead of
// localStorage (shared across ALL tabs of the same origin). localStorage
// caused a real bug: when the app runs in several tabs/windows at once,
// one tab hitting a 401 called clearSession() and wiped the just-saved
// token of every other tab → "session expired" loop. Per-tab storage
// makes each tab independent.

const TOKEN_KEY = 'mentor_token'
const USER_KEY = 'mentor_user'

// migrate any old localStorage session into sessionStorage once, then remove it
function migrateLegacy() {
  try {
    if (!window.sessionStorage.getItem(TOKEN_KEY)) {
      const lt = window.localStorage.getItem(TOKEN_KEY)
      const lu = window.localStorage.getItem(USER_KEY)
      if (lt) {
        window.sessionStorage.setItem(TOKEN_KEY, lt)
        if (lu) window.sessionStorage.setItem(USER_KEY, lu)
      }
    }
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  } catch (e) {
    /* ignore */
  }
}
migrateLegacy()

export const getToken = () => window.sessionStorage.getItem(TOKEN_KEY)
export const getUser = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}
export const setSession = (token, user) => {
  window.sessionStorage.setItem(TOKEN_KEY, token)
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}
export const clearSession = () => {
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(USER_KEY)
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(path, { method, headers, body: payload })
  } catch (e) {
    throw new Error('اتصال به سرور برقرار نشد؛ اینترنت یا سرور را بررسی کنید.')
  }

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (res.status === 401) {
    const detail = ((data && data.detail) || '').toLowerCase()
    const hadToken = !!token
    clearSession()
    let reason = ''
    if (hadToken) {
      reason =
        detail.includes('user not found') || detail.includes('کاربر یافت نشد')
          ? 'Account not found on this server. Please log in again.'
          : 'Your session has expired. Please log in again.'
      sessionStorage.setItem('session_msg', reason)
    }
    const h = window.location.hash || '#/login'
    if (h !== '#/login' && !h.startsWith('#/register')) {
      window.location.hash = '#/login'
    }
    throw new Error(reason || 'Authentication required')
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) || `خطا (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

// ── i18n-aware formatting ──────────────────────────────────────────────
let _lang = 'fa'
export const setLang = (l) => { _lang = l === 'en' ? 'en' : 'fa' }
export const getLang = () => _lang

const FA = '۰۱۲۳۴۵۶۷۸۹'
export const fa = (n) =>
  _lang === 'fa'
    ? String(n == null ? '' : n).replace(/[0-9]/g, (d) => FA[+d])
    : String(n == null ? '' : n)

export const faDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (_lang === 'en') {
    return d.toLocaleDateString('en-GB') + ' — ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return (
    fa(d.toLocaleDateString('fa-IR')) +
    ' — ' +
    fa(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))
  )
}

export const faClock = (sec) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return fa(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
}

// compact number: 12345 -> ۱۲٫۳هزار / 12.3K
export const faCompact = (n) => {
  const v = Number(n) || 0
  if (_lang === 'en') {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
    return String(v)
  }
  if (v >= 1_000_000) return fa((v / 1_000_000).toFixed(1).replace(/\.0$/, '')) + ' میلیون'
  if (v >= 1_000) return fa((v / 1_000).toFixed(1).replace(/\.0$/, '')) + ' هزار'
  return fa(v)
}

export const gradeColor = (score) => {
  if (score >= 17) return '#22c55e'
  if (score >= 14) return '#eab308'
  if (score >= 10) return '#f97316'
  return '#ef4444'
}
