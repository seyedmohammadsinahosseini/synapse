import { useState } from 'react'
import { api, fa } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card } from '../ui.jsx'

/**
 * Mentor → assign / edit the student's study plan.
 * Replaces the old (AI/default) plan: after sending, only the mentor plan is
 * shown to the student.
 */
// ── Plan manager (mentor view): current plan + send an (editable) plan ──
export default function PlanSection({ studentId, plan, onChanged }) {
  const { t } = useLang()
  const [edit, setEdit] = useState(false)
  const [tpl, setTpl] = useState(null)
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const comp = plan?.completion || {}
  const planColor = comp.color === 'ok' ? '#22c55e' : comp.color === 'mid' ? '#eab308' : comp.color === 'low' ? '#ef4444' : '#94a3b8'

  const openEditor = async () => {
    setEdit(true); setMsg(''); setErr('')
    // editing an already mentor-assigned plan → start from the current plan,
    // otherwise load the default template
    if (!tpl) {
      setLoadingTpl(true)
      try {
        if (plan?.source === 'mentor' && plan?.weekly?.length) {
          setTpl(plan.weekly.map((d) => ({
            label: d.label,
            tasks: d.tasks.map((x) => ({ subject: x.subject, hours: x.hours, focus: x.focus })),
          })))
        } else {
          const r = await api('/api/mentor/plans/template')
          setTpl(r.days)
        }
      } catch (e) { setErr(e.message) } finally { setLoadingTpl(false) }
    }
  }

  const upd = (di, ti, field, value) =>
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: d.tasks.map((tk, j) => (j === ti ? { ...tk, [field]: value } : tk)) } : d))
  const addTask = (di) =>
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: [...d.tasks, { subject: '', hours: 1, focus: '' }] } : d))
  const delTask = (di, ti) =>
    setTpl((prev) => prev.map((d, i) =>
      i === di ? { ...d, tasks: d.tasks.filter((_, j) => j !== ti) } : d))

  const send = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api(`/api/mentor/students/${studentId}/plan`, { method: 'PUT', body: { days: tpl } })
      setEdit(false)
      setMsg(t('planSent'))
      if (onChanged) onChanged()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Card>
      <div className="flex wrap between">
        <div className="flex wrap" style={{ gap: 10 }}>
          <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            {plan?.source === 'mentor' ? `🧑‍🏫 ${t('planSourceMentor')}` : `🤖 ${t('planSourceAi')}`}
          </span>
          {comp.pct != null && (
            <span className="badge" style={{ background: planColor + '22', color: planColor }}>
              {t('planStudentStatus')}: {fa(comp.pct)}٪
            </span>
          )}
          {plan?.generated_at && (
            <span className="small muted">{t('planGenerated')}: {fa(plan.generated_at)}</span>
          )}
        </div>
        {!edit && (
          <button className="btn sm" onClick={openEditor}>
            {plan?.exists ? '✏️ ' + t('assignNewPlan') : '📤 ' + t('sendPlan')}
          </button>
        )}
      </div>

      {msg && <div className="ok-box mt">{msg}</div>}
      {err && <div className="error-box mt">{err}</div>}

      {!edit && plan?.weekly?.length > 0 && (
        <div className="small muted mt">
          {plan?.summary || (plan?.source === 'ai' ? t('aiPlanWillReplaceNote') : '')}
        </div>
      )}

      {!edit && !plan?.weekly?.length && (
        <div className="small muted mt">
          {plan?.exists ? '—' : t('noPlanYet')} · {t('aiPlanWillReplaceNote')}
        </div>
      )}

      {edit && (
        <div className="mt">
          {loadingTpl && <div className="empty">…</div>}
          {tpl && (
            <>
              <div className="plan-editor">
                {tpl.map((d, di) => (
                  <div key={di} className="plan-editor-day">
                    <div className="plan-editor-day-head">
                      <b>{d.label}</b>
                      <button className="btn ghost sm" type="button" onClick={() => addTask(di)}>{t('addSession')}</button>
                    </div>
                    {d.tasks.map((task, ti) => (
                      <div key={ti} className="plan-editor-task">
                        <input className="input" style={{ flex: 1.4 }} value={task.subject}
                          placeholder={t('sessionSubject')} onChange={(e) => upd(di, ti, 'subject', e.target.value)} />
                        <input className="input" type="number" min="0.5" max="12" step="0.5" style={{ width: 84 }}
                          value={task.hours} onChange={(e) => upd(di, ti, 'hours', e.target.value)} title={t('sessionHours')} />
                        <input className="input" style={{ flex: 1.6 }} value={task.focus}
                          placeholder={t('sessionFocus')} onChange={(e) => upd(di, ti, 'focus', e.target.value)} />
                        <button className="btn ghost sm danger" type="button" onClick={() => delTask(di, ti)}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex mt" style={{ justifyContent: 'space-between' }}>
                <button className="btn ghost" onClick={() => setEdit(false)}>✕</button>
                <button className="btn" disabled={saving} onClick={send}>
                  {saving ? t('connecting') : t('sendPlan')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
