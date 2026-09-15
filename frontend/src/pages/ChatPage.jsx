import { useEffect, useMemo, useRef, useState } from 'react'
import { api, fa, faDate, getLang, getToken } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

export default function ChatPage({ navigate, preselectStudent = null }) {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const isEn = lang === 'en'
  const isMentor = user?.role === 'mentor'

  const [convs, setConvs] = useState(null)
  const [sel, setSel] = useState(() => ({
    type: 'ai',
    student_id: 'ai',
    peer_name: isMentor
      ? (isEn ? 'AI Mentorship Assistant' : 'دستیار مشاوره‌ای هوش مصنوعی (AI)')
      : (isEn ? 'AI Academic Assistant' : 'دستیار هوشمند تحصیلی (AI)'),
    subtitle: isMentor
      ? (isEn ? 'Consultation strategies, pacing & progress diagnostics' : 'راهبردهای مشاوره‌ای، بودجه‌بندی و تحلیل پیشرفت')
      : (isEn ? 'Diagnostics, planning, tests & smart troubleshooting' : 'تحلیل، برنامه‌ریزی، آزمون و رفع اشکال هوشمند'),
  }))
  const [connectCode, setConnectCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const wsReady = useRef(false)

  // AI Chat dedicated state in Thread view
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const aiBodyRef = useRef(null)

  const loadAiHistory = () => {
    api('/api/ai/chat/history')
      .then((h) => {
        if (h && h.length) {
          setAiMessages(h.map((m) => ({ role: m.role === 'ai' ? 'ai' : 'me', content: m.content })))
        } else {
          setAiMessages([{
            role: 'ai',
            content: isMentor
              ? (isEn
                  ? 'Hello mentor! I am your AI mentorship assistant. You can consult with me about study pacing, student performance improvement, or advisory strategies.'
                  : 'سلام استاد گرامی! من دستیار هوشمند مشاوره‌ای شما هستم. می‌توانید درباره استراتژی‌های بودجه‌بندی، ارتقای عملکرد دانش‌آموزان یا متدهای مشاوره‌ای با من گفتگو کنید.')
              : t('aiWelcome'),
          }])
        }
      })
      .catch(() => setAiMessages([{
        role: 'ai',
        content: isMentor
          ? (isEn
              ? 'Hello mentor! I am your AI mentorship assistant. How can I assist you today?'
              : 'سلام استاد گرامی! من دستیار هوشمند مشاوره‌ای شما هستم. چطور می‌توانم به شما کمک کنم؟')
          : t('aiWelcome'),
      }]))
  }

  useEffect(() => {
    loadAiHistory()
  }, [isMentor, isEn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (aiBodyRef.current) aiBodyRef.current.scrollTop = aiBodyRef.current.scrollHeight
  }, [aiMessages, aiTyping, sel])

  const sendAiMessage = async (text) => {
    const messageText = (text || aiInput).trim()
    if (!messageText || aiTyping) return
    setAiInput('')
    setAiMessages((prev) => [...prev, { role: 'me', content: messageText }])
    setAiTyping(true)
    try {
      const res = await api('/api/ai/chat', {
        method: 'POST',
        body: { message: messageText, lang: getLang() },
      })
      setAiMessages((prev) => [...prev, { role: 'ai', content: res.reply }])
      if (!isMentor && res.action === 'open_exam' && res.exam_id) {
        navigate(`#/exam/${res.exam_id}`)
      }
    } catch (e) {
      setAiMessages((prev) => [...prev, { role: 'ai', content: '⚠️ ' + e.message }])
    } finally {
      setAiTyping(false)
    }
  }

  const load = () => {
    api('/api/chat/conversations')
      .then((rows) => {
        setConvs(rows)
        if (preselectStudent) {
          const hit = rows.find((r) => r.student_id === preselectStudent)
          if (hit) setSel(hit)
        }
        return rows
      })
      .catch((e) => setError(e.message))
  }

  useEffect(load, [preselectStudent]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    setConnecting(true)
    setMsg('')
    try {
      await api('/api/dashboard/connect-mentor', {
        method: 'POST', body: { code: connectCode },
      })
      setConnectCode('')
      show ? show(t('connectedOk')) : setMsg(t('connectedOk'))
      load()
    } catch (e) {
      setMsg('⚠️ ' + e.message)
    } finally {
      setConnecting(false)
    }
  }

  const sorted = useMemo(() => [...(convs || [])], [convs])
  const noMentorStudent = !isMentor && convs && convs.length === 0

  const mentorChips = [
    ['/students_overview', isEn ? '📊 Students Overview' : '📊 تحلیل وضعیت کلی دانش‌آموزان'],
    ['/plan_strategy', isEn ? '💡 Weekly Pacing Strategy' : '💡 راهبرد و بودجه‌بندی برنامه هفتگی'],
    ['/motivation', isEn ? '🎯 Motivation Techniques' : '🎯 متدهای افزایش انگیزه و تمرکز'],
    ['/weakness_guide', isEn ? '🔍 Score Recovery Guide' : '🔍 تکنیک‌های جبران افت تراز'],
  ]

  const studentChips = [
    ['/test', isEn ? '🎯 Quick MCQ Test' : '🎯 ساخت آزمون تستی سریع'],
    ['/exam', isEn ? '📝 Comprehensive Exam' : '📝 ایجاد امتحان کامل جامع'],
    ['/plan', isEn ? '📋 Study Plan Status' : '📋 وضعیت برنامه درسی'],
    ['/report', isEn ? '📊 Report Card Analysis' : '📊 تحلیل کارنامه و تراز'],
  ]

  const activeChips = isMentor ? mentorChips : studentChips

  return (
    <div className="chat-page">
      {/* right pane: conversation list */}
      <aside className="chat-list-pane" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', border: '1.5px solid var(--line)' }}>
        <div className="chat-list-head" style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💬</span>
            <span>{t('chatPageTitle')}</span>
          </h3>
          {convs && (
            <span className="badge" style={{ fontSize: 11 }}>
              {fa(convs.length + 1)} {isEn ? 'Chats' : 'گفتگو'}
            </span>
          )}
        </div>

        <div className="chat-list-scroll" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* PINNED AI ASSISTANT CONVERSATION AT TOP */}
          <div
            className={`chat-conv ${sel?.type === 'ai' ? 'active' : ''}`}
            style={{
              background: sel?.type === 'ai' ? 'var(--tint-fill)' : 'transparent',
              border: '1.5px solid',
              borderColor: sel?.type === 'ai' ? 'var(--primary)' : 'var(--line)',
              borderRadius: 16,
              padding: '12px 14px',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
            }}
            onClick={() => {
              setSel({
                type: 'ai',
                student_id: 'ai',
                peer_name: isMentor
                  ? (isEn ? 'AI Mentorship Assistant' : 'دستیار مشاوره‌ای هوش مصنوعی (AI)')
                  : (isEn ? 'AI Academic Assistant' : 'دستیار هوشمند تحصیلی (AI)'),
                subtitle: isMentor
                  ? (isEn ? 'Consultation strategies, pacing & progress diagnostics' : 'راهبردهای مشاوره‌ای، بودجه‌بندی و تحلیل پیشرفت')
                  : (isEn ? 'Diagnostics, planning, tests & smart troubleshooting' : 'تحلیل، برنامه‌ریزی، آزمون و رفع اشکال هوشمند'),
              })
              setError('')
            }}
          >
            <div className="avatar" style={{ background: 'var(--grad)', fontSize: 20 }}>🤖</div>
            <div className="chat-conv-body">
              <div className="between" style={{ gap: 6, marginBottom: 2 }}>
                <b className="chat-conv-name" style={{ color: 'var(--primary)' }}>
                  {isMentor ? (isEn ? 'AI Mentor Assistant' : 'دستیار مشاور (AI)') : (isEn ? 'AI Smart Assistant' : 'دستیار هوشمند (AI)')}
                </b>
                <span className="badge" style={{ fontSize: 10, background: 'var(--grad)', color: '#fff', padding: '1px 6px' }}>
                  {isEn ? '📌 PINNED' : '📌 پین شده'}
                </span>
              </div>
              <div className="small muted chat-conv-preview" style={{ fontSize: 11.5 }}>
                {isMentor
                  ? (isEn ? 'Pacing strategies, motivation and diagnostics...' : 'راهبردهای مشاوره‌ای و بودجه‌بندی...')
                  : (isEn ? 'Ready for queries, exam generator and review...' : 'آماده پاسخ به سوالات، ایجاد آزمون و تحلیل...')}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', margin: '8px 6px 4px 6px' }}>
            {isMentor ? (isEn ? 'YOUR STUDENTS' : 'دانش‌آموزان شما') : (isEn ? 'MENTOR CHAT' : 'گفتگو با مشاور')}
          </div>

          {!convs && <div className="empty">{isEn ? 'Loading conversations...' : 'در حال بارگذاری گفتگوها...'}</div>}
          {convs && sorted.length === 0 && !noMentorStudent && (
            <div className="empty small muted">{t('chatNoConversations')}</div>
          )}
          {convs && noMentorStudent && (
            <div className="empty small muted">{isEn ? 'Not connected to a mentor yet' : 'هنوز به مشاور متصل نشده‌اید'}</div>
          )}

          {sorted.map((c) => {
            const active = sel?.type !== 'ai' && sel?.student_id === c.student_id
            return (
              <div
                key={c.student_id}
                className={`chat-conv ${active ? 'active' : ''}`}
                style={{ borderRadius: 14 }}
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
      <section className="chat-thread-pane" style={{ borderRadius: 20, boxShadow: 'var(--shadow)', border: '1.5px solid var(--line)' }}>
        {sel?.type === 'ai' ? (
          /* Dedicated AI Chat Thread View */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <div className="chat-thread-head" style={{ padding: '14px 18px', background: 'var(--card)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div className="flex" style={{ gap: 12 }}>
                <div className="avatar" style={{ background: 'var(--grad)', fontSize: 20 }}>🤖</div>
                <div>
                  <b style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>
                      {isMentor
                        ? (isEn ? 'Specialized AI Mentorship Assistant' : 'دستیار تخصصی مشاوره‌ای هوش مصنوعی')
                        : (isEn ? 'AI Smart Academic Assistant' : 'دستیار هوشمند تحصیلی هوش مصنوعی')}
                    </span>
                    <span className="badge" style={{ fontSize: 10, background: 'var(--tint-fill)', color: 'var(--primary)' }}>GPT-4o</span>
                  </b>
                  <div className="small muted">
                    {isMentor
                      ? (isEn ? 'Budgeting guide, student trends, and personalized advisory methods' : 'راهنمای بودجه‌بندی، تحلیل روند دانش‌آموزان و ارائه راهکارهای مشاوره‌ای')
                      : (isEn ? '24/7 background diagnostics, exam maker, and smart tutoring' : 'تحلیل سوابق، ساخت آزمون، مشاوره درسی و رفع اشکال ۲۴ ساعته')}
                  </div>
                </div>
              </div>
            </div>

            <div className="assistant-body" ref={aiBodyRef} style={{ flex: '1 1 0', minHeight: 0, padding: 20, overflowY: 'auto' }}>
              {aiMessages.map((m, i) => (
                <div
                  key={i}
                  className={`bubble ${m.role === 'me' ? 'me' : 'ai'}`}
                  style={{
                    borderRadius: 18,
                    padding: '12px 18px',
                    fontSize: 14.5,
                    lineHeight: 1.8,
                  }}
                >
                  {m.content}
                </div>
              ))}
              {aiTyping && (
                <div className="bubble ai" style={{ borderRadius: 18, padding: '12px 18px' }}>
                  <span className="typing"><span /><span /><span /></span>
                </div>
              )}
            </div>

            {/* AI Command Chips */}
            <div className="chip-row" style={{ padding: '10px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--card)', flexShrink: 0 }}>
              {activeChips.map(([code, label]) => (
                <button
                  key={code}
                  className="cmd-chip"
                  disabled={aiTyping}
                  style={{ borderRadius: 10, padding: '6px 14px', fontSize: 12.5 }}
                  onClick={() => sendAiMessage(code)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* AI Input Box */}
            <div className="assistant-input" style={{ padding: '14px 18px', background: 'var(--card)', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
              <input
                className="input"
                style={{ borderRadius: 14, padding: '12px 16px' }}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                placeholder={
                  isMentor
                    ? (isEn ? 'Ask AI assistant (e.g. methods to improve calculation focus)...' : 'از هوش مصنوعی بپرسید (مثلا: راهکار افزایش تمرکز در دروس محاسباتی)...')
                    : (isEn ? 'Ask AI assistant (e.g. how to score 100% in biology?)...' : 'از هوش مصنوعی بپرسید (مثلا: چطور زیست را ۱۰۰ بزنم؟)...')
                }
              />
              <button
                className="btn"
                style={{ borderRadius: 14, padding: '10px 24px' }}
                onClick={() => sendAiMessage()}
                disabled={aiTyping || !aiInput.trim()}
              >
                {aiTyping ? (isEn ? 'Sending...' : 'در حال ارسال...') : (isEn ? 'Send' : 'ارسال')}
              </button>
            </div>
          </div>
        ) : sel ? (
          /* Standard Mentor / Peer Chat Panel */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <div className="chat-thread-head" style={{ flexShrink: 0 }}>
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
          </div>
        ) : (
          <div className="chat-thread-empty">
            {noMentorStudent ? (
              <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', borderRadius: 20, padding: 30 }}>
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
