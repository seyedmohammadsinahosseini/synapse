import { useEffect, useRef, useState } from 'react'
import { api, fa, faClock } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Badge, Modal } from '../ui.jsx'

export default function ExamPanel({ examId, navigate }) {
  const { t } = useLang()
  const [exam, setExam] = useState(null)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [remaining, setRemaining] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const submittedRef = useRef(false)

  const diffLabel = (d) => t('diff_' + d)
  const modelLabel = (m) => t('model_' + m)
  const typeLabel = (ty) => t('type_' + ty)

  useEffect(() => {
    api(`/api/exams/${examId}`)
      .then((data) => {
        setExam(data)
        if (data.status === 'submitted') {
          setResult(data)
        } else {
          const started = new Date(data.started_at).getTime()
          const end = started + data.time_limit_seconds * 1000
          const rem = Math.max(0, Math.floor((end - Date.now()) / 1000))
          setRemaining(rem)
        }
      })
      .catch((e) => setError(e.message))
  }, [examId])

  useEffect(() => {
    if (exam && exam.status !== 'submitted' && remaining != null) {
      const tt = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(tt)
            if (!submittedRef.current) doSubmit(true) // auto-submit on timeout
            return 0
          }
          return r - 1
        })
      }, 1000)
      return () => clearInterval(tt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, remaining != null])

  const doSubmit = async (forced = false) => {
    if (submittedRef.current) return
    if (!forced && !window.confirm(t('confirmText', { a: fa(Object.keys(answers).length), b: fa(exam?.total_questions || 0) }))) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      const res = await api(`/api/exams/${examId}/submit`, {
        method: 'POST',
        body: {
          answers: Object.entries(answers).map(([qid, a]) => ({
            question_id: Number(qid),
            choice: a.choice ?? null,
            text: a.text ?? null,
          })),
        },
      })
      setResult(res)
    } catch (e) {
      submittedRef.current = false
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const setAnswer = (q, value) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }))
  }

  // ── result view ─────────────────────────────────────────────────────
  if (result) {
    const correct = result.questions.filter((q) => q.is_correct).length
    return (
      <div className="exam-wrap">
        <div className="between mb">
          <button className="btn ghost sm" onClick={() => navigate('#/dashboard')}>
            {t('backToDashboard')}
          </button>
          <Badge color="#6366f1">{t('resultOf')} {result.kind === 'exam' ? t('typeExam') : t('typeTest')}</Badge>
        </div>
        <Card className="result-score">
          <div className="muted small">{t('finalScore')}</div>
          <div className="big" style={{ color: result.total_score >= 10 ? '#22c55e' : '#ef4444' }}>
            {fa(result.total_score)}
          </div>
          <div className="small muted">{t('correctOf', { a: fa(correct), b: fa(result.total_questions) })}</div>
        </Card>
        <div className="section-title">{t('reviewAnswers')}</div>
        {result.questions.map((q, i) => {
          const ok = q.is_correct
          return (
            <Card key={q.id} className="mb">
              <div className="between">
                <b>{fa(i + 1)}. {q.text}</b>
                <span className="badge" style={{ background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626' }}>
                  {ok ? t('correctBadge') : t('wrongBadge')} — {fa(q.score)}
                </span>
              </div>
              <div className="small muted mt">
                <b>{t('subjectCol')}:</b> {q.subject} | <b>{t('difficultyShort')}:</b> {typeLabel(q.type)}
              </div>
              {q.type === 'mcq' && q.options?.length > 0 && (
                <div className="mt small">
                  {q.options.map((o, j) => {
                    const chosen = q.user_answer?.choice === j
                    const isRight = q.correct_answer_label === o || String(j) === q.correct_answer
                    return (
                      <div
                        key={j}
                        className="small"
                        style={{
                          padding: '4px 8px', borderRadius: 8, margin: '3px 0',
                          background: isRight ? '#dcfce7' : chosen ? '#fee2e2' : 'transparent',
                        }}
                      >
                        {fa(j + 1)}. {o} {isRight ? '✔' : chosen ? '✘' : ''}
                      </div>
                    )
                  })}
                </div>
              )}
              {q.user_answer?.text && (
                <div className="mt small"><b>{t('yourAnswer')}:</b> {q.user_answer.text}</div>
              )}
              {q.feedback && <div className="mt small" style={{ color: '#6b7280' }}>💬 {q.feedback}</div>}
            </Card>
          )
        })}
      </div>
    )
  }

  // ── exam mode ───────────────────────────────────────────────────────
  if (error) return <div className="empty">⚠️ {error}</div>
  if (!exam) return <div className="empty">{t('preparingExam')}</div>

  const qs = exam.questions
  const q = qs[current]
  const doneCount = Object.keys(answers).length
  const answered = answers[q.id]

  return (
    <div className="exam-wrap">
      <div className="exam-top">
        <div className="flex">
          <button className="btn ghost sm" onClick={() => navigate('#/dashboard')}>
            {t('exit')}
          </button>
          <Badge color="#6366f1">
            {exam.kind === 'exam' ? t('typeExam') : t('typeTest')} — {modelLabel(exam.model)} — {diffLabel(exam.difficulty)}
          </Badge>
        </div>
        <div className="flex">
          <span className="small muted">{t('answered', { a: fa(doneCount), b: fa(qs.length) })}</span>
          <span className={`timer ${remaining != null && remaining <= 60 ? 'warn' : ''}`}>
            ⏱ {faClock(remaining || 0)}
          </span>
        </div>
      </div>

      <Card className="q-card">
        <div className="between mb">
          <h3>{t('questionOf', { a: fa(current + 1), b: fa(qs.length) })}</h3>
          <Badge color="#a855f7">{q.subject}</Badge>
        </div>
        <div className="q-type"><Badge color="#6366f1">{typeLabel(q.type)}</Badge></div>
        <div style={{ fontSize: 16, fontWeight: 700, margin: '10px 0 16px' }}>{q.text}</div>

        {q.type === 'mcq' && (
          <div>
            {q.options.map((o, j) => (
              <button
                key={j}
                className={`option ${answered?.choice === j ? 'sel' : ''}`}
                onClick={() => setAnswer(q, { choice: j })}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {(q.type === 'essay' || q.type === 'fill') && (
          <textarea
            className="input"
            rows={q.type === 'essay' ? 7 : 2}
            placeholder={q.type === 'fill' ? t('fillPlaceholder') : t('essayPlaceholder')}
            value={answered?.text || ''}
            onChange={(e) => setAnswer(q, { text: e.target.value })}
          />
        )}
      </Card>

      <div className="q-nav">
        {qs.map((_, i) => (
          <button
            key={i}
            className={`${answers[qs[i].id] ? 'done' : ''} ${i === current ? 'cur' : ''}`}
            onClick={() => setCurrent(i)}
          >
            {fa(i + 1)}
          </button>
        ))}
      </div>

      <div className="flex mt" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          {t('prevBtn')}
        </button>
        {current < qs.length - 1 ? (
          <button className="btn" onClick={() => setCurrent(current + 1)}>
            {t('nextBtn')}
          </button>
        ) : (
          <button className="btn ok" disabled={submitting} onClick={() => setConfirmOpen(true)}>
            {submitting ? t('submitting') : t('finishExam')}
          </button>
        )}
      </div>

      {confirmOpen && (
        <Modal title={t('confirmTitle')} onClose={() => setConfirmOpen(false)}>
          <p className="mb">{t('confirmText', { a: fa(doneCount), b: fa(qs.length) })}</p>
          <div className="flex" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setConfirmOpen(false)}>{t('backBtn')}</button>
            <button className="btn ok" onClick={() => { setConfirmOpen(false); doSubmit(true) }}>
              {t('finalSubmit')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
