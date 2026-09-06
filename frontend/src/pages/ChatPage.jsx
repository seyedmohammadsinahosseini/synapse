import { useEffect, useMemo, useRef, useState } from 'react'
import { api, faDate, getToken } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

/**
 * Full messenger page (reached from the slide-bar "Chat" button).
 * Two panes: the conversation LIST sits on the right (with the last message
 * of each peer); clicking one opens the full threaded chat on the left.
 *
 * Works for both roles:
 *  - student → the single conversation with their mentor (or a connect prompt)
 *  - mentor  → every connected student; optional pre-select via ?student=ID
 */
export default function ChatPage({ navigate, preselectStudent = null }) {
  const { user } = useAuth()
  const { t } = useLang()
  const isMentor = user?.role === 'mentor'

  const [convs, setConvs] = useState(null)          // null = loading
  const [sel, setSel] = useState(null)              // {student_id, peer_name, subtitle}
  const [connectCode, setConnectCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const wsReady = useRef(false)

  const load = () => {
    api('/api/chat/conversations')
      .then((rows) => {
        setConvs(rows)
        // pre-selection
        if (preselectStudent) {
          const hit = rows.find((r) => r.student_id === preselectStudent)
          if (hit) setSel(hit)
        }
        return rows
      })
      .catch((e) => setError(e.message))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [preselectStudent])

  // realtime: prepend new conversations / update last message
  useEffect(() => {
    const token = getToken()
    if (!token) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${token}`)
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data)
        if (d.type === 'message') load()
      } catch {}
    }
    wsReady.current = ws
    return () => { if (ws) ws.close() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    setConnecting(true); setMsg('')
    try {
      await api('/api/dashboard/connect-mentor', {
        method: 'POST', body: { code: connectCode },
      })
      setConnectCode('')
      setMsg(t('connectedOk'))
      load()
    } catch (e) {
      setMsg('⚠️ ' + e.message)
    } finally {
      setConnecting(false)
    }
  }

  const sorted = useMemo(() => [...(convs || [])], [convs])

  const noMentorStudent = !isMentor && convs && convs.length === 0

  return (
    <div className="chat-page">
      {/* right pane: conversation list */}
      <aside className="chat-list-pane">
        <div className="chat-list-head">
          <h3>{t('chatPageTitle')}</h3>
          {convs && <span className="small muted">{convs.length}</span>}
        </div>
        <div className="chat-list-scroll">
          {!convs && <div className="empty">…</div>}
          {convs && sorted.length === 0 && !noMentorStudent && (
            <div className="empty">{t('chatNoConversations')}</div>
          )}
          {convs && noMentorStudent && (
            <div className="empty">{t('noMentorYet')}</div>
          )}
          {sorted.map((c) => {
            const active = sel?.student_id === c.student_id
            return (
              <div
                key={c.student_id}
                className={`chat-conv ${active ? 'active' : ''}`}
                onClick={() => { setSel(c); setError('') }}
              >
                <div className="avatar">{c.peer_name.slice(0, 1)}</div>
                <div className="chat-conv-body">
                  <div className="between" style={{ gap: 6 }}>
                    <b className="chat-conv-name">{c.peer_name}</b>
                    {c.last_at && <span className="small muted chat-conv-time">{faDate(c.last_at)}</span>}
                  </div>
                  <div className="small muted chat-conv-preview">
                    {c.last_text
                      ? (c.last_kind === 'voice' ? '🎤 ' + t('voiceMsg') : c.last_text)
                      : c.subtitle || '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* left pane: chat thread */}
      <section className="chat-thread-pane">
        {sel ? (
          <>
            <div className="chat-thread-head">
              <div className="flex">
                <div className="avatar">{sel.peer_name.slice(0, 1)}</div>
                <div>
                  <b>{t('chatWithLabel')}: {sel.peer_name}</b>
                  <div className="small muted">{sel.subtitle || ''}</div>
                </div>
              </div>
              {isMentor && (
                <button className="btn ghost sm" onClick={() => setSel(null)}>←</button>
              )}
            </div>
            <ChatPanel key={sel.student_id} studentId={sel.student_id} mentorId={null} />
          </>
        ) : (
          <div className="chat-thread-empty">
            {noMentorStudent ? (
              <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
                <div style={{ fontSize: 34 }}>🧑‍🏫</div>
                <h3 className="mb">{t('noMentorYet')}</h3>
                <div className="small muted mb">{t('noMentorConnect')}</div>
                <div className="flex" style={{ justifyContent: 'center' }}>
                  <input
                    className="input"
                    style={{ maxWidth: 220 }}
                    placeholder={t('mentorCodePlaceholder')}
                    value={connectCode}
                    onChange={(e) => setConnectCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && connect()}
                  />
                  <button className="btn" disabled={connecting} onClick={connect}>
                    {connecting ? t('connecting') : t('connectAndChat')}
                  </button>
                </div>
                {msg && <div className="small mt">{msg}</div>}
              </div>
            ) : (
              <div className="empty">{t('chatEmptyPick')}</div>
            )}
            {error && <div className="error-box" style={{ margin: 20 }}>{error}</div>}
          </div>
        )}
      </section>
    </div>
  )
}
