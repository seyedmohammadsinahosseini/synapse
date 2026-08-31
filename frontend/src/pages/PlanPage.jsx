import { useCallback, useEffect, useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty } from '../ui.jsx'

export default function PlanPage({ navigate }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('/api/plan').then(setData).catch((e) => setError(e.message))
  }, [])

  useEffect(load, [load])

  const tick = async (task, status) => {
    if (busy) return
    setBusy(true)
    const today = data.days.find((d) => d.is_today)
    const next = task.status === status ? '' : status // tapping the active one clears
    try {
      await api('/api/plan/task', {
        method: 'POST',
        body: { day_index: today.index, task_index: task.index, status: next },
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const faDateOnly = (iso) => {
    try {
      const d = new Date(iso + 'T00:00:00')
      return getLang() === 'fa'
        ? d.toLocaleDateString('fa-IR')
        : d.toLocaleDateString('en-GB')
    } catch { return iso }
  }

  const tickSuperv = async (dateStr, part, status) => {
    if (busy) return
    setBusy(true)
    try {
      await api('/api/plan/supervision/task', {
        method: 'POST',
        body: { date_str: dateStr, part, status },
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="empty">⚠️ {error}</div>
  if (!data) return <div className="empty">…</div>

  const today = data.days.find((d) => d.is_today) || null
  const week = data.week || {}
  const sourceIsMentor = data.source === 'mentor'
  const color = week.color === 'ok' ? '#22c55e' : week.color === 'mid' ? '#eab308' : week.color === 'low' ? '#ef4444' : '#94a3b8'
  const pct = week.pct

  return (
    <div>
      <div className="hero plan-hero">
        <div className="flex wrap between">
          <div>
            <h2>
              {t('planOf')}{' '}
              <span className="badge" style={{ fontSize: 13 }}>
                {sourceIsMentor ? `🧑‍🏫 ${t('planSourceMentor')}` : `🤖 ${t('planSourceAi')}`}
              </span>
            </h2>
            <p>
              {sourceIsMentor
                ? (data.mentor_name ? `${t('planByMentor')}: ${data.mentor_name}` : t('planByMentor'))
                : t('planByAi')}
              {data.generated_at ? ` — ${t('planGenerated')}: ${fa(data.generated_at)}` : ''}
            </p>
          </div>
          <div className="week-ring-wrap">
            {pct != null ? (
              <>
                <div
                  className="week-ring"
                  style={{ background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,.25) 0)` }}
                >
                  <div className="week-ring-in"><b>{fa(pct)}٪</b></div>
                </div>
                <div className="small" style={{ color: 'rgba(255,255,255,.9)' }}>{t('weekProgress')}</div>
              </>
            ) : (
              <div className="small" style={{ color: 'rgba(255,255,255,.9)' }}>
                {t('weekProgress')}: —
              </div>
            )}
          </div>
        </div>
      </div>

      {!data.plan_exists && <Empty>{t('noPlanYet')}</Empty>}

      {data.plan_exists && (
        <>
          {/* today's interactive to-do */}
          <div className="section-title">✅ {t('todayTasks')} — {today ? today.label : ''}</div>
          <Card>
            <div className="small muted mb" style={{ fontSize: 12 }}>{t('taskLegend')}</div>
            {today && today.tasks.length > 0 ? (
              <div className="task-list">
                {today.tasks.map((task) => (
                  <div key={task.index} className={`task-row ${task.status ? 'has' : ''}`}>
                    <div className="task-info">
                      <b>{task.subject}</b>
                      <div className="small muted">
                        {t('sessionHours')}: {fa(task.hours)} {task.focus && <>· {task.focus}</>}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button
                        className={`task-btn ok ${task.status === 'done' ? 'on' : ''}`}
                        title={t('taskDone')}
                        disabled={busy}
                        onClick={() => tick(task, 'done')}
                      >
                        ✓ {t('taskDone')}
                      </button>
                      <button
                        className={`task-btn no ${task.status === 'missed' ? 'on' : ''}`}
                        title={t('taskMissed')}
                        disabled={busy}
                        onClick={() => tick(task, 'missed')}
                      >
                        ✕ {t('taskMissed')}
                      </button>
                      {task.status && (
                        <button className="task-btn clear" disabled={busy} onClick={() => tick(task, '')}>
                          {t('clearTask')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>{t('noTaskToday')}</Empty>
            )}
          </Card>

          {/* whole week reference */}
          <div className="section-title">🗓️ {t('planDays')}</div>
          <div className="grid cols-2">
            {data.days.map((d) => (
              <Card key={d.index} className={`plan-day-card ${d.is_today ? 'today' : ''}`}>
                <div className="between">
                  <h4 style={{ margin: 0 }}>
                    {d.label}
                    {d.is_today && <span className="badge badge-today">{t('today')}</span>}
                  </h4>
                </div>
                {d.tasks.length === 0 && <div className="small muted">—</div>}
                {d.tasks.map((task) => (
                  <div key={task.index} className="plan-session">
                    <span className="plan-session-subj">{task.subject}</span>
                    <span className="small muted">{fa(task.hours)} {t('sessionHours')}</span>
                    {task.focus && <span className="small muted plan-session-focus">{task.focus}</span>}
                    {d.is_today && task.status && (
                      <span className={`plan-session-state ${task.status === 'done' ? 'ok' : 'no'}`}>
                        {task.status === 'done' ? '✓' : '✕'}
                      </span>
                    )}
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* mentor supervision program of the current week */}
      {data.supervision_week?.some((d) => d.parts.length > 0) && (
        <>
          <div className="section-title">🧑‍🏫 {t('supervisionTitle')} — {t('thisWeek')}</div>
          <div className="small muted mb" style={{ fontSize: 12 }}>{t('supervisionSub')}</div>
          <div className="grid cols-2">
            {data.supervision_week
              .filter((d) => d.parts.length > 0)
              .map((d) => (
                <Card key={d.date_str} className="plan-day-card">
                  <h4 style={{ margin: 0 }}>
                    {d.label} · {faDateOnly(d.date_str)}
                    {d.date_str === data.date_str && (
                      <span className="badge badge-today">{t('today')}</span>
                    )}
                  </h4>
                  {d.parts.map((pr) => {
                    const st = pr.status
                    return (
                      <div key={pr.part} className={`superv-row ${st === 'done' ? 'is-done' : st === 'missed' ? 'is-missed' : ''}`}>
                        <div className="superv-time small">{fa(pr.from)} – {fa(pr.to)}</div>
                        <div className="superv-text" style={{ whiteSpace: 'pre-line' }}>{pr.text}</div>
                        <div className="task-actions" style={{ marginInlineStart: 'auto' }}>
                          <button
                            className={`task-btn ok ${st === 'done' ? 'on' : ''}`}
                            disabled={busy}
                            onClick={() => tickSuperv(d.date_str, pr.part, 'done')}
                          >
                            ✓ {t('taskDone')}
                          </button>
                          <button
                            className={`task-btn no ${st === 'missed' ? 'on' : ''}`}
                            disabled={busy}
                            onClick={() => tickSuperv(d.date_str, pr.part, 'missed')}
                          >
                            ✕ {t('taskMissed')}
                          </button>
                          {st !== 'todo' && (
                            <button className="task-btn clear" disabled={busy} onClick={() => tickSuperv(d.date_str, pr.part, '')}>
                              {t('clearTask')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </Card>
              ))}
          </div>
        </>
      )}

      <div className="mt">
        <button className="btn ghost" onClick={() => navigate('#/dashboard')}>← {t('backToPlan')}</button>
      </div>
    </div>
  )
}
