import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useLang } from '../i18n.jsx'
import ChatPanel from './ChatPanel.jsx'

/**
 * Floating circular button that opens a floating chat window with the mentor.
 * Visually identical to the AI assistant (same panel, same bubbles, same input
 * bar) — just no /test /exam /plan command chips.
 *
 * Only one floating panel is open at a time: opening this one closes the AI
 * assistant, and vice versa ("float-open" window event).
 */
export default function FloatingMentorChat({
  studentId,
  mode = 'student',
  students: preloaded,
  defaultStudentId,
  studentName,
  raised = false, // true when the page ALSO shows the AI assistant (stack above it)
}) {
  const { t, lang } = useLang()
  const isEn = lang === 'en'
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(preloaded || null)
  const [active, setActive] = useState(defaultStudentId || null)
  const [activeName, setActiveName] = useState(studentName || '')
  const [noMentor, setNoMentor] = useState(false)   // student without a mentor
  const isMentor = mode === 'mentor'

  useEffect(() => {
    if (preloaded) setList(preloaded)
  }, [preloaded])

  // mutual exclusivity with the AI assistant
  useEffect(() => {
    const onOtherOpen = (e) => {
      if (e.detail !== 'mentor') setOpen(false)
    }
    window.addEventListener('float-open', onOtherOpen)
    return () => window.removeEventListener('float-open', onOtherOpen)
  }, [])

  const toggleOpen = () => {
    const next = !open
    if (next) {
      window.dispatchEvent(new CustomEvent('float-open', { detail: 'mentor' }))
      if (isMentor && !list) {
        api('/api/mentor/students')
          .then(setList)
          .catch(() => setList([]))
      } else if (!isMentor) {
        // student: only show chat if a mentor is attached
        api('/api/chat/conversations')
          .then((conv) => setNoMentor(!(conv && conv.length > 0)))
          .catch(() => setNoMentor(true))
      }
    }
    setOpen(next)
  }

  const pickStudent = (s) => {
    setActive(s.id)
    setActiveName(s.full_name)
  }

  const currentStudentId = active || studentId

  return (
    <>
      <button
        className={`fab mentor ${open ? '' : 'pulse'} ${raised ? 'raised' : ''}`}
        onClick={toggleOpen}
        title={isMentor ? (isEn ? 'Student Chats' : 'گفتگو با دانش‌آموزان') : (isEn ? 'Mentor Chat' : 'گفتگو با مشاور')}
        aria-label="Mentor Chat"
      >
        <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
          <path d="M14 12h20c3 0 5 2 5 5v12c0 3-2 5-5 5h-7l-7 6v-6h-6c-3 0-5-2-5-5V17c0-3 2-5 5-5Z" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
          <circle cx="19" cy="23" r="1.8" fill="#fff" />
          <circle cx="24" cy="23" r="1.8" fill="#fff" />
          <circle cx="29" cy="23" r="1.8" fill="#fff" />
        </svg>
      </button>

      {open && (
        <div className={`assistant ${raised ? 'raised' : ''}`}>
          <div className="assistant-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="logo" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center' }}>
                💬
              </span>
              <div>
                <div className="title">
                  {isMentor && active
                    ? `${t('chatWithStudent')}${activeName ? ` — ${activeName}` : ''}`
                    : t('chatWithMentor')}
                </div>
                <div className="sub">{t('mentorChatSub')}</div>
              </div>
            </div>
            <button
              className="btn ghost sm"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={() => setOpen(false)}
              title={isEn ? 'Close' : 'بستن'}
            >
              ✕
            </button>
          </div>

          {!isMentor && noMentor ? (
            <div className="assistant-body" style={{ padding: 18, justifyContent: 'center' }}>
              <div className="empty" style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                {t('noMentorConnect')}
              </div>
              <button
                className="btn"
                style={{ display: 'block', margin: '14px auto 0' }}
                onClick={() => { setOpen(false); window.location.hash = '#/chat' }}
              >
                💬 {t('connectAndChat')}
              </button>
            </div>
          ) : isMentor && !currentStudentId ? (
            <div className="student-pick-list">
              {(!list || list.length === 0) && <div className="empty">{t('noStudents')}</div>}
              {list?.map((s) => (
                <div key={s.id} className="student-pick" onClick={() => pickStudent(s)}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 15 }}>{s.full_name.slice(0, 1)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13.5 }}>{s.full_name}</b>
                    <div className="small muted">{s.field_of_study} — {s.grade_level}</div>
                  </div>
                  <span style={{ marginInlineStart: 'auto', color: 'var(--muted)' }}>💬</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="float-chat-wrap">
              {isMentor && (
                <button
                  className="pick-back"
                  onClick={() => { setActive(null); setActiveName('') }}
                >
                  ← {t('backToStudents')}
                </button>
              )}
              <ChatPanel studentId={currentStudentId} mentorId={null} />
            </div>
          )}
        </div>
      )}
    </>
  )
}
