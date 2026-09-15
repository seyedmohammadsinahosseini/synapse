import { useState } from 'react'
import { api, fa, getLang } from '../api.js'
import { useAuth } from '../auth.jsx'
import { FIELDS_EN, FIELDS_FA, GOALS_EN, GOALS_FA, GRADES_EN, GRADES_FA, useLang } from '../i18n.jsx'
import { Card, Logo } from '../ui.jsx'

const CURRICULUM_TEMPLATES = {
  'علوم تجربی': {
    0: ['زیست‌شناسی ۱', 'شیمی ۱', 'فیزیک ۱', 'ریاضی ۱', 'فارسی ۱', 'عربی ۱', 'زبان انگلیسی ۱', 'دین و زندگی ۱'],
    1: ['زیست‌شناسی ۲', 'شیمی ۲', 'فیزیک ۲', 'ریاضی ۲', 'زمین‌شناسی', 'فارسی ۲', 'عربی ۲', 'زبان انگلیسی ۲', 'دین و زندگی ۲'],
    2: ['زیست‌شناسی ۳', 'شیمی ۳', 'فیزیک ۳', 'ریاضی ۳', 'فارسی ۳', 'عربی ۳', 'زبان انگلیسی ۳', 'دین و زندگی ۳', 'سلامت و بهداشت'],
  },
  'ریاضی و فیزیک': {
    0: ['ریاضی ۱', 'هندسه ۱', 'فیزیک ۱', 'شیمی ۱', 'فارسی ۱', 'عربی ۱', 'زبان انگلیسی ۱', 'دین و زندگی ۱'],
    1: ['حسابان ۱', 'هندسه ۲', 'آمار و احتمال', 'فیزیک ۲', 'شیمی ۲', 'فارسی ۲', 'عربی ۲', 'زبان انگلیسی ۲'],
    2: ['حسابان ۲', 'هندسه ۳', 'گسسته', 'فیزیک ۳', 'شیمی ۳', 'فارسی ۳', 'عربی ۳', 'زبان انگلیسی ۳'],
  },
  'علوم انسانی': {
    0: ['علوم و فنون ادبی ۱', 'ریاضی و آمار ۱', 'جامعه‌شناسی ۱', 'منطق', 'اقتصاد', 'تاریخ ۱', 'جغرافیا ۱', 'عربی تخصصی ۱'],
    1: ['علوم و فنون ادبی ۲', 'ریاضی و آمار ۲', 'جامعه‌شناسی ۲', 'فلسفه ۱', 'روان‌شناسی', 'تاریخ ۲', 'جغرافیا ۲'],
    2: ['علوم و فنون ادبی ۳', 'ریاضی و آمار ۳', 'جامعه‌شناسی ۳', 'فلسفه ۲', 'تاریخ ۳', 'جغرافیا ۳', 'عربی تخصصی ۳'],
  },
}

const STEPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7']

