import { useEffect, useMemo, useRef, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Empty, Modal } from '../ui.jsx'

const DAY_LABELS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const DAY_LABELS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const MINUTES_OPT = [] // 06:00 … 22:30 in 15-min steps
for (let m = 6 * 60; m <= 22 * 60 + 30; m += 15) MINUTES_OPT.push(m)

const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fmt = (m) => fa(toHM(m))

const DURATION_PRESETS = [30, 45, 60, 90, 120]
const EVALUATIONS = [
  { id: 'عالی', label: '🟢 عالی (پیشرفت بالا)', color: '#16a34a' },
  { id: 'خوب', label: '🔵 خوب (پایدار)', color: '#2563eb' },
  { id: 'متوسط', label: '🟡 متوسط (نیاز به پیگیری)', color: '#d97706' },
  { id: 'نیازمند انگیزه', label: '🟠 نیازمند انگیزه و تقویت روحیه', color: '#ea580c' },
  { id: 'بحرانی', label: '🔴 بحرانی (افت شدید/عدم پایبندی)', color: '#dc2626' },
]

export default function MentorSchedule({ navigate }) {
  const { t } = useLang()
  const isEn = getLang() === 'en'
  const today = new Date()
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 })
  const [cal, setCal] = useState(null)
  const [selDate, setSelDate] = useState(null)
  const [error, setError] = useState('')
  const [slotDuration, setSlotDuration] = useState(45)
  const [startM, setStartM] = useState(11 * 60)
  const [endM, setEndM] = useState(12 * 60 + 30)
  const [saving, setSaving] = useState(false)
  const { show, view } = useToast()

  // Consultation Session Modal State
  const [activeSlot, setActiveSlot] = useState(null)
  const [consultModalOpen, setConsultModalOpen] = useState(false)
  const [consultType, setConsultType] = useState('تلفنی')
  const [sessionDuration, setSessionDuration] = useState(40)
  const [sessionDateStr, setSessionDateStr] = useState('')
  const [notes, setNotes] = useState('')
  const [studentEval, setStudentEval] = useState('خوب')
  const [discussionTopics, setDiscussionTopics] = useState('')
  const [advisorDirectives, setAdvisorDirectives] = useState('')
  const [nextSessionDate, setNextSessionDate] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiDiagNotes, setAiDiagNotes] = useState('')

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerIntervalRef = useRef(null)

  // Past Sessions List
  const [pastSessions, setPastSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const load = (y = ym.y, m = ym.m) => {
    api(`/api/mentor/consult/calendar?year=${y}&month=${m}`)
      .then(setCal)
      .catch((e) => setError(e.message))
  }

  const loadPastSessions = () => {
    setLoadingSessions(true)
    api('/api/mentor/consult/sessions')
      .then((res) => {
        if (res.ok && res.sessions) setPastSessions(res.sessions)
      })
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }

  useEffect(() => {
    load()
    loadPastSessions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mShift = (delta) => {
    let { y, m } = ym
    m += delta
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setYm({ y, m })
    setSelDate(null)
    load(y, m)
  }

  const cells = useMemo(() => {
    const y = ym.y, m = ym.m
    const firstDow = new Date(y, m - 1, 1).getDay()
    const iranFirst = (firstDow + 2) % 7
    const startDate = new Date(y, m - 1, 1 - iranFirst)
    const out = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      out.push({
        y: d.getFullYear(),
        m: d.getMonth() + 1,
        d: d.getDate(),
        inMonth: d.getMonth() + 1 === m,
        ds: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      })
    }
    return out
  }, [ym])

  const slotsFor = (ds) => (cal?.days?.[ds] || []).sort((a, b) => a.start_min - b.start_min)
  const todayStr = iso(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const lengthMin = endM - startM
  const numSlots = Math.floor(lengthMin / slotDuration)
  const lengthOk = lengthMin >= slotDuration && slotDuration >= 15

  const addWindow = async () => {
    if (!lengthOk || !selDate) {
      show(isEn ? 'Session duration must fit inside the window' : 'مدت بازه زمانی باید حداقل به اندازه یک جلسه باشد', 'err')
      return
    }
    setSaving(true)
    try {
      await api('/api/mentor/consult/window', {
        method: 'POST',
        body: {
          date_str: selDate,
          start: toHM(startM),
          end: toHM(endM),
          duration_min: parseInt(slotDuration) || 45,
        },
      })
      show(t('windowAddedToast'))
      load()
    } catch (e) {
      show(String(e.message || t('windowConflict')), 'err')
    } finally {
      setSaving(false)
    }
  }

  const completeHeld = async (slot) => {
    if (!window.confirm(t('holdConfirm'))) return
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${slot.id}/complete`, { method: 'POST' })
      show(t('heldToast'))
      load()
    } catch (e) {
      show(String(e.message || ''), 'err')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (id) => {
    setSaving(true)
    try {
      await api(`/api/mentor/consult/slot/${id}`, { method: 'DELETE' })
      show(t('slotRemovedToast'))
      load()
    } catch (e) {
      show(String(e.message || ''), 'err')
    } finally {
      setSaving(false)
    }
  }

  // ── Open Consultation Diagnostic Modal ─────────────────────────────────
  const openConsultationModal = (slot) => {
    setActiveSlot(slot)
    setSessionDateStr(slot.date_str || todayStr)
    setSessionDuration(slot.duration_min || 45)
    setConsultType('تلفنی')
    setStudentEval('خوب')
    setNotes('')
    setDiscussionTopics('')
    setAdvisorDirectives('')
    setNextSessionDate('')
    setAiDiagNotes('')
    setRecordedAudioUrl(null)
    setAudioBlob(null)
    setIsRecording(false)
    setRecordingSeconds(0)
    setConsultModalOpen(true)
  }

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setRecordedAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      show('عدم دسترسی به میکروفون مرورگر', 'err')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerIntervalRef.current)
    }
  }

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioBlob(file)
    setRecordedAudioUrl(URL.createObjectURL(file))
  }

  // AI Diagnostic Auto Suggestion
  const handleAiSuggest = async () => {
    if (!activeSlot?.student_id) return
    setAiAnalyzing(true)
    try {
      const res = await api('/api/mentor/consult/sessions/ai-suggest', {
        method: 'POST',
        body: {
          student_id: activeSlot.student_id,
          notes: notes,
          audio_transcript: notes || `بررسی وضعیت هفتگی دانش‌آموز ${activeSlot.student_name}`,
        },
      })
      if (res.ok && res.suggestion) {
        const s = res.suggestion
        if (s.student_evaluation) setStudentEval(s.student_evaluation)
        if (s.consultation_type) setConsultType(s.consultation_type)
        if (s.duration_minutes) setSessionDuration(s.duration_minutes)
        if (s.discussion_topics) setDiscussionTopics(s.discussion_topics)
        if (s.advisor_recommendations) setAdvisorDirectives(s.advisor_recommendations)
        if (s.next_session_date) setNextSessionDate(s.next_session_date)
        if (s.ai_diagnostic_notes) setAiDiagNotes(s.ai_diagnostic_notes)
        show('تحلیل هوشمند جلسه با موفقیت انجام و تکمیل شد! ✨')
      }
    } catch (err) {
      show('خطا در تحلیل هوش مصنوعی: ' + err.message, 'err')
    } finally {
      setAiAnalyzing(false)
    }
  }

  // Save Consultation Session Log
  const handleSaveConsultation = async () => {
    if (!activeSlot) return
    setSaving(true)
    try {
      await api('/api/mentor/consult/sessions', {
        method: 'POST',
        body: {
          student_id: activeSlot.student_id,
          slot_id: activeSlot.id,
          session_date: sessionDateStr || todayStr,
          duration_minutes: parseInt(sessionDuration) || 45,
          consultation_type: consultType,
          student_evaluation: studentEval,
          discussion_topics: discussionTopics || notes || 'بررسی وضعیت تحصیلی و انگیزشی',
          advisor_recommendations: advisorDirectives || 'تداوم اجرای برنامه هفتگی و حل تست‌های علامت‌دار',
          next_session_date: nextSessionDate || '',
          ai_diagnostic_notes: aiDiagNotes || '',
        },
      })
      show('پرونده جلسه مشاوره با موفقیت ثبت شد و نوبت پایان یافت! ✅')
      setConsultModalOpen(false)
      load()
      loadPastSessions()
    } catch (err) {
      show('خطا در ثبت جلسه مشاوره: ' + err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const monthName = isEn
    ? new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
    : fa(new Date(ym.y, ym.m - 1, 1).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }))

  const dayLabels = isEn ? DAY_LABELS_EN : DAY_LABELS_FA

  const faDateOnly = (ds) => {
    try {
      return isEn
        ? new Date(ds + 'T00:00:00').toLocaleDateString('en-GB')
        : fa(new Date(ds + 'T00:00:00').toLocaleDateString('fa-IR'))
    } catch { return ds }
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div>
      <div className="hero">
        <h2>🗓️ {t('scheduleTitle')}</h2>
        <p>{t('scheduleSub')}</p>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1.2fr)', gap: 18 }}>
        {/* Calendar Card */}
        <Card>
          <div className="between mb">
            <button className="btn ghost sm" onClick={() => mShift(-1)}>
              {isEn ? `← ${t('prevWeek')}` : `→ ${t('prevWeek')}`}
            </button>
            <b>{monthName}</b>
            <button className="btn ghost sm" onClick={() => mShift(1)}>
              {isEn ? `${t('nextWeek')} →` : `${t('nextWeek')} ←`}
            </button>
          </div>
          <div className="cal-grid">
            {dayLabels.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((c, i) => {
              const slots = slotsFor(c.ds)
              const free = slots.filter((s) => !s.student_id).length
              const booked = slots.length - free
              const past = c.ds < todayStr
              return (
                <div
                  key={i}
                  className={`cal-cell ${c.inMonth ? '' : 'dim'} ${c.ds === todayStr ? 'today' : ''} ${selDate === c.ds ? 'sel' : ''} ${past ? 'past' : ''}`}
                  onClick={() => { if (!past) setSelDate(c.ds) }}
                >
                  <div className="cal-daynum">{fa(c.d)}</div>
                  {slots.length > 0 && (
                    <div className="cal-meta">
                      {free > 0 && <span className="tag tag-free">🟢 {fa(free)}</span>}
                      {booked > 0 && <span className="tag tag-booked">🔴 {fa(booked)}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Selected Day: Windows + Slot List */}
        <div>
          <Card>
            <h3 className="mb">{selDate ? (t('windowsOn') + ' ' + faDateOnly(selDate)) : t('selectDayHint')}</h3>
            {!selDate && <Empty>{t('selectDayHint')}</Empty>}

            {selDate && (
              <>
                <div className="small muted mb" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  ⚙️ {t('windowLength')} & {t('sessionTime')}:
                </div>

                {/* Duration selector */}
                <div style={{ marginBottom: 14 }}>
                  <label className="field" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 800 }}>⏱️ {t('windowLength')} ({t('durationMin')}):</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {DURATION_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`btn sm ${slotDuration === p ? '' : 'ghost'}`}
                          style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            setSlotDuration(p)
                            if (endM <= startM || (endM - startM) < p) {
                              setEndM(startM + p)
                            }
                          }}
                        >
                          {fa(p)} {t('durationMin')}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span className="small muted">{isEn ? 'Or manual min:' : 'یا وارد کردن دستی:'}</span>
                      <input
                        type="number"
                        min="15"
                        max="240"
                        step="5"
                        className="input"
                        style={{ width: 90, padding: '6px 10px', fontSize: 13, borderRadius: 8 }}
                        value={slotDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 15
                          setSlotDuration(val)
                          if (endM <= startM || (endM - startM) < val) {
                            setEndM(startM + val)
                          }
                        }}
                      />
                      <span className="small muted">{t('durationMin')}</span>
                    </div>
                  </label>
                </div>

                {/* Start & End Time Selectors */}
                <div className="two-col mb" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="field">
                    <span>{t('startTime')}</span>
                    <select
                      className="input"
                      value={startM}
                      onChange={(e) => {
                        const s = Number(e.target.value)
                        setStartM(s)
                        if (endM <= s) setEndM(s + slotDuration)
                      }}
                    >
                      {MINUTES_OPT.slice(0, -1).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t('endTime')}</span>
                    <select
                      className="input"
                      value={endM}
                      onChange={(e) => setEndM(Number(e.target.value))}
                    >
                      {MINUTES_OPT.filter((m) => m > startM).map((m) => <option key={m} value={m}>{fmt(m)}</option>)}
                    </select>
                  </label>
                </div>

                <div className="small mb" style={{ color: lengthOk ? '#16a34a' : '#dc2626', fontWeight: 700, lineHeight: 1.6 }}>
                  {isEn
                    ? `Total: ${fa(lengthMin)} min · Generate ${fa(numSlots)} slots (${fa(slotDuration)} min each)`
                    : `کل بازه: ${lengthMin > 0 ? `${fa(lengthMin)} دقیقه` : '—'} · ایجاد ${fa(numSlots)} اسلات ${fa(slotDuration)} دقیقه‌ای`
                  }
                </div>

                <button className="btn block" disabled={saving || !lengthOk} onClick={addWindow}>
                  + {t('addWindow')}
                </button>
              </>
            )}
          </Card>

          {selDate && (
            <Card className="mt">
              <h4 className="mb">{t('slotFree')} / {t('slotBooked')}</h4>
              {slotsFor(selDate).length === 0 && <Empty>{t('noSlotsDay')}</Empty>}
              {slotsFor(selDate).map((s) => (
                <div key={s.id} className="list-item between" style={{ flexWrap: 'wrap', gap: 8, padding: '10px 0' }}>
                  <div className="flex" style={{ gap: 8, alignItems: 'center' }}>
                    <span className={`slot-chip ${s.student_id ? 'taken' : 'free'}`}>
                      {fmt(s.start_min)} ({fa(s.duration_min || 45)}′)
                    </span>
                    {s.student_id ? (
                      <div>
                        <b style={{ fontSize: 13, color: 'var(--ink)' }}>🧑‍🎓 {s.student_name}</b>
                        {s.student_email && <div className="small muted" style={{ fontSize: 11 }}>{s.student_email}</div>}
                      </div>
                    ) : (
                      <span className="small muted">{t('slotFree')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {s.student_id ? (
                      <>
                        <button
                          className="btn sm"
                          style={{ background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 12, padding: '5px 12px' }}
                          onClick={() => openConsultationModal(s)}
                        >
                          🎙️ شروع جلسه مشاوره
                        </button>
                        <button className="btn ghost sm slot-done" disabled={saving} onClick={() => completeHeld(s)}>
                          ✅ {t('markHeld')}
                        </button>
                      </>
                    ) : (
                      <button className="btn ghost sm danger" disabled={saving} onClick={() => removeSlot(s.id)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* ── Consultation Session Logs & Timeline Card ────────────────────── */}
      <Card className="mt" style={{ marginTop: 24 }}>
        <div className="between mb">
          <h3 style={{ margin: 0 }}>📋 تاریخچه و پرونده جلسات مشاوره برگزار شده</h3>
          <span className="chip">{fa(pastSessions.length)} جلسه ثبت‌شده</span>
        </div>

        {loadingSessions && <div className="small muted">در حال دریافت جلسات...</div>}
        {!loadingSessions && pastSessions.length === 0 && (
          <Empty>هنوز هیچ جلسه مشاوره‌ای ثبت نشده است. پس از برگزاری هر جلسه، جزئیات و توصیه‌ها در اینجا ذخیره می‌شوند.</Empty>
        )}

        {pastSessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pastSessions.map((ps) => (
              <div
                key={ps.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: 16,
                  background: 'var(--card-subtle, #fafafa)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 14, color: 'var(--ink)' }}>🧑‍🎓 {ps.student_name}</b>
                    <span className="tag" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11 }}>
                      {ps.grade_level} · {ps.field_of_study}
                    </span>
                    <span className="tag" style={{ background: '#f1f5f9', color: '#475569', fontSize: 11 }}>
                      📞 نوع: {ps.consultation_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="small muted">🗓️ {fa(ps.session_date)} ({fa(ps.duration_minutes)} دقیقه)</span>
                    <span
                      className="tag"
                      style={{
                        background: ps.student_evaluation === 'عالی' ? '#dcfce7' : ps.student_evaluation === 'بحرانی' ? '#fee2e2' : '#fef3c7',
                        color: ps.student_evaluation === 'عالی' ? '#15803d' : ps.student_evaluation === 'بحرانی' ? '#b91c1c' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      وضعیت: {ps.student_evaluation}
                    </span>
                  </div>
                </div>

                {ps.discussion_topics && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, background: '#fff', padding: 10, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <b style={{ color: '#334155' }}>💬 مباحث مطرح‌شده: </b>
                    <span style={{ color: '#475569' }}>{ps.discussion_topics}</span>
                  </div>
                )}

                {ps.advisor_recommendations && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, background: '#eef2ff', padding: 10, borderRadius: 10, border: '1px solid #c7d2fe' }}>
                    <b style={{ color: '#3730a3' }}>🎯 توصیه‌ها و برنامه‌های مشاور: </b>
                    <span style={{ color: '#1e1b4b' }}>{ps.advisor_recommendations}</span>
                  </div>
                )}

                {ps.next_session_date && (
                  <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <span>⏳ تاریخ جلسه بعدی:</span>
                    <span style={{ color: 'var(--primary)' }}>{fa(ps.next_session_date)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Consultation Floating Modal (Template Provided by User) ───────── */}
      {consultModalOpen && activeSlot && (
        <Modal
          title={`🎙️ جلسه مشاوره تخصصی با ${activeSlot.student_name || 'دانش‌آموز'}`}
          wide
          onClose={() => setConsultModalOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Info Bar */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <b style={{ fontSize: 14, color: '#1e293b' }}>دانش‌آموز: {activeSlot.student_name}</b>
                <div className="small muted">نوبت ثبت‌شده: {activeSlot.date_str} ساعت {fmt(activeSlot.start_min)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="small muted">شیوه برگزاری:</span>
                {['تلفنی', 'حضوری', 'آنلاین'].map((tVal) => (
                  <button
                    key={tVal}
                    type="button"
                    className={`btn sm ${consultType === tVal ? '' : 'ghost'}`}
                    style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setConsultType(tVal)}
                  >
                    {tVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Recording & Upload Module */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: 16, padding: 16 }}>
              <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <b style={{ fontSize: 14, color: '#0369a1' }}>🎙️ ضبط و پیوست صوت جلسه مشاوره</b>
                  <div className="small muted" style={{ color: '#0284c7' }}>
                    می‌توانید گفت‌وگو را به صورت زنده ضبط کنید یا فایل صوتی جلسه را آپلود نمایید.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!isRecording ? (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ background: '#ef4444', color: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={startRecording}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }}></span>
                      شروع ضبط زنده
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ background: '#dc2626', color: '#fff', borderRadius: 10, animation: 'pulse 1.2s infinite' }}
                      onClick={stopRecording}
                    >
                      ⏹️ توقف ضبط ({formatTimer(recordingSeconds)})
                    </button>
                  )}

                  <label className="btn ghost sm" style={{ borderRadius: 10, cursor: 'pointer', margin: 0, background: '#fff' }}>
                    📤 آپلود صوت
                    <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFileUpload} />
                  </label>
                </div>
              </div>

              {recordedAudioUrl && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <audio src={recordedAudioUrl} controls style={{ width: '100%', height: 38, borderRadius: 8 }} />
                </div>
              )}
            </div>

            {/* Mentor Notes & AI Suggestion Button */}
            <div>
              <div className="between mb" style={{ alignItems: 'center' }}>
                <label style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                  ✍️ یادداشت‌ها و سرفصل‌های مطرح‌شده توسط مشاور:
                </label>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '6px 14px',
                  }}
                  disabled={aiAnalyzing}
                  onClick={handleAiSuggest}
                >
                  {aiAnalyzing ? '✨ در حال تحلیل...' : '✨ تحلیل هوشمند جلسه (AI Assistant)'}
                </button>
              </div>
              <textarea
                className="input"
                rows={3}
                style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                placeholder="نکات کلیدی صحبت با دانش‌آموز، چالش‌های درسی، ساعت مطالعه، وضعیت روحی و ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* AI Diagnostics Fields */}
            <div className="two-col" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
              <label className="field">
                <span style={{ fontWeight: 800 }}>ارزیابی و وضعیت دانش‌آموز در این جلسه:</span>
                <select
                  className="input"
                  value={studentEval}
                  onChange={(e) => setStudentEval(e.target.value)}
                  style={{ borderRadius: 10 }}
                >
                  {EVALUATIONS.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.label}</option>
                  ))}
                </select>
              </label>

              <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label className="field">
                  <span>مدت جلسه (دقیقه):</span>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    className="input"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    style={{ borderRadius: 10 }}
                  />
                </label>
                <label className="field">
                  <span>تاریخ جلسه بعدی:</span>
                  <input
                    type="text"
                    placeholder="مثلا ۱۴۰۵/۰۶/۳۱"
                    className="input"
                    value={nextSessionDate}
                    onChange={(e) => setNextSessionDate(e.target.value)}
                    style={{ borderRadius: 10 }}
                  />
                </label>
              </div>
            </div>

            {/* Discussion Topics & Directives */}
            <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span style={{ fontWeight: 800 }}>💬 مباحث و چالش‌های بررسی‌شده:</span>
                <textarea
                  className="input"
                  rows={4}
                  style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                  placeholder="سرفصل‌های تحلیل‌شده، افت تراز، زمان‌بندی تست‌ها..."
                  value={discussionTopics}
                  onChange={(e) => setDiscussionTopics(e.target.value)}
                />
              </label>
              <label className="field">
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>🎯 توصیه‌ها و تکالیف مشاور برای دانش‌آموز:</span>
                <textarea
                  className="input"
                  rows={4}
                  style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                  placeholder="۱. افزایش ساعت مطالعه به ۷ ساعت&#10;۲. اجرای تکنیک ضربدر منها..."
                  value={advisorDirectives}
                  onChange={(e) => setAdvisorDirectives(e.target.value)}
                />
              </label>
            </div>

            {aiDiagNotes && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 12, fontSize: 12, color: '#5b21b6' }}>
                <b>💡 بینش تشخیصی هوش مصنوعی: </b> {aiDiagNotes}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex between" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ borderRadius: 12 }}
                onClick={() => setConsultModalOpen(false)}
              >
                انصراف
              </button>
              <button
                type="button"
                className="btn"
                style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 800 }}
                disabled={saving}
                onClick={handleSaveConsultation}
              >
                {saving ? 'در حال ذخیره‌سازی...' : '💾 ثبت نهایی پرونده جلسه و اتمام نوبت'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {view}
    </div>
  )
}

