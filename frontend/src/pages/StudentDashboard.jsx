import { useEffect, useState } from 'react'
import { api, fa, faCompact, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Stat, Badge, Empty } from '../ui.jsx'

const GOAL_ICONS = { better_average: '📈', specific_subjects: '🎯', konkur: '🏆' }
const PRE_UNI_GRADES = ['پیش‌دانشگاهی / کنکوری', 'Pre-University / Konkur']

export default function StudentDashboard({ navigate }) {
  const { t, lang } = useLang()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [mentorCode, setMentorCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectMsg, setConnectMsg] = useState('')

  useEffect(() => {
    api('/api/dashboard/')
      .then(setD)
      .catch((e) => setError(e.message))
  }, [])

  const connectMentor = async () => {
    setConnecting(true); setConnectMsg('')
    try {
      await api('/api/dashboard/connect-mentor', { method: 'POST', body: { code: mentorCode } })
      const fresh = await api('/api/dashboard/')
      setD(fresh); setMentorCode('')
      setConnectMsg('✅ ' + t('connectedMsg'))
    } catch (e) { setConnectMsg('⚠️ ' + e.message) } finally { setConnecting(false) }
  }

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!d) return <div className="empty">{t('loadingDash')}</div>

  const p = d.profile
  const analysis = d.analysis || {}
  const plan = d.plan || {}
  const goalKey = p.goal_type
  const isPreUni = PRE_UNI_GRADES.includes(p.grade_level)
  const hasMentor = !!p.mentor_name

  return (
    <div>
      <div className="hero">
        <h2>{t('hello', { name: p.full_name })}</h2>
        <p>
          {GOAL_ICONS[goalKey]} {t('yourGoal')}: <b>{t('goal_' + goalKey) || goalKey}</b>
          {p.goal_subjects?.length > 0 && ` — ${p.goal_subjects.join('، ')}`}
        </p>
        <div className="flex mt wrap">
          <span className="badge">{t('fieldBadge')}: {p.field_of_study}</span>
          <span className="badge">{t('gradeBadge')}: {p.grade_level}</span>
          {hasMentor ? (
            <span className="badge">🧑‍🏫 {t('mentorLabel')}: {p.mentor_name}</span>
          ) : (
            <span className="badge">🤖 {t('mentorLabel')}: {t('aiMentor')}</span>
          )}
          {d.analysis?.analyzed_at && (
            <span className="badge">{t('aiAnalysis')}: {faDate(d.analysis.analyzed_at)}</span>
          )}
        </div>
      </div>

      {/* attach mentor (only shown while mentorless — a single compact line) */}
      {!hasMentor && (
        <Card className="mb" style={{ padding: 12 }}>
          <div className="flex wrap" style={{ justifyContent: 'space-between' }}>
            <div className="small muted">{t('noMentorYet')}</div>
            <div className="flex">
              <input className="input" style={{ width: 180 }} placeholder={t('mentorCodePlaceholder')}
                value={mentorCode} onChange={(e) => setMentorCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connectMentor()} />
              <button className="btn sm" disabled={connecting} onClick={connectMentor}>
                {connecting ? t('connecting') : t('connectBtn')}
              </button>
            </div>
          </div>
          {connectMsg && <div className="small mt">{connectMsg}</div>}
        </Card>
      )}

      {/* Quick Access Action Hub */}
      <div className="section-title" style={{ marginTop: 24, fontSize: 16 }}>⚡ {lang === 'fa' ? 'دسترسی سریع به پنل‌ها و بخش‌های کلیدی' : 'Quick Access Hub'}</div>
      <div className="quick-hub-grid">
        <div className="quick-hub-card" onClick={() => navigate('#/plan')}>
          <div>
            <span className="quick-hub-icon">📋</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'برنامه درسی و هفتگی' : 'Weekly Study Plan'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'مشاهده و زمان‌بندی باکس‌های مطالعه، ثبت ساعت و تیک انجام' : 'View study calendar, track task completion and log hours'}</div>
          </div>
        </div>

        <div className="quick-hub-card" onClick={() => navigate('#/report-cards')}>
          <div>
            <span className="quick-hub-icon">📊</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'کارنامه‌ها و تراز آزمون' : 'Exam Report Cards'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'ثبت کارنامه آزمون آزمایشی، تحلیل هوشمند و خروجی پرونده PDF' : 'Upload mock exams, view rank & scores, download PDF dossier'}</div>
          </div>
        </div>

        <div className="quick-hub-card" onClick={() => navigate('#/chat')}>
          <div>
            <span className="quick-hub-icon">💬</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'گفت‌وگو با مشاور و AI' : 'Consultant & AI Chat'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'ارتباط زنده با مشاور تخصصی و دستیار هوشمند سیناپس' : 'Direct live chat with your mentor and AI academic assistant'}</div>
          </div>
        </div>

        <div className="quick-hub-card" onClick={() => navigate('#/consult')}>
          <div>
            <span className="quick-hub-icon">🗓️</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'رزرو و تکالیف مشاوره' : 'Bookings & Directives'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'هماهنگی جلسات آنلاین/تلفنی، ثبت گزارش و تکالیف هفتگی' : 'Schedule 1-on-1 calls, mentor assignments and action items'}</div>
          </div>
        </div>
      </div>

      <div className="grid cols-3 mb">
        <Stat label={isPreUni ? t('diplomaAvg') : t('lastYearAvg')} value={fa(p.last_year_avg)} icon="🎓" color="#eef2ff" />
        <Stat label={t('examsTaken')} value={fa(d.exam_count)} icon="📝" color="#dcfce7" />
        <Stat label={t('latestExamAvg')} value={d.latest_exam_avg != null ? fa(d.latest_exam_avg) : '—'} icon="🧠" color="#fce7f3" />
      </div>

      {/* Report Cards Quick Banner */}
      <Card className="report-card-banner" style={{ borderRadius: 18, padding: 18, marginTop: 8 }}>
        <div className="flex wrap between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <b style={{ fontSize: 16 }}>{lang === 'fa' ? 'کارنامه‌ها و تحلیل آزمون‌های آزمایشی (خیلی سبز / قلم‌چی)' : 'Mock Exam Report Cards & Performance Analysis'}</b>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {lang === 'fa'
                ? 'کارنامه خود را بارگذاری کنید تا نمودارهای تراز، مقایسه با میانگین و پرونده عملکرد PDF استخراج شود.'
                : 'Upload your report card to generate score percentiles, comparison charts, and a comprehensive PDF dossier.'
              }
            </p>
          </div>
          <button className="btn" style={{ borderRadius: 12 }} onClick={() => navigate('#/report-cards')}>
            📊 {lang === 'fa' ? 'مشاهده و بارگذاری کارنامه' : 'View & Upload Report Cards'}
          </button>
        </div>
      </Card>

      {/* study plan entry */}
      <div className="section-title">📋 {t('studyPlan')}</div>
      <Card className="plan-card">
        {plan?.weekly?.length ? (
          <div className="flex wrap between plan-card-inner">
            <div>
              <div className="flex wrap">
                {d.plan_source === 'mentor' ? (
                  <span className="badge" style={{ background: '#dcfce7', color: '#16a34a' }}>🧑‍🏫 {t('planSourceMentor')}</span>
                ) : (
                  <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>🤖 {t('planSourceAi')}</span>
                )}
                {d.plan_mentor_name && <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>{t('planByMentor')}: {d.plan_mentor_name}</span>}
              </div>
              {plan.summary && <p className="small muted mt">{plan.summary}</p>}
            </div>
            <button className="btn" onClick={() => navigate('#/plan')}>📋 {t('openPlan')}</button>
          </div>
        ) : (
          <Empty>{t('noPlan')} <b>/plan</b></Empty>
        )}
      </Card>

      {/* AI Diagnostic Summary Card */}
      {(analysis.executive_summary || analysis.summary) && (
        <Card className="mb" style={{ padding: 16, borderLeft: '4px solid var(--primary)', background: 'var(--card)' }}>
          <div className="flex between mb" style={{ alignItems: 'center' }}>
            <b style={{ color: 'var(--primary)', fontSize: 14 }}>🤖 {t('aiDiagnosticTitle') || 'تحلیل تشخیصی هوش مصنوعی سیناپس'}</b>
            {analysis.analyzed_at && <span className="small muted">{faDate(analysis.analyzed_at)}</span>}
          </div>
          <p className="small" style={{ color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>
            {analysis.executive_summary || analysis.summary}
          </p>
        </Card>
      )}

      {/* compact strengths / weaknesses */}
      {(analysis.strengths?.length || analysis.weaknesses?.length) && (
        <>
          <div className="section-title">💪 {t('strengthsWeaknesses')}</div>
          <div className="grid cols-2">
            <Card style={{ padding: 14 }}>
              <div className="small muted mb">{t('strengths')}</div>
              <div className="chip-wrap">
                {analysis.strengths?.map((s) => <span key={s} className="chip chip-ok">✓ {s}</span>)}
              </div>
            </Card>
            <Card style={{ padding: 14 }}>
              <div className="small muted mb">{t('weaknesses')}</div>
              <div className="chip-wrap">
                {analysis.weaknesses?.map((s) => <span key={s} className="chip chip-warn">✕ {s}</span>)}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* suggested videos — one line, horizontal scroll */}
      <div className="section-title">🎥 {t('bestVideos')}</div>
      {d.videos?.length ? (
        <div className="video-rail">
          {d.videos.map((v, i) => (
            <a key={i} className="video-item-rail" href={v.url} target="_blank" rel="noreferrer">
              <div className="video-ico">🎥</div>
              <div>
                <b style={{ fontSize: 13 }}>{v.title}</b>
                <div className="small muted">{v.reason}</div>
                <div className="small muted">
                  {t('source_' + (v.source || 'youtube'))}
                  {v.views > 0 && <> · 👁 {faCompact(v.views)}</>}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <Empty>{t('noVideos')}</Empty>
      )}

      {/* notifications strip */}
      {d.notifications?.length > 0 && (
        <>
          <div className="section-title">🔔 {t('notifications')}</div>
          <Card>
            {d.notifications.map((n) => (
              <div key={n.id} className="list-item">
                <span>🔔</span>
                <span className="small">{n.text}</span>
                <span className="muted small">{faDate(n.created_at)}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
