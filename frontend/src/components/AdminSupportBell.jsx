import { useEffect, useRef, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'

const CAT_ICON = { support: '🛠️', bug: '🐞', feedback: '💬' }

/**
 * Admin bell in the top bar. Shows the number of unread student feedback /
 * support messages as a red badge; opens a medium floating panel where each
 * request appears together with the student's full details.
 */
export default function AdminSupportBell() {
  const { t } = useLang()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)

  const loadCount = () => {
    api('/api/admin/support/unread-count')
      .then((r) => setCount(r.count || 0))
      .catch(() => {})
  }
  useEffect(() => {
    loadCount()
    const int = setInterval(loadCount, 12000)
    window.addEventListener('focus', loadCount)
    return () => {
      clearInterval(int)
      window.removeEventListener('focus', loadCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    setError('')
    if (next) {
      try {
        const list = await api('/api/admin/support')
        setItems(list)
        if (list.some((x) => !x.is_read)) {
          api('/api/admin/support/read-all').catch(() => {})
          setCount(0)
        }
      } catch (e) {
        setError(e.message)
      }
    }
  }

  const catLabel = (c) =>
    c === 'bug' ? t('catBug') : c === 'feedback' ? t('catFeedback') : t('catSupport')

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button className="btn ghost sm icon-btn bell-btn" title={t('feedbackToAdmin')} onClick={toggle}>
        🔔
        {count > 0 && <span className="bell-badge">{fa(count)}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <div>
              <b>{t('feedbackToAdmin')}</b>
              <div className="small muted">{t('feedbackToAdminSub')}</div>
            </div>
            <button className="btn ghost sm" onClick={() => setOpen(false)}>✕</button>
          </div>
          {error && <div className="error-box" style={{ margin: 12 }}>{error}</div>}
          <div className="bell-list">
            {!items && <div className="empty">…</div>}
            {items && items.length === 0 && <div className="empty">{t('bellEmpty')}</div>}
            {items?.map((m) => (
              <div key={m.id} className={`bell-item ${m.is_read ? '' : 'unread'}`}>
                <div className="between">
                  <div className="flex">
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>
                      {(m.full_name || '؟').slice(0, 1)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 13.5 }}>{m.full_name}</b>
                      <div className="small muted" dir="ltr" style={{ textAlign: 'right' }}>
                        {m.email}{m.phone ? ' · ' + m.phone : ''}
                      </div>
                    </div>
                  </div>
                  <span className={`cat-tag ${m.category}`}>{CAT_ICON[m.category] || '🛠️'} {catLabel(m.category)}</span>
                </div>
                <div className="bell-meta small muted">
                  {m.field && m.grade ? `${m.field} — ${m.grade}` : ''}
                  {m.address ? ' · ' + m.address : ''}
                </div>
                <div className="bell-msg">{m.content}</div>
                <div className="small muted bell-time">{faDate(m.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
