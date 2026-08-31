import { useEffect, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { Card, Badge, Empty } from '../ui.jsx'

/** All connected students with their weekly plan-colour traffic light. */
export default function MentorStudents({ navigate }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/mentor/students')
      .then(setStudents)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div>
      <div className="hero">
        <div className="flex wrap between">
          <div>
            <h2>{t('navStudents')} ({fa(students?.length || 0)})</h2>
            <p>{t('planLegend')}</p>
          </div>
          <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate('#/mentor')}>
            ← {t('backBtn')}
          </button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!students && <Empty>…</Empty>}
      {students && students.length === 0 && (
        <Empty>{t('noStudentsYet', { code: user.code })}</Empty>
      )}

      {students && students.length > 0 && (
        <div className="grid cols-3 students-grid">
          {students.map((s) => (
            <Card
              key={s.id}
              className="student-card"
              style={
                s.plan_color
                  ? {
                      borderColor:
                        s.plan_color === 'mid' ? '#eab308' : s.plan_color === 'low' ? '#ef4444' : 'transparent',
                      boxShadow:
                        s.plan_color !== 'ok'
                          ? `0 0 0 1px ${s.plan_color === 'mid' ? '#eab308' : '#ef4444'} inset`
                          : undefined,
                    }
                  : undefined
              }
              onClick={() => navigate(`#/mentor/student/${s.id}`)}
            >
              <div className="between">
                <div className="flex">
                  <div className="avatar">{s.full_name.slice(0, 1)}</div>
                  <div>
                    <b>{s.full_name}</b>
                    <div className="small muted">{s.field_of_study} — {s.grade_level}</div>
                  </div>
                </div>
                {s.analysis_ready && <span title="AI">🤖</span>}
              </div>
              <div className="flex wrap mt">
                <Badge color="#6366f1">{t('goal_' + s.goal_type) || s.goal_type}</Badge>
                <Badge color="#a855f7">{t('avgShort')}: {s.exam_avg != null ? fa(s.exam_avg) : '—'}</Badge>
                {s.plan_color && (
                  <span
                    className="plan-dot-badge"
                    style={{
                      background:
                        s.plan_color === 'ok' ? '#22c55e'
                        : s.plan_color === 'mid' ? '#eab308' : '#ef4444',
                    }}
                  >
                    {s.plan_color === 'ok' ? '🟢' : s.plan_color === 'mid' ? '🟡' : '🔴'}{' '}
                    {s.plan_pct != null ? fa(s.plan_pct) + '٪' : ''}
                  </span>
                )}
              </div>
              <div className="small muted mt">{t('exams')}: {fa(s.exam_count)}</div>
              <div className="small muted">{t('joined')}: {faDate(s.joined)}</div>
              <button className="btn sm mt block" onClick={(e) => { e.stopPropagation(); navigate(`#/mentor/student/${s.id}`) }}>
                🛠️ {t('supervisionTitle')}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
