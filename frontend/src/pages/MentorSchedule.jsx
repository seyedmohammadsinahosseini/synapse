import { useEffect, useMemo, useRef, useState } from 'react'
import { api, fa } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { useLang, tDay } from '../i18n.jsx'
import { Card, Empty, Modal } from '../ui.jsx'

const DAY_LABELS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const DAY_LABELS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const MINUTES_OPT = [] // 06:00 … 22:30 in 15-min steps
for (let m = 6 * 60; m <= 22 * 60 + 30; m += 15) MINUTES_OPT.push(m)

const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fmt = (m) => fa(toHM(m))

const DURATION_PRESETS = [30, 45, 60, 90, 120]
const EVALUATIONS = [
  { id: 'عالی', label_fa: '🟢 عالی (پیشرفت بالا)', label_en: '🟢 Excellent (High Growth)', color: '#16a34a' },
  { id: 'خوب', label_fa: '🔵 خوب (پایدار)', label_en: '🔵 Good (Stable)', color: '#2563eb' },
  { id: 'متوسط', label_fa: '🟡 متوسط (نیاز به پیگیری)', label_en: '🟡 Moderate (Needs Follow-up)', color: '#d97706' },
  { id: 'نیازمند انگیزه', label_fa: '🟠 نیازمند انگیزه و تقویت روحیه', label_en: '🟠 Needs Motivation & Boost', color: '#ea580c' },
  { id: 'بحرانی', label_fa: '🔴 بحرانی (افت شدید/عدم پایبندی)', label_en: '🔴 Critical (Steep Drop)', color: '#dc2626' },
]

