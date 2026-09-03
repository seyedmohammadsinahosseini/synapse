import { useEffect, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Badge, Empty, ScoreBadge, SubjectScores } from '../ui.jsx'

/**
 * Student academic record and diagnostic performance view.
 */
export default function HistoryPage({ navigate }) {
  const { t } = useLang()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/dashboard/')
      .then(setD)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!d) return <div className="empty">…</div>

  const analysis = d.analysis || {}
  const p = d.profile

  return (
    <div>
      <div className="hero">
        <div className="flex wrap between">
          <div>
            <h2>🎓 {t('historyTitle')}</h2>
            <p>{t('historySub')}</p>
          </div>
          <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={() => navigate('#/dashboard')}>
            ← {t('backBtn')}
          </button>
        </div>
        <div className="flex wrap mt">
          <span className="badge">{p.field_of_study}</span>
          <span className="badge">{p.grade_level}</span>
          <span className="badge">🎯 {t('goal_' + p.goal_type) || p.goal_type}</span>
        </div>
      </div>

      {/* AI Diagnostic Summary */}
      <div className="section-title">🤖 {t('analysisSummary')}</div>
      <Card>
        <div className="analysis-box">{analysis.summary || '—'}</div>
        <div className="flex wrap mt" style={{ gap: 8 }}>
          <Badge color="#6366f1">{t('aiAnalysis')}</Badge>
          {analysis.strengths?.map((s) => <Badge key={s} color="#22c55e">✓ {s}</Badge>)}
          {analysis.weaknesses?.map((s) => <Badge key={s} color="#ef4444">✕ {s}</Badge>)}
          {analysis.focus_subjects?.map((s) => <Badge key={s} color="#a855f7">🎯 {s}</Badge>)}
        </div>
      </Card>

      {/* Subject Grades */}
      <div className="section-title">📊 {t('subjectScores')}</div>
      <Card>
        <SubjectScores items={d.reported_subjects} />
      </Card>

      {/* Examination Records */}
      <div className="section-title">📝 {t('examHistory')}</div>
      <Card>
        {d.exam_scores?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>{t('typeShort')}</th>
                <th>{t('date')}</th>
                <th>{t('score')}</th>
                <th>{t('result')}</th>
              </tr>
            </thead>
            <tbody>
              {d.exam_scores.map((e) => (
                <tr key={e.id}>
                  <td>{e.kind === 'exam' ? t('typeExam') : t('typeTest')}</td>
                  <td className="muted">{faDate(e.date)}</td>
                  <td><ScoreBadge score={e.score} /></td>
                  <td>
                    <button className="btn ghost sm" onClick={() => navigate(`#/exam/${e.id}`)}>
                      {t('viewResult')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>{t('noExamsYet')}</Empty>
        )}
      </Card>
    </div>
  )
}
