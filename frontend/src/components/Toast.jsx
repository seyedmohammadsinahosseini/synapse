import { useRef, useState } from 'react'

/**
 * Tiny auto-dismissing toast. Returns { toast, show, view }.
 *   show(text, type?)   type: 'ok' (default) | 'err'
 * Rendered with <View /> (place once at the end of the page).
 */
export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = (text, type = 'ok') => {
    setToast({ text, type })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }

  const view = toast ? (
    <div className={`toast toast-${toast.type || 'ok'}`} key={Date.now()}>
      {toast.type === 'err' ? '⚠️' : '✅'} {toast.text}
    </div>
  ) : null

  return { show, view }
}
