/**
 * Persian (Jalali) & Gregorian date helper for Synapse Topbar & Calendars
 */

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
]

const PERSIAN_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
]

const ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const ENGLISH_WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export function getTodayDisplayDate(lang = 'fa') {
  const now = new Date()

  if (lang === 'en') {
    const weekday = ENGLISH_WEEKDAYS[now.getDay()]
    const month = ENGLISH_MONTHS[now.getMonth()]
    const day = now.getDate()
    return `${weekday}, ${month} ${day}`
  }

  // Use Intl.DateTimeFormat for exact Persian Jalali conversion
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    })
    const parts = formatter.formatToParts(now)
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const month = parts.find((p) => p.type === 'month')?.value || ''
    const weekday = parts.find((p) => p.type === 'weekday')?.value || ''
    return `${day} ${month} ${weekday}`
  } catch (_) {
    // Fallback if Intl is not available
    const weekday = PERSIAN_WEEKDAYS[now.getDay()]
    return `امروز ${weekday}`
  }
}
