import { useEffect, useState } from 'react'
import { api, fa } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Stat, Empty } from '../ui.jsx'

/** Mentor landing dashboard: key numbers of the mentor's work. */
export default function MentorDashboard({ navigate }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [st, setSt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/mentor/stats')
      .then(setSt)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <div className="hero">
        <h2>🏠 {t('mentorPanel')} — {user.full_name}</h2>
        <p>
          {t('yourCode')}{' '}
          <b style={{ fontSize: 20, letterSpacing: 2 }}>{user.code || '—'}</b>
          <span style={{ color: 'rgba(255,255,255,.8)' }}> {t('codeHint')}</span>
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!st && <Empty>…</Empty>}

      {st && (
        <>
          <div className="grid cols-3">
            <Stat label={t('studentsCount')} value={fa(st.students)} icon="👨‍🎓" color="#eef2ff" />
            <Stat label={t('plansGivenShort')} value={fa(st.plans_given)} icon="📋" color="#dcfce7" />
            <Stat label={t('bookedThisWeek')} value={fa(st.booked_week)} icon="🗓️" color="#fce7f3" />
          </div>

          <div className="section-title">🟢🟡🔴 {t('studentStates')}</div>
          <Card>
            <div className="flex wrap">
              <span className="plan-dot-badge" style={{ background: '#22c55e' }}>🟢 {t('completionOk')}: {fa(st.color_counts.ok)}</span>
              <span className="plan-dot-badge" style={{ background: '#eab308' }}>🟡 {t('completionMid')}: {fa(st.color_counts.mid)}</span>
              <span className="plan-dot-badge" style={{ background: '#ef4444' }}>🔴 {t('completionLow')}: {fa(st.color_counts.low)}</span>
              {st.color_counts.none > 0 && (
                <span className="plan-dot-badge" style={{ background: '#94a3b8' }}>⚪ {t('noData')}: {fa(st.color_counts.none)}</span>
              )}
            </div>
          </Card>

          <div className="section-title">⚡ {t('mentorQuickActions')}</div>
          <div className="grid cols-3">
            <Card className="stat" style={{ cursor: 'pointer' }} onClick={() => navigate('#/mentor/students')}>
              <div className="stat-icon" style={{ background: '#eef2ff' }}>👨‍🎓</div>
              <div><div className="stat-value">{t('navStudents')}</div><div className="stat-label">{fa(st.students)}</div></div>
            </Card>
            <Card className="stat" style={{ cursor: 'pointer' }} onClick={() => navigate('#/chat')}>
              <div className="stat-icon" style={{ background: '#dcfce7' }}>💬</div>
              <div><div className="stat-value">{t('navChat')}</div><div className="stat-label">{t('chatPageSub')}</div></div>
            </Card>
            <Card className="stat" style={{ cursor: 'pointer' }} onClick={() => navigate('#/mentor/schedule')}>
              <div className="stat-icon" style={{ background: '#fce7f3' }}>🗓️</div>
              <div><div className="stat-value">{t('navSchedule')}</div><div className="stat-label">{t('scheduleTitle')}</div></div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
