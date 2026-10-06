import { useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import StudyCalendarMatrix from './StudyCalendarMatrix.jsx'

const PERSIAN_7_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
]

const ENGLISH_7_DAYS = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

export default function PlanSection({ studentId, plan, capacityAlerts = {}, onChanged }) {
  const { t } = useLang()
  const isEn = getLang() === 'en'

  const [tpl, setTpl] = useState([])
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = prev, +1 = next
  const [aiDraftInfo, setAiDraftInfo] = useState(null)

  const dayNames = isEn ? ENGLISH_7_DAYS : PERSIAN_7_DAYS

  // Helper to compute date strings for each day of the week with weekOffset
  const getWeekDates = (offset = 0) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diffToSat = (dayOfWeek + 1) % 7
    const sat = new Date(today)
    sat.setDate(today.getDate() - diffToSat + offset * 7)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sat)
      d.setDate(sat.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  // Always ensure all 7 days of the week exist in template
  const build7DaysFromData = (weeklyList, offset = 0) => {
    const list = Array.isArray(weeklyList) ? weeklyList : []
    const weekDates = getWeekDates(offset)

    return dayNames.map((dayName, idx) => {
      const found = list.find(
        (d) =>
          (d.label || d.day || '').trim().toLowerCase() === dayName.toLowerCase() ||
          (d.label || d.day || '').trim() === PERSIAN_7_DAYS[idx]
      )
      const rawTasks = found ? found.tasks || found.sessions || [] : list[idx]?.tasks || list[idx]?.sessions || []

      return {
        label: dayName,
        date_str: weekDates[idx],
        tasks: rawTasks.map((x, j) => ({
          id: x.id || `sess_${idx}_${j}_${Date.now()}`,
          subject: x.subject || '',
          topic: x.topic || x.focus || '',
          duration_minutes: x.duration_minutes || (x.hours ? Math.round(x.hours * 60) : 90),
          study_method: x.study_method || 'study',
          priority: x.priority || 'medium',
          question_count: x.question_count || (x.study_method === 'test' ? 30 : x.study_method === 'essay' ? 15 : null),
          reason: x.reason || '',
          notes: x.notes || '',
        })),
      }
    })
  }

  const loadWeekPlan = async (offset = weekOffset) => {
    setMsg('')
    setErr('')
    setLoadingTpl(true)
    const weekDates = getWeekDates(offset)
    const targetSat = weekDates[0]

    try {
      const r = await api(`/api/mentor/students/${studentId}?week_start=${targetSat}`)
      const weekPlan = r.plan || {}
      if (weekPlan.is_ai_draft) {
        setAiDraftInfo({
          summary: weekPlan.ai_strategy || weekPlan.summary || 'پیش‌نویس تولید شده توسط هوش مصنوعی',
          strategy: weekPlan.ai_strategy,
        })
      } else {
        setAiDraftInfo(null)
      }

      const rawWeekly = weekPlan.weekly || []
      if (rawWeekly.length > 0) {
        setTpl(build7DaysFromData(rawWeekly, offset))
      } else {
        const t = await api('/api/mentor/plans/template')
        setTpl(build7DaysFromData(t.days, offset))
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoadingTpl(false)
    }
  }

  useEffect(() => {
    loadWeekPlan(weekOffset)
  }, [studentId, weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublishPlan = async (updatedDays) => {
    setMsg('')
    setErr('')
    const weekDates = getWeekDates(weekOffset)
    try {
      await api(`/api/mentor/students/${studentId}/plan`, {
        method: 'PUT',
        body: {
          days: updatedDays || tpl,
          week_start: weekDates[0],
        },
      })
      setMsg(t('planSent') || 'برنامه هفتگی با موفقیت برای دانش‌آموز ارسال و فعال شد.')
      setAiDraftInfo(null)
      if (onChanged) onChanged()
    } catch (e) {
      setErr(e.message)
      throw e
    }
  }

  const generateAiDraft = async () => {
    setGeneratingAi(true)
    setMsg('')
    setErr('')
    const weekDates = getWeekDates(weekOffset)
    try {
      const res = await api(`/api/mentor/students/${studentId}/generate-ai-plan?week_start=${weekDates[0]}`, {
        method: 'POST',
      })
      if (res.days) {
        setTpl(build7DaysFromData(res.days, weekOffset))
        setAiDraftInfo({
          summary: res.summary || 'پیش‌نویس برنامه هوشمند تولید شده بر اساس سوابق و سبک مشاور',
          strategy: res.ai_strategy,
        })
        setMsg('🤖 پیش‌نویس برنامه هوشمند برای این هفته توسط هوش مصنوعی آماده شد. می‌توانید تغییرات دلخواه را با تقویم اعمال و سپس تایید نمایید.')
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setGeneratingAi(false)
    }
  }

  const formatDateLabel = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso + 'T00:00:00')
      return isEn ? d.toLocaleDateString('en-GB') : d.toLocaleDateString('fa-IR')
    } catch {
      return iso
    }
  }

  const curDates = getWeekDates(weekOffset)
  const weekRangeStr = `${formatDateLabel(curDates[0])} — ${formatDateLabel(curDates[6])}`

  return (
    <div className="mentor-calendar-planner">
      {msg && <div className="ok-box mb" style={{ borderRadius: 14 }}>{msg}</div>}
      {err && <div className="error-box mb" style={{ borderRadius: 14 }}>{err}</div>}

      {/* AI Draft Proposal Notice for Mentor */}
      {aiDraftInfo && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
            border: '1.5px solid var(--primary)',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <b style={{ color: 'var(--primary)', fontSize: 14.5 }}>پیش‌نویس پیشنهادی هوش مصنوعی (در انتظار تایید مشاور):</b>
              <div className="small" style={{ color: 'var(--ink)', marginTop: 2 }}>
                {aiDraftInfo.summary} {aiDraftInfo.strategy ? `· راهبرد: ${aiDraftInfo.strategy}` : ''}
              </div>
              <div className="small muted" style={{ fontSize: 11, marginTop: 2 }}>
                🔒 دانش‌آموز تا قبل از تایید نهایی شما به این برنامه دسترسی ندارد.
              </div>
            </div>
          </div>
          <button
            className="btn"
            style={{ borderRadius: 10, padding: '8px 18px', fontSize: 13 }}
            onClick={() => handlePublishPlan(tpl)}
          >
            ✓ تایید و انتشار برای دانش‌آموز
          </button>
        </div>
      )}

      {/* AI Generate Plan Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          className="btn ghost sm"
          style={{ borderRadius: 10, fontWeight: 700, color: 'var(--primary)' }}
          onClick={generateAiDraft}
          disabled={generatingAi}
        >
          {generatingAi ? '🤖 ' + (isEn ? 'Generating with AI…' : 'در حال تولید هوشمند…') : '✨ ' + (isEn ? 'Generate AI Study Schedule' : 'تولید هوشمند پیش‌نویس برنامه با هوش مصنوعی')}
        </button>
      </div>

      {/* ── CENTRAL MENTOR DRAG & DROP STUDY CALENDAR MATRIX ── */}
      <StudyCalendarMatrix
        mode="mentor"
        days={tpl}
        capacityAlerts={capacityAlerts}
        onSavePlan={handlePublishPlan}
        weekRangeStr={weekRangeStr}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onCurrentWeek={() => setWeekOffset(0)}
        weekOffset={weekOffset}
      />
    </div>
  )
}
