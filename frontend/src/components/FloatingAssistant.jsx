import { useEffect, useRef, useState } from 'react'
import { api, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'

export default function FloatingAssistant({ navigate }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [supportOn, setSupportOn] = useState(false)
  const [supportText, setSupportText] = useState('')
  const [sendingSupport, setSendingSupport] = useState(false)
  const bodyRef = useRef(null)
  // load the persisted chat history (backend keeps it, so it survives
  // navigation and page reloads); show the welcome only if empty
  useEffect(() => {
    api('/api/ai/chat/history')
      .then((h) => {
        if (h && h.length) {
          setMessages(h.map((m) => ({ role: m.role === 'ai' ? 'ai' : 'me', content: m.content })))
        } else {
          setMessages([{ role: 'ai', content: t('aiWelcome') }])
        }
      })
      .catch(() => setMessages([{ role: 'ai', content: t('aiWelcome') }]))
  }, [t])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing, open])

  // Only one floating panel may be open at a time: if the mentor chat opens
  // ("float-open" with detail "mentor"), close this AI assistant.
  useEffect(() => {
    const onOtherOpen = (e) => {
      if (e.detail !== 'ai') setOpen(false)
    }
    window.addEventListener('float-open', onOtherOpen)
    return () => window.removeEventListener('float-open', onOtherOpen)
  }, [])

  const toggleOpen = () => {
    const next = !open
    if (next) window.dispatchEvent(new CustomEvent('float-open', { detail: 'ai' }))
    setOpen(next)
  }

  const close = () => { setOpen(false); setSupportOn(false); setSupportText('') }

  const sendSupport = async () => {
    const text = supportText.trim()
    if (!text || sendingSupport) return
    setSendingSupport(true)
    try {
      await api('/api/support/send', { method: 'POST', body: { category: 'support', content: text } })
      setSupportText('')
      setSupportOn(false)
      setMessages((m) => [...m, { role: 'ai', content: '🛠️ ' + t('supportSent') }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', content: '⚠️ ' + e.message }])
    } finally {
      setSendingSupport(false)
    }
  }

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || typing) return
    setInput('')
    setMessages((m) => [...m, { role: 'me', content: msg }])
    setTyping(true)
    try {
      const res = await api('/api/ai/chat', {
        method: 'POST',
        body: { message: msg, lang: getLang() },
      })
      setMessages((m) => [...m, { role: 'ai', content: res.reply }])
      if (res.action === 'open_exam' && res.exam_id) {
        setOpen(false)
        navigate(`#/exam/${res.exam_id}`)
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', content: '⚠️ ' + e.message }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <>
      <button
        className={`fab ${open ? '' : 'pulse'}`}
        onClick={toggleOpen}
        title="AI"
        aria-label="AI"
      >
        <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
          <path d="M16 19c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v9c0 3.3-2.7 6-6 6h-4c-3.3 0-6-2.7-6-6v-9Z" stroke="#fff" strokeWidth="2.6" />
          <circle cx="19.5" cy="21.5" r="1.8" fill="#fff" />
          <circle cx="28.5" cy="21.5" r="1.8" fill="#fff" />
          <path d="M20 28h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 11l-3-3M34 11l3-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="assistant">
          <div className="assistant-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="logo" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center' }}>
                🤖
              </span>
              <div>
                <div className="title">{t('assistantTitle')}</div>
                <div className="sub">{t('assistantSub')}</div>
              </div>
            </div>
            <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={close}>
              ✕
            </button>
          </div>

          <div className="assistant-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role === 'me' ? 'me' : 'ai'}`}>
                {m.content}
              </div>
            ))}
            {typing && (
              <div className="bubble ai">
                <span className="typing"><span /><span /><span /></span>
              </div>
            )}
          </div>

          <div className="chip-row">
            {supportOn ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small muted mb" style={{ fontSize: 12 }}>{t('supportHint')}</div>
                <textarea
                  className="support-ta"
                  rows={2}
                  autoFocus
                  value={supportText}
                  onChange={(e) => setSupportText(e.target.value)}
                  placeholder={t('supportPlaceholder')}
                />
                <div className="flex" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <button className="cmd-chip" onClick={() => { setSupportOn(false); setSupportText('') }} disabled={sendingSupport}>
                    {t('supportCancel')}
                  </button>
                  <button className="cmd-chip send" onClick={sendSupport} disabled={sendingSupport || !supportText.trim()}>
                    {sendingSupport ? '…' : t('supportSend')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {[
                  ['/test', '🎯 ' + t('chipTest')],
                  ['/exam', '📝 ' + t('chipExam')],
                  ['/plan', '📋 ' + t('chipPlan')],
                  ['', '🛠️ ' + t('supportChip')],
                ].map(([code, label]) => (
                  <button
                    key={code || 'support'}
                    className="cmd-chip"
                    disabled={typing}
                    onClick={() => (code ? send(code) : setSupportOn(true))}
                  >
                    {label}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="assistant-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('askPlaceholder')}
            />
            <button className="btn sm" onClick={() => send()} disabled={typing}>
              {t('send')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