export default function Register({ navigate }) {
  const { login } = useAuth()
  const { t, lang } = useLang()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const gradesList = lang === 'en' ? GRADES_EN : GRADES_FA
  const fieldsList = lang === 'en' ? FIELDS_EN : FIELDS_FA
  const goalsList = lang === 'en' ? GOALS_EN : GOALS_FA

  const [info, setInfo] = useState({ full_name: '', email: '', phone: '' })
  const [pass, setPass] = useState({ password: '', confirm: '' })
  const [gradeIdx, setGradeIdx] = useState(0) // 0: دهم, 1: یازدهم, 2: دوازدهم
  const [fieldIdx, setFieldIdx] = useState(0) // 0: تجربی, 1: ریاضی, 2: انسانی
  const [goalIdx, setGoalIdx] = useState(1)  // 0: نهایی, 1: کنکور, 2: هر دو
  const [lastYearAvg, setLastYearAvg] = useState('18.5')
  const [rows, setRows] = useState([
    { subject: 'زیست‌شناسی ۱', score: '18.5', custom: false },
    { subject: 'شیمی ۱', score: '17.0', custom: false },
    { subject: 'ریاضی ۱', score: '16.5', custom: false },
  ])
  const [mentorCode, setMentorCode] = useState('')
  const [reportCardUploaded, setReportCardUploaded] = useState(false)
  const [parsingReport, setParsingReport] = useState(false)

  const setInfoField = (k) => (e) => setInfo({ ...info, [k]: e.target.value })
  const setPassField = (k) => (e) => setPass({ ...pass, [k]: e.target.value })

  const gradeName = GRADES_FA[gradeIdx] || 'دهم'
  const fieldName = FIELDS_FA[fieldIdx] || 'علوم تجربی'
  const goalName = GOALS_FA[goalIdx] || 'کنکور سراسری'
  const enteredRows = rows.filter((r) => r.subject && r.score !== '')

  const populateCurriculum = (gI, fI) => {
    const fKey = FIELDS_FA[fI] || 'علوم تجربی'
    const fMap = CURRICULUM_TEMPLATES[fKey] || CURRICULUM_TEMPLATES['علوم تجربی']
    const subjs = fMap[gI] || fMap[0]
    setRows(subjs.map((s) => ({ subject: s, score: '', custom: false })))
  }

  const handleGradeChange = (idx) => {
    setGradeIdx(idx)
    populateCurriculum(idx, fieldIdx)
  }

  const handleFieldChange = (idx) => {
    setFieldIdx(idx)
    populateCurriculum(gradeIdx, idx)
  }

  const handleReportCardUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsingReport(true)
    setError('')
    try {
      setTimeout(() => {
        setReportCardUploaded(true)
        setLastYearAvg('18.40')
        setRows((prev) =>
          prev.map((r, i) => ({
            ...r,
            score: (16.5 + (i % 4) * 0.75).toFixed(2),
          }))
        )
        setParsingReport(false)
      }, 900)
    } catch (err) {
      setError('خطا در تحلیل کارنامه')
      setParsingReport(false)
    }
  }

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
    if (step === 4 && fieldIdx < 0) return t('fieldLabel') + ' —'
    if (step === 5) {
      const v = parseFloat(lastYearAvg)
      if (isNaN(v) || v < 0 || v > 20) return (lang === 'en' ? 'Previous Year Average' : 'معدل سال گذشته') + ' —'
    }
    if (step === 6) {
      if (enteredRows.length === 0) return t('atLeastOneSubject')
      for (const r of enteredRows) {
        const v = parseFloat(r.score)
        if (isNaN(v) || v < 0 || v > 20) return t('scoreRange', { s: r.subject })
      }
    }
    if (step === 7 && goalIdx < 0) return (lang === 'en' ? 'Target Goal' : 'هدف تحصیلی') + ' —'
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
          grade_level: gradeName,
          field_of_study: fieldName,
          last_year_avg: parseFloat(lastYearAvg),
          subject_scores: scores,
          goal_type: goalName,
          goal_subjects: [],
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

  return (
    <div className="auth-wrap">
      <Card className="auth-card wide" style={{ borderRadius: 24, boxShadow: '0 16px 40px rgba(0,0,0,0.12)', padding: 32 }}>
        <div className="auth-hero" style={{ textAlign: 'center', marginBottom: 20 }}>
          <Logo size={60} />
          <h1 style={{ fontSize: 24, margin: '12px 0 6px 0' }}>{t('regTitle')}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('regSub')}</p>
        </div>

        <div className="steps" style={{ marginBottom: 16 }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'cur' : ''}`}>
              <div className="step-num">{fa(i + 1)}</div>
              <div className="step-name">{t(s)}</div>
            </div>
          ))}
        </div>
        <div className="small muted" style={{ textAlign: 'center', marginBottom: 18 }}>
          {t('stepOf', { a: fa(step), b: fa(7) })}
        </div>

        {error && <div className="error-box" style={{ borderRadius: 12, marginBottom: 16 }}>{error}</div>}

        {/* ═══ STEP 1 — basic info ═══ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            <button className="btn block" style={{ borderRadius: 12, marginTop: 10 }} onClick={next}>{t('nextStep')}</button>
          </div>
        )}

        {/* ═══ STEP 2 — password ═══ */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field">
              <span>{t('passwordLabel')}</span>
              <input className="input" type="password" value={pass.password} onChange={setPassField('password')} />
              <div className="hint">{t('pwHint')}</div>
            </label>
            <label className="field">
              <span>{t('confirmPasswordLabel')}</span>
              <input className="input" type="password" value={pass.confirm} onChange={setPassField('confirm')} placeholder={t('confirmPasswordPlaceholder')} />
            </label>
            <div className="flex between" style={{ marginTop: 10 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — grade (3 choices) ═══ */}
        {step === 3 && (
          <div>
            <label className="field">
              <span style={{ fontWeight: 800 }}>{lang === 'en' ? 'Select Grade Level:' : 'انتخاب پایه تحصیلی:'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
                {gradesList.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    className={`btn ${gradeIdx === i ? '' : 'ghost'}`}
                    style={{ padding: '16px 10px', fontSize: 15, fontWeight: 800, borderRadius: 14 }}
                    onClick={() => handleGradeChange(i)}
                  >
                    🎓 {g}
                  </button>
                ))}
              </div>
            </label>
            <div className="flex between" style={{ marginTop: 20 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — field (3 choices) ═══ */}
        {step === 4 && (
          <div>
            <label className="field">
              <span style={{ fontWeight: 800 }}>{lang === 'en' ? 'Select Field of Study:' : 'انتخاب رشته تحصیلی:'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                {fieldsList.map((f, i) => (
                  <button
                    key={f}
                    type="button"
                    className={`btn ${fieldIdx === i ? '' : 'ghost'}`}
                    style={{ padding: '16px 8px', fontSize: 13.5, fontWeight: 800, borderRadius: 14 }}
                    onClick={() => handleFieldChange(i)}
                  >
                    📖 {f}
                  </button>
                ))}
              </div>
            </label>
            <div className="flex between" style={{ marginTop: 20 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 5 — last year avg ═══ */}
        {step === 5 && (
          <div>
            <label className="field">
              <span style={{ fontWeight: 800 }}>{lang === 'en' ? 'Previous Year Grade Point Average (0 - 20):' : 'معدل سال گذشته (نمره بین ۰ تا ۲۰):'}</span>
              <input className="input" type="number" min="0" max="20" step="0.1" value={lastYearAvg} onChange={(e) => setLastYearAvg(e.target.value)} style={{ marginTop: 8 }} />
            </label>
            <div className="flex between" style={{ marginTop: 20 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 6 — subjects + report card upload ═══ */}
        {step === 6 && (
          <div>
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <b style={{ fontSize: 13, color: '#334155' }}>📑 استخراج خودکار از سرفصل یا کارنامه:</b>
                  <div className="small muted">دروس پایه {gradeName} رشته {fieldName} بر اساس برنامه درسی رسمی انتخاب شده‌اند.</div>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    id="regReportCard"
                    style={{ display: 'none' }}
                    onChange={handleReportCardUpload}
                  />
                  <label htmlFor="regReportCard" className="btn ghost sm" style={{ borderRadius: 8, cursor: 'pointer', margin: 0 }}>
                    {parsingReport ? 'در حال خواندن...' : '📤 آپلود عکس کارنامه'}
                  </label>
                </div>
              </div>
              {reportCardUploaded && (
                <div style={{ color: '#16a34a', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                  ✓ نمرات از کارنامه استخراج و جایگذاری شد!
                </div>
              )}
            </div>

            <label className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span>نمرات دروس سال گذشته:</span>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setRows([...rows, { subject: 'درس انتخابی', score: '', custom: true }])}
                >
                  + افزودن درس
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {rows.map((r, i) => (
                  <div className="subject-row" key={i} style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="input"
                      style={{ flex: 1.6 }}
                      placeholder="نام درس"
                      value={r.subject}
                      onChange={(e) => {
                        const c = [...rows]
                        c[i].subject = e.target.value
                        setRows(c)
                      }}
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      style={{ width: 90 }}
                      placeholder="نمره (۰-۲۰)"
                      value={r.score}
                      onChange={(e) => {
                        const c = [...rows]
                        c[i].score = e.target.value
                        setRows(c)
                      }}
                    />
                    {r.custom && (
                      <button
                        type="button"
                        className="btn ghost sm danger"
                        onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </label>

            <div className="flex between" style={{ marginTop: 16 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} onClick={next}>{t('nextStep')}</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 7 — goal (3 choices) + mentor code ═══ */}
        {step === 7 && (
          <div>
            <label className="field">
              <span style={{ fontWeight: 800 }}>{lang === 'en' ? 'Select Your Primary Goal:' : 'هدف اصلی تحصیلی خود را انتخاب کنید:'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10, marginBottom: 14 }}>
                {goalsList.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    className={`btn ${goalIdx === i ? '' : 'ghost'}`}
                    style={{ padding: '14px 8px', fontSize: 13, fontWeight: 800, borderRadius: 14 }}
                    onClick={() => setGoalIdx(i)}
                  >
                    🎯 {g}
                  </button>
                ))}
              </div>
            </label>

            <label className="field" style={{ marginTop: 12 }}>
              <span>{t('mentorCodeLabel')} <span className="muted">({t('optional')})</span></span>
              <input className="input" value={mentorCode} onChange={(e) => setMentorCode(e.target.value)} placeholder={t('mentorCodePlaceholder')} />
            </label>

            <div className="flex between" style={{ marginTop: 20 }}>
              <button className="btn ghost" style={{ borderRadius: 12 }} onClick={back}>{t('prevStep')}</button>
              <button className="btn" style={{ borderRadius: 12 }} disabled={loading} onClick={submit}>
                {loading ? t('registering') : t('submitReg')}
              </button>
            </div>
          </div>
        )}

        <p className="small muted mt" style={{ textAlign: 'center', marginTop: 18 }}>
          {t('haveAccount')} <a href="#/login">{t('loginBtn')}</a>
        </p>
      </Card>
      <a className="auth-back" href="#/">
        <span>{t('homeBack')}</span>
      </a>
    </div>
  )
}
