import { useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useAuth } from '../auth.jsx'
import { PRE_UNIVERSITY, useLang } from '../i18n.jsx'
import { Card, Logo } from '../ui.jsx'

const SUBJECTS = [
  'ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'علوم تجربی', 'ادبیات فارسی',
  'زبان انگلیسی', 'عربی', 'دین و زندگی', 'مطالعات اجتماعی', 'فارسی', 'نگارش',
]
const FIELDS = ['ریاضی و فیزیک', 'علوم تجربی', 'علوم انسانی', 'فنی و حرفه‌ای', 'کار و دانش']

const STEPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7']

export default function Register({ navigate }) {
  const { login } = useAuth()
  const { t, grades, lang } = useLang()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [info, setInfo] = useState({ full_name: '', email: '', phone: '' })
  const [pass, setPass] = useState({ password: '', confirm: '' })
  const [gradeIdx, setGradeIdx] = useState(-1)
  const [field, setField] = useState(FIELDS[0])
  const [lastYearAvg, setLastYearAvg] = useState('')
  const [rows, setRows] = useState([
    { subject: SUBJECTS[0], score: '', custom: false },
    { subject: SUBJECTS[1], score: '', custom: false },
    { subject: SUBJECTS[2], score: '', custom: false },
  ])
  const [goalType, setGoalType] = useState('better_average')
  const [goalSubjects, setGoalSubjects] = useState([])
  const [mentorCode, setMentorCode] = useState('')

  const setInfoField = (k) => (e) => setInfo({ ...info, [k]: e.target.value })
  const setPassField = (k) => (e) => setPass({ ...pass, [k]: e.target.value })

  const grade = gradeIdx >= 0 ? grades[gradeIdx] : ''
  const hasMajor = gradeIdx >= 3          // Grade 10 and above requires major selection
  const isPreUni = PRE_UNIVERSITY.includes(gradeIdx)
  const enteredRows = rows.filter((r) => r.subject && r.score !== '')

  const validate = () => {
    setError('')
    if (step === 1) {
      if (!info.full_name.trim()) return t('nameLabel') + ' —'
      if (!/^\S+@\S+\.\S+$/.test(info.email)) return t('emailLabel') + ' —'
    }
    if (step === 2) {
      if (pass.password.length < 9) return t('pwTooShort')
      if (!/[^\W\d_]/.test(pass.password)) return t('pwNoLetter')
      if (!/\d/.test(pass.password)) return t('pwNoDigit')
      if (pass.password !== pass.confirm) return t('pwMismatch')
    }
    if (step === 3 && gradeIdx < 0) return t('gradeLabel') + ' —'
    if (step === 4 && hasMajor && !field) return t('fieldLabel') + ' —'
    if (step === 5) {
      const v = parseFloat(lastYearAvg)
      if (isNaN(v) || v < 0 || v > 20) return t(isPreUni ? 'diplomaAvgLabel' : 'lastYearAvgLabel') + ' —'
    }
    if (step === 6) {
      if (enteredRows.length === 0) return t('atLeastOneSubject')
      for (const r of enteredRows) {
        const v = parseFloat(r.score)
        if (isNaN(v) || v < 0 || v > 20) return t('scoreRange', { s: r.subject })
      }
    }
    if (step === 7 && !isPreUni && !goalType) return t('goalLabel') + ' —'
    return null
  }

  const next = () => {
    const v = validate()
    if (v) return setError(v)
    setStep((s) => Math.min(7, s + 1))
    window.scrollTo({ top: 0 })
  }
  const back = () => {
    setError('')
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0 })
  }

  const submit = async () => {
    const v = validate()
    if (v) return setError(v)
    const scores = enteredRows.map((r) => ({ subject: r.subject, score: parseFloat(r.score) }))
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/auth/register/student', {
        method: 'POST',
        body: {
          full_name: info.full_name.trim(),
          email: info.email.trim(),
          phone: info.phone.trim(),
          password: pass.password,
          grade_level: grade,
          field_of_study: hasMajor ? field : (lang === 'fa' ? 'دورهٔ اول متوسطه (بدون رشته)' : 'Middle school (no major)'),
          last_year_avg: parseFloat(lastYearAvg),
          subject_scores: scores,
          goal_type: isPreUni ? 'konkur' : goalType,
          goal_subjects: !isPreUni && goalType === 'specific_subjects' ? goalSubjects : [],
          mentor_code: mentorCode.trim(),
          lang,
        },
      })
      login(data.token, data.user)
      navigate('#/dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleGoalSubject = (s) =>
    setGoalSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const setRowSubject = (i, value) => {
    const c = [...rows]
    if (value === '__other__') {
      c[i] = { subject: '', score: c[i].score, custom: true }
    } else {
      c[i] = { subject: value, score: c[i].score, custom: false }
    }
    setRows(c)
  }

  return (
    <div className="auth-wrap">
      <Card className="auth-card wide">
        <div className="auth-hero">
          <Logo size={56} />
          <h1>{t('regTitle')}</h1>
          <p>{t('regSub')}</p>
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'cur' : ''}`}>
              <div className="step-num">{fa(i + 1)}</div>
              <div className="step-name">{t(s)}</div>
            </div>
          ))}
        </div>
        <div className="small muted" style={{ textAlign: 'center', marginBottom: 14 }}>
          {t('stepOf', { a: fa(step), b: fa(7) })}
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* ═══ STEP 1 — basic info ═══ */}
        {step === 1 && (
          <div>
            <label className="field">
              <span>{t('nameLabel')}</span>
              <input className="input" value={info.full_name} onChange={setInfoField('full_name')} placeholder={t('namePlaceholder')} />
            </label>
            <label className="field">
              <span>{t('emailLabel')}</span>
              <input className="input" type="email" value={info.email} onChange={setInfoField('email')} placeholder={t('emailPlaceholder')} />
            </label>
            <label className="field">
              <span>{t('phoneLabel')}</span>
              <input className="input" value={info.phone} onChange={setInfoField('phone')} placeholder={t('phonePlaceholder')} />
            </label>
            <button className="btn block" onClick={next}>{t('nextStep')}</button>
          </div>
        )}

        {/* ═══ STEP 2 — password ═══ */}
        {step === 2 && (
          <div>
            <label className="field">
              <span>{t('passwordLabel')}</span>
              <input className="input" type="password" value={pass.password} onChange={setPassField('password')} />
              <div className="hint">{t('pwHint')}</div>
            </label>
            <label className="field">
              <span>{t('confirmPasswordLabel')}</span>
              <input className="input" type="password" value={pass.confirm} onChange={setPassField('confirm')} placeholder={t('confirmPasswordPlaceholder')} />
            </label>
            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — grade ═══ */}
        {step === 3 && (
          <div>
            <label className="field">
              <span>{t('gradeLabel')}</span>
              <select className="input" value={gradeIdx} onChange={(e) => setGradeIdx(Number(e.target.value))}>
                <option value={-1}>{t('choose')}</option>
                {grades.map((g, i) => <option key={g} value={i}>{g}</option>)}
              </select>
              <div className="hint">{t('gradeHintBelow10')}</div>
            </label>
            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — field (10th+) ═══ */}
        {step === 4 && (
          <div>
            {hasMajor ? (
              <label className="field">
                <span>{t('fieldLabel')}</span>
                <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
                  {FIELDS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
            ) : (
              <div className="analysis-box">{t('noMajorInfo')}</div>
            )}
            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 5 — last year avg OR diploma avg ═══ */}
        {step === 5 && (
          <div>
            <label className="field">
              <span>{t(isPreUni ? 'diplomaAvgLabel' : 'lastYearAvgLabel')}</span>
              <input className="input" type="number" min="0" max="20" step="0.1" value={lastYearAvg} onChange={(e) => setLastYearAvg(e.target.value)} />
            </label>
            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 6 — subjects + grades ═══ */}
        {step === 6 && (
          <div>
            <label className="field">
              <span>{t('subjectsLabel')}</span>
              {rows.map((r, i) => (
                <div className="subject-row" style={{ marginBottom: 8 }} key={i}>
                  {r.custom ? (
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      placeholder={t('customLessonPlaceholder')}
                      value={r.subject}
                      onChange={(e) => {
                        const c = [...rows]; c[i].subject = e.target.value; setRows(c)
                      }}
                    />
                  ) : (
                    <select
                      className="input"
                      style={{ flex: 1 }}
                      value={r.subject}
                      onChange={(e) => setRowSubject(i, e.target.value)}
                    >
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                      <option value="__other__">{t('anotherLesson')}</option>
                    </select>
                  )}
                  <input
                    className="input" type="number" min="0" max="20" step="0.25"
                    style={{ width: 90 }} placeholder={t('gradeVal')}
                    value={r.score}
                    onChange={(e) => {
                      const c = [...rows]; c[i].score = e.target.value; setRows(c)
                    }}
                  />
                  <button type="button" className="btn ghost sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={() => setRows([...rows, { subject: SUBJECTS[0], score: '', custom: false }])}>
                {t('addSubject')}
              </button>
            </label>
            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 7 — goal + optional mentor code ═══ */}
        {step === 7 && (
          <div>
            {isPreUni ? (
              <div className="analysis-box mb">{t('preUniGoalNote')}</div>
            ) : (
              <>
                <label className="field">
                  <span>{t('goalLabel')}</span>
                  <select className="input" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
                    <option value="better_average">{t('goal_better_average')}</option>
                    <option value="specific_subjects">{t('goal_specific_subjects')}</option>
                    <option value="konkur">{t('goal_konkur')}</option>
                  </select>
                </label>
                {goalType === 'specific_subjects' && (
                  <label className="field">
                    <span>{t('whichSubjects')}</span>
                    <div className="subjects-grid">
                      {enteredRows.map((r) => (
                        <label key={r.subject} className="subject-row" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={goalSubjects.includes(r.subject)}
                            onChange={() => toggleGoalSubject(r.subject)}
                          />
                          <span style={{ fontSize: 13 }}>{r.subject}</span>
                        </label>
                      ))}
                    </div>
                  </label>
                )}
              </>
            )}

            <label className="field">
              <span>{t('mentorCodeLabel')}</span>
              <input className="input" value={mentorCode} onChange={(e) => setMentorCode(e.target.value)} placeholder="MNT1001" />
              <div className="hint">{t('mentorCodeHint')}</div>
            </label>

            <div className="flex between">
              <button className="btn ghost" onClick={back}>{t('prevStep')}</button>
              <button className="btn" disabled={loading} onClick={submit}>
                {loading ? t('analyzing') : t('submitAndAnalyze')}
              </button>
            </div>
          </div>
        )}

        <p className="small muted mt" style={{ textAlign: 'center' }}>
          {t('haveAccount')} <a href="#/login">{t('loginBtn')}</a>
        </p>
      </Card>
      <a className="auth-back" href="#/">
        <span>{t('homeBack')}</span>
      </a>
    </div>
  )
}
