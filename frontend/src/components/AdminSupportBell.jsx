import { useEffect, useRef, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Modal } from '../ui.jsx'

const CAT_ICON = { support: '🛠️', bug: '🐞', feedback: '💬' }

/**
 * Admin bell in the top bar. Shows the number of unread student feedback /
 * support messages as a red badge; opens a floating panel where each
 * request appears together with the student's full details and real-time live chat reply.
 */
export default function AdminSupportBell() {
  const { t } = useLang()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketMessages, setTicketMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
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

  const openTicketChat = async (ticket) => {
    setSelectedTicket(ticket)
    setReplyText('')
    try {
      const res = await api(`/api/support/tickets/${ticket.id}/messages`)
      if (res.ok) {
        setTicketMessages(res.messages || [])
      }
    } catch (e) {
      setTicketMessages([])
    }
  }

  const sendReply = async (e) => {
    e?.preventDefault()
    if (!replyText.trim() || !selectedTicket) return
    setSendingReply(true)
    try {
      await api(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: { content: replyText.trim() },
      })
      setReplyText('')
      // Refresh messages
      const res = await api(`/api/support/tickets/${selectedTicket.id}/messages`)
      if (res.ok) setTicketMessages(res.messages || [])
    } catch (e) {
      alert('خطا در ارسال پاسخ: ' + e.message)
    } finally {
      setSendingReply(false)
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
              <div
                key={m.id}
                className={`bell-item ${m.is_read ? '' : 'unread'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => openTicketChat(m)}
              >
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
                <div className="between" style={{ marginTop: 6, alignItems: 'center' }}>
                  <span className="small muted bell-time">{faDate(m.created_at)}</span>
                  <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>
                    💬 پاسخ و گفت‌وگو {m.messages_count > 1 ? `(${fa(m.messages_count)})` : ''} ←
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Ticket Chat Modal */}
      {selectedTicket && (
        <Modal
          title={`💬 گفت‌وگوی پشتیبانی با ${selectedTicket.full_name}`}
          onClose={() => setSelectedTicket(null)}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', maxHeight: 520 }}>
            {/* User Info Strip */}
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: 13.5 }}>{selectedTicket.full_name} ({selectedTicket.email})</b>
                <div className="small muted">{selectedTicket.field} · {selectedTicket.grade} {selectedTicket.phone ? `· تلفن: ${selectedTicket.phone}` : ''}</div>
              </div>
              <span className={`cat-tag ${selectedTicket.category}`}>
                {CAT_ICON[selectedTicket.category] || '🛠️'} {catLabel(selectedTicket.category)}
              </span>
            </div>

            {/* Scrollable Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ticketMessages.length === 0 && (
                <div className="small muted" style={{ textAlign: 'center', padding: 20 }}>در حال بارگذاری پیام‌ها...</div>
              )}
              {ticketMessages.map((msg) => {
                const isAdmin = msg.sender_role === 'admin'
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                      maxWidth: '78%',
                      background: isAdmin ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#f1f5f9',
                      color: isAdmin ? '#fff' : '#1e293b',
                      padding: '10px 14px',
                      borderRadius: 14,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.85 }}>
                      {isAdmin ? '🛡️ پشتیبانی سیناپس' : `👤 ${msg.sender_name}`} · {faDate(msg.created_at)}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{msg.content}</div>
                  </div>
                )
              })}
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={sendReply} style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, borderRadius: 10 }}
                placeholder="پاسخ خود را به دانش‌آموز بنویسید..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button
                type="submit"
                className="btn sm"
                style={{ borderRadius: 10, padding: '0 18px', fontWeight: 700 }}
                disabled={sendingReply || !replyText.trim()}
              >
                {sendingReply ? '...' : 'ارسال پاسخ ↵'}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  )
}
