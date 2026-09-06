import { useEffect, useRef, useState } from 'react'
import { api, faDate, getToken, getUser } from '../api.js'
import { useLang } from '../i18n.jsx'

/**
 * Mentor <-> student chat. Rendered INSIDE the floating mentor window, using
 * the exact same look as the AI assistant (same bubbles + input bar), but
 * without the /test /exam /plan command chips.
 */
export default function ChatPanel({ studentId, mentorId }) {
  const { t } = useLang()
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const me = getUser()
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const wsRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    let ws
    const load = async () => {
      try {
        const data = await api(`/api/chat/with/${studentId}`)
        setMsgs(data)
      } catch (e) {
        console.warn(e)
      } finally {
        setLoading(false)
      }
      // websocket
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/ws?token=${getToken()}`)
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.type === 'message') {
            const m = data.msg
            if (m.student_id === Number(studentId)) {
              setMsgs((prev) => {
                if (prev.some((x) => x.id === m.id)) return prev
                return [...prev, m]
              })
            }
          }
        } catch {}
      }
      wsRef.current = ws
    }
    load()
    return () => {
      if (ws) ws.close()
    }
  }, [studentId])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [msgs, loading])

  const sendText = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    // prefer realtime WebSocket (server persists + broadcasts to both sides);
    // fall back to REST if the socket isn't open yet.
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ student_id: Number(studentId), text }))
      return
    }
    try {
      const m = await api(`/api/chat/with/${studentId}/send`, {
        method: 'POST',
        body: { text },
      })
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    } catch (e) {
      alert(e.message)
    }
  }

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        try {
          const fd = new FormData()
          fd.append('file', blob, `voice-${Date.now()}.webm`)
          const m = await api(`/api/chat/with/${studentId}/voice`, { method: 'POST', form: fd })
          setMsgs((prev) => [...prev, m])
        } catch (e) {
          alert('Failed to send audio message: ' + e.message)
        }
      }
      rec.start()
      recRef.current = rec
      setRecording(true)
    } catch (e) {
      alert('Microphone access unavailable: ' + e.message)
    }
  }
  const stopRec = () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    setRecording(false)
  }

  return (
    <div className="chat-fill">
      <div className="assistant-body" ref={bodyRef}>
        {loading && <div className="empty">{t('loadingChat')}</div>}
        {!loading && msgs.length === 0 && <div className="empty">{t('noChat')}</div>}
        {msgs.map((m) => {
          const mine = m.sender_id === me?.id
          return (
            <div key={m.id} className={`bubble ${mine ? 'me' : 'other'}`}>
              {m.kind === 'voice' ? (
                m.audio_path ? (
                  <audio controls src={m.audio_path} />
                ) : (
                  <span>🎤 پیام صوتی</span>
                )
              ) : (
                m.text
              )}
              <div className="bubble-time">{faDate(m.created_at)}</div>
            </div>
          )
        })}
      </div>

      <div className="assistant-input">
        <button
          className={`voice-btn ${recording ? 'rec' : ''}`}
          title={t('voiceTitle')}
          onClick={recording ? stopRec : startRec}
        >
          {recording ? '⏹' : '🎤'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          placeholder={t('messagePlaceholder')}
        />
        <button className="btn sm" onClick={sendText}>
          {t('send')}
        </button>
      </div>
    </div>
  )
}