export default function MentorSchedule({ navigate }) {
  const { t, lang } = useLang()
  const isEn = lang === 'en'
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
      show(isEn ? 'Microphone access denied' : 'عدم دسترسی به میکروفون مرورگر', 'err')
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
          audio_transcript: notes || `Student consultation review for ${activeSlot.student_name}`,
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
        show(isEn ? 'AI consultation analysis generated successfully! ✨' : 'تحلیل هوشمند جلسه با موفقیت انجام و تکمیل شد! ✨')
      }
    } catch (err) {
      show((isEn ? 'AI Analysis Error: ' : 'خطا در تحلیل هوش مصنوعی: ') + err.message, 'err')
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
          discussion_topics: discussionTopics || notes || (isEn ? 'Academic review & motivation analysis' : 'بررسی وضعیت تحصیلی و انگیزشی'),
          advisor_recommendations: advisorDirectives || (isEn ? 'Continue weekly plan and flagged question practice' : 'تداوم اجرای برنامه هفتگی و حل تست‌های علامت‌دار'),
          next_session_date: nextSessionDate || '',
          ai_diagnostic_notes: aiDiagNotes || '',
        },
      })
      show(isEn ? 'Consultation record saved and slot completed! ✅' : 'پرونده جلسه مشاوره با موفقیت ثبت شد و نوبت پایان یافت! ✅')
      setConsultModalOpen(false)
      load()
      loadPastSessions()
    } catch (err) {
      show((isEn ? 'Save error: ' : 'خطا در ثبت جلسه مشاوره: ') + err.message, 'err')
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

  const evalLabel = (ev) => {
    if (!isEn) return ev
    const map = {
      'عالی': 'Excellent',
      'خوب': 'Good',
      'متوسط': 'Moderate',
      'نیازمند انگیزه': 'Needs Motivation',
      'بحرانی': 'Critical',
    }
    return map[ev] || ev
  }

  const consultTypeLabel = (ct) => {
    if (!isEn) return ct
    const map = {
      'تلفنی': 'Phone Call',
      'حضوری': 'In-Person',
      'آنلاین': 'Online Meeting',
    }
    return map[ct] || ct
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
              <div className="between mb">
                <h4 style={{ margin: 0 }}>{t('slotFree')} / {t('slotBooked')}</h4>
                <span className="small muted">
                  {fa(slotsFor(selDate).length)} {isEn ? 'slots on this day' : 'نوبت در این روز'}
                </span>
              </div>

              {slotsFor(selDate).length === 0 && <Empty>{t('noSlotsDay')}</Empty>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slotsFor(selDate).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: s.student_id ? '1.5px solid #c7d2fe' : '1px solid var(--line)',
                      background: s.student_id ? 'linear-gradient(135deg, var(--card) 0%, var(--tint-fill) 100%)' : 'var(--bg)',
                      borderRadius: 14,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
                      <span className={`slot-chip ${s.student_id ? 'taken' : 'free'}`} style={{ fontWeight: 800 }}>
                        ⏰ {fmt(s.start_min)} ({fa(s.duration_min || 45)} {t('durationMin')})
                      </span>
                      {s.student_id ? (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>🧑‍🎓 {s.student_name}</div>
                          {s.student_email && <div className="small muted" style={{ fontSize: 11 }}>{s.student_email}</div>}
                        </div>
                      ) : (
                        <span className="tag" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11.5 }}>
                          🟢 {isEn ? 'Available Slot (Ready for booking)' : 'اسلات خالی (آماده رزرو دانش‌آموز)'}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {s.student_id ? (
                        <>
                          <button
                            type="button"
                            className="btn sm"
                            style={{
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              color: '#fff',
                              borderRadius: 10,
                              fontSize: 12.5,
                              fontWeight: 800,
                              padding: '6px 14px',
                            }}
                            onClick={() => openConsultationModal(s)}
                          >
                            🎙️ {isEn ? 'Start Session & AI Dossier' : 'شروع جلسه و پرونده AI'}
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm slot-done"
                            style={{ borderRadius: 10, fontSize: 12, color: '#16a34a', borderColor: '#bbf7d0' }}
                            disabled={saving}
                            onClick={() => completeHeld(s)}
                          >
                            ✅ {t('markHeld')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn ghost sm danger"
                          style={{ borderRadius: 10, fontSize: 12, padding: '5px 12px' }}
                          disabled={saving}
                          onClick={() => removeSlot(s.id)}
                        >
                          🗑️ {isEn ? 'Delete Slot' : 'حذف اسلات'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Consultation Session Logs & Timeline Card ────────────────────── */}
      <Card className="mt" style={{ marginTop: 24 }}>
        <div className="between mb">
          <h3 style={{ margin: 0 }}>
            📋 {isEn ? 'Consultation History & Diagnostic Dossiers' : 'تاریخچه و پرونده جلسات مشاوره برگزار شده'}
          </h3>
          <span className="chip">
            {fa(pastSessions.length)} {isEn ? 'Sessions Logged' : 'جلسه ثبت‌شده'}
          </span>
        </div>

        {loadingSessions && <div className="small muted">{isEn ? 'Loading sessions...' : 'در حال دریافت جلسات...'}</div>}
        {!loadingSessions && pastSessions.length === 0 && (
          <Empty>
            {isEn
              ? 'No consultation sessions recorded yet. Completed session dossiers and recommendations will appear here.'
              : 'هنوز هیچ جلسه مشاوره‌ای ثبت نشده است. پس از برگزاری هر جلسه، جزئیات و توصیه‌ها در اینجا ذخیره می‌شوند.'}
          </Empty>
        )}

        {pastSessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pastSessions.map((ps) => (
              <div key={ps.id} className="dossier-card">
                <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 14, color: 'var(--ink)' }}>🧑‍🎓 {ps.student_name}</b>
                    <span className="tag" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11 }}>
                      {ps.grade_level} · {ps.field_of_study}
                    </span>
                    <span className="tag" style={{ background: 'var(--card)', color: 'var(--ink)', fontSize: 11, border: '1px solid var(--line)' }}>
                      📞 {isEn ? 'Type:' : 'نوع:'} {consultTypeLabel(ps.consultation_type)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="small muted">🗓️ {fa(ps.session_date)} ({fa(ps.duration_minutes)} {t('durationMin')})</span>
                    <span
                      className="tag"
                      style={{
                        background: ps.student_evaluation === 'عالی' ? '#dcfce7' : ps.student_evaluation === 'بحرانی' ? '#fee2e2' : '#fef3c7',
                        color: ps.student_evaluation === 'عالی' ? '#15803d' : ps.student_evaluation === 'بحرانی' ? '#b91c1c' : '#b45309',
                        fontWeight: 700,
                      }}
                    >
                      {isEn ? 'Status:' : 'وضعیت:'} {evalLabel(ps.student_evaluation)}
                    </span>
                  </div>
                </div>

                {ps.discussion_topics && (
                  <div className="dossier-topic-box">
                    <b style={{ color: 'var(--primary)' }}>💬 {isEn ? 'Discussion Topics:' : 'مباحث مطرح‌شده:'} </b>
                    <span>{ps.discussion_topics}</span>
                  </div>
                )}

                {ps.advisor_recommendations && (
                  <div className="dossier-directive-box">
                    <b style={{ color: 'var(--primary)' }}>🎯 {isEn ? 'Advisor Recommendations & Strategy:' : 'توصیه‌ها و برنامه‌های مشاور:'} </b>
                    <span style={{ display: 'block', marginTop: 4, whiteSpace: 'pre-line' }}>{ps.advisor_recommendations}</span>
                  </div>
                )}

                {ps.next_session_date && (
                  <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <span>⏳ {isEn ? 'Next Session Date:' : 'تاریخ جلسه بعدی:'}</span>
                    <span style={{ color: 'var(--primary)' }}>{fa(ps.next_session_date)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Consultation Floating Modal (Bilingual & Dark-Mode Friendly) ───────── */}
      {consultModalOpen && activeSlot && (
        <Modal
          title={isEn ? `🎙️ Diagnostic Consultation Session with ${activeSlot.student_name || 'Student'}` : `🎙️ جلسه مشاوره تخصصی با ${activeSlot.student_name || 'دانش‌آموز'}`}
          wide
          onClose={() => setConsultModalOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Info Bar */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <b style={{ fontSize: 14, color: 'var(--ink)' }}>
                  {isEn ? 'Student:' : 'دانش‌آموز:'} {activeSlot.student_name}
                </b>
                <div className="small muted">
                  {isEn ? 'Booked Slot:' : 'نوبت ثبت‌شده:'} {activeSlot.date_str} {isEn ? 'at' : 'ساعت'} {fmt(activeSlot.start_min)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="small muted">{isEn ? 'Meeting Mode:' : 'شیوه برگزاری:'}</span>
                {['تلفنی', 'حضوری', 'آنلاین'].map((tVal) => (
                  <button
                    key={tVal}
                    type="button"
                    className={`btn sm ${consultType === tVal ? '' : 'ghost'}`}
                    style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setConsultType(tVal)}
                  >
                    {consultTypeLabel(tVal)}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Recording & Upload Module */}
            <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(14,165,233,0.12) 100%)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
              <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <b style={{ fontSize: 14, color: 'var(--ink)' }}>
                    🎙️ {isEn ? 'Record / Attach Consultation Audio' : 'ضبط و پیوست صوت جلسه مشاوره'}
                  </b>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {isEn
                      ? 'Record conversation live or upload an audio recording file for AI transcription.'
                      : 'می‌توانید گفت‌وگو را به صورت زنده ضبط کنید یا فایل صوتی جلسه را آپلود نمایید.'}
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
                      {isEn ? 'Start Live Record' : 'شروع ضبط زنده'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ background: '#dc2626', color: '#fff', borderRadius: 10, animation: 'pulse 1.2s infinite' }}
                      onClick={stopRecording}
                    >
                      ⏹️ {isEn ? 'Stop Recording' : 'توقف ضبط'} ({formatTimer(recordingSeconds)})
                    </button>
                  )}

                  <label className="btn ghost sm" style={{ borderRadius: 10, cursor: 'pointer', margin: 0, background: 'var(--card)' }}>
                    📤 {isEn ? 'Upload Audio' : 'آپلود صوت'}
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
                  ✍️ {isEn ? 'Mentor Notes & Topics Covered:' : 'یادداشت‌ها و سرفصل‌های مطرح‌شده توسط مشاور:'}
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
                  {aiAnalyzing
                    ? (isEn ? '✨ Analyzing...' : '✨ در حال تحلیل...')
                    : (isEn ? '✨ AI Smart Analysis' : '✨ تحلیل هوشمند جلسه (AI Assistant)')}
                </button>
              </div>
              <textarea
                className="input"
                rows={3}
                style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                placeholder={isEn ? 'Key discussion points, student challenges, study hours, psychological state...' : 'نکات کلیدی صحبت با دانش‌آموز، چالش‌های درسی، ساعت مطالعه، وضعیت روحی و ...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* AI Diagnostics Fields */}
            <div className="two-col" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
              <label className="field">
                <span style={{ fontWeight: 800 }}>
                  {isEn ? 'Student Evaluation in this session:' : 'ارزیابی و وضعیت دانش‌آموز در این جلسه:'}
                </span>
                <select
                  className="input"
                  value={studentEval}
                  onChange={(e) => setStudentEval(e.target.value)}
                  style={{ borderRadius: 10 }}
                >
                  {EVALUATIONS.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {isEn ? ev.label_en : ev.label_fa}
                    </option>
                  ))}
                </select>
              </label>

              <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label className="field">
                  <span>{isEn ? 'Duration (min):' : 'مدت جلسه (دقیقه):'}</span>
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
                  <span>{isEn ? 'Next Session Date:' : 'تاریخ جلسه بعدی:'}</span>
                  <input
                    type="text"
                    placeholder={isEn ? 'e.g. 2026-09-22' : 'مثلا ۱۴۰۵/۰۶/۳۱'}
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
                <span style={{ fontWeight: 800 }}>
                  💬 {isEn ? 'Discussion Topics & Challenges Analyzed:' : 'مباحث و چالش‌های بررسی‌شده:'}
                </span>
                <textarea
                  className="input"
                  rows={4}
                  style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                  placeholder={isEn ? 'Subject drop, pacing, weak concepts...' : 'سرفصل‌های تحلیل‌شده، افت تراز، زمان‌بندی تست‌ها...'}
                  value={discussionTopics}
                  onChange={(e) => setDiscussionTopics(e.target.value)}
                />
              </label>
              <label className="field">
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  🎯 {isEn ? 'Mentor Strategic Directives & Assignments:' : 'توصیه‌ها و تکالیف مشاور برای دانش‌آموز:'}
                </span>
                <textarea
                  className="input"
                  rows={4}
                  style={{ width: '100%', borderRadius: 12, fontSize: 13, resize: 'vertical' }}
                  placeholder={isEn ? '1. Increase study hours to 7h\n2. Solve flagged biology questions...' : '۱. افزایش ساعت مطالعه به ۷ ساعت\n۲. اجرای تکنیک ضربدر منها...'}
                  value={advisorDirectives}
                  onChange={(e) => setAdvisorDirectives(e.target.value)}
                />
              </label>
            </div>

            {aiDiagNotes && (
              <div className="dossier-ai-box">
                <b>💡 {isEn ? 'AI Diagnostic Insight: ' : 'بینش تشخیصی هوش مصنوعی: '}</b> {aiDiagNotes}
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
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                className="btn"
                style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 800 }}
                disabled={saving}
                onClick={handleSaveConsultation}
              >
                {saving
                  ? (isEn ? 'Saving...' : 'در حال ذخیره‌سازی...')
                  : (isEn ? '💾 Finalize Dossier & Complete Slot' : '💾 ثبت نهایی پرونده جلسه و اتمام نوبت')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {view}
    </div>
  )
}
