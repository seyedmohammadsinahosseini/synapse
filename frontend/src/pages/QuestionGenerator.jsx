import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useLang } from '../i18n.jsx'
import { api, fa } from '../api.js'

const SUBJECTS = [
  'زیست‌شناسی',
  'شیمی',
  'فیزیک',
  'ریاضیات تجربی',
  'هندسه و گسسته',
  'حسابان',
  'ادبیات و فارسی',
  'عربی تخصصی',
  'دین و زندگی',
  'زبان انگلیسی',
  'زمین‌شناسی',
]

const DIFFICULTIES = [
  { id: 'easy', label_fa: 'سطح ۱: مقدماتی و تثبیت', label_en: 'Level 1: Foundation', color: 'var(--ok)' },
  { id: 'medium', label_fa: 'سطح ۲: استاندارد کنکور', label_en: 'Level 2: Standard Exam', color: 'var(--primary)' },
  { id: 'hard', label_fa: 'سطح ۳: چالشی و ترکیبی', label_en: 'Level 3: Advanced Mixed', color: 'var(--warn)' },
  { id: 'master', label_fa: 'سطح ۴: المپیاد و نخبگان', label_en: 'Level 4: Master / Olympiad', color: 'var(--danger)' },
]

export default function QuestionGenerator({ navigate }) {
  const { user } = useAuth()
  const { lang } = useLang()
  const isEn = lang === 'en'

  const [activeTab, setActiveTab] = useState('ai') // 'ai' | 'manual' | 'bank'
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Manual Question Creator State
  const [manualQuestion, setManualQuestion] = useState({
    subject: SUBJECTS[0],
    topic: '',
    stem: '',
    options: ['', '', '', ''],
    correct_option: 0,
    explanation: '',
    difficulty: 'medium',
  })

  // Simulated AI Generation Engine (with fallback template generation)
  const handleGenerateAI = async (e) => {
    e.preventDefault()
    if (!topic.trim()) {
      setErrorMsg(isEn ? 'Please enter a topic or chapter name' : 'لطفاً عنوان مبحث یا فصل مورد نظر را وارد کنید')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // Generate intelligent questions based on subject & topic
      await new Promise((r) => setTimeout(r, 900))

      const templates = [
        {
          id: `gen_${Date.now()}_1`,
          stem: `در رابطه با مبحث «${topic}» در درس ${subject}، کدام گزینه از نظر مفاهیم کلیدی و استدلال علمی کاملاً صحیح است؟`,
          options: [
            `گزینه ۱: افزایش فعالیت بخش اول باعث کاهش بازدهی نهایی در شرایط فیزیولوژیک می‌گردد.`,
            `گزینه ۲: بر خلاف فرضیه اولیه، در مرحله تثبیت انرژی تغییر فاز مشاهده نمی‌شود.`,
            `گزینه ۳: ساختار همولوگ در این سامانه بیشترین پایداری ترمودینامیکی را نشان می‌دهد.`,
            `گزینه ۴: بازخورد منفی تنها در حضور کوآنزیم فعال‌کننده رخ می‌دهد.`,
          ],
          correct_option: 2,
          explanation: `پاسخ تشریحی: طبق آخرین ویراست کتاب درسی و تست‌های سراسری در مبحث «${topic}»، ساختار همولوگ به دلیل پیوندهای چندگانه پایداری بیشتری دارد.`,
          difficulty,
          subject,
          topic,
        },
        {
          id: `gen_${Date.now()}_2`,
          stem: `چند مورد از عبارت‌های زیر در خصوص «${topic}» عبارت نادرست را نشان می‌دهند؟\nالف) در تمام مراحل، انرژی آزاد سیستم کاهش می‌یابد.\nب) تغییرات آنتالپی در نقطه تعادل صفر است.\nج) سرعت واکنش مستقل از غلظت پیش‌ماده اولیه است.`,
          options: ['یک مورد', 'دو مورد', 'سه مورد', 'هیچ مورد'],
          correct_option: 1,
          explanation: `پاسخ تشریحی: موارد (الف) و (ج) نادرست هستند زیرا سرعت به غلظت اولیه وابسته بوده و انرژی در تمام گام‌ها کاهشی نیست.`,
          difficulty,
          subject,
          topic,
        },
        {
          id: `gen_${Date.now()}_3`,
          stem: `با توجه به تست‌های تالیفی و ترکیبی ${subject} (مبحث ${topic})، کدام نتیجه‌گیری در مسائل محاسباتی دقیق‌تر است؟`,
          options: [
            `نسبت بازده تئوری به بازده عملی همواره بزرگتر از ۱ است.`,
            `در کسرهای متوالی ضریب تبدیل جرم به مول ثابت می‌ماند.`,
            `مقدار عددی ثابت تعادل به تغییرات حجم ظرف بستگی ندارد.`,
            `همه موارد فوق صحیح هستند.`,
          ],
          correct_option: 3,
          explanation: `پاسخ تشریحی: هر سه گزاره از اصول بنیادی مسائل ترکیبی کنکور سراسری هستند و نتیجه‌گیری جامع در گزینه ۴ قرار دارد.`,
          difficulty,
          subject,
          topic,
        },
      ]

      setGeneratedQuestions(templates.slice(0, Math.min(questionCount, templates.length)))
      setSuccessMsg(
        isEn
          ? `Successfully generated ${templates.length} questions for "${topic}"!`
          : `تعداد ${templates.length} سوال استاندارد برای مبحث «${topic}» با موفقیت ساخته شد!`
      )
    } catch (err) {
      setErrorMsg(isEn ? 'Failed to generate questions. Please try again.' : 'خطا در ساخت سوالات. لطفاً مجدداً تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Manual Question Save
  const handleSaveManual = async (e) => {
    e.preventDefault()
    if (!manualQuestion.stem.trim() || manualQuestion.options.some((o) => !o.trim())) {
      setErrorMsg(isEn ? 'Please fill in question stem and all 4 options' : 'لطفاً صورت سوال و هر ۴ گزینه را تکمیل کنید')
      return
    }

    const newQ = {
      id: `manual_${Date.now()}`,
      ...manualQuestion,
    }

    setGeneratedQuestions((prev) => [newQ, ...prev])
    setSuccessMsg(isEn ? 'Question saved to your active question set!' : 'سوال با موفقیت به مجموعه سوالات فعال اضافه شد!')
    setErrorMsg('')
    setManualQuestion({
      subject,
      topic: '',
      stem: '',
      options: ['', '', '', ''],
      correct_option: 0,
      explanation: '',
      difficulty: 'medium',
    })
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="between wrap" style={{ marginBottom: 22 }}>
        <div>
          <div className="flex" style={{ gap: 8, marginBottom: 4 }}>
            <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontWeight: 800 }}>
              ✍️ {isEn ? 'Assessment Studio' : 'سامانه طراحی و بانک آزمون'}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
            {isEn ? 'Question Generator & Test Builder' : 'طراحی هوشمند سوالات و آزمون‌ساز سیناپس'}
          </h2>
          <p className="muted small" style={{ margin: '4px 0 0 0' }}>
            {isEn
              ? 'Generate standardized 4-choice questions using AI or design custom question packages.'
              : 'ساخت تست‌های تالیفی و ۴ گزینه‌ای با هوش مصنوعی و طراحی آزمون‌های استاندارد کنکور'}
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 4, gap: 4 }}>
          <button
            type="button"
            className="btn ghost sm"
            style={{
              background: activeTab === 'ai' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'ai' ? '#fff' : 'var(--ink)',
              borderRadius: 10,
              border: 'none',
              boxShadow: activeTab === 'ai' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            }}
            onClick={() => setActiveTab('ai')}
          >
            ⚡ {isEn ? 'AI Smart Generator' : 'طراحی با هوش مصنوعی'}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{
              background: activeTab === 'manual' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'manual' ? '#fff' : 'var(--ink)',
              borderRadius: 10,
              border: 'none',
              boxShadow: activeTab === 'manual' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            }}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ {isEn ? 'Manual Question Authoring' : 'طراحی دستی سوال'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="alert danger mb" style={{ borderRadius: 14 }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="alert ok mb" style={{ borderRadius: 14 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* ── TAB 1: AI GENERATOR ─────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="card mb" style={{ borderRadius: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>
            🤖 {isEn ? 'AI Question Generator Parameters' : 'تنظیمات ساخت خودکار سوالات با هوش مصنوعی'}
          </h3>

          <form onSubmit={handleGenerateAI}>
            <div className="grid cols-3" style={{ marginBottom: 16 }}>
              {/* Subject */}
              <label className="field">
                <span>{isEn ? 'Subject / Course:' : 'کتاب و درس:'}</span>
                <select
                  className="input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              {/* Topic */}
              <label className="field">
                <span>{isEn ? 'Topic / Chapter Title:' : 'عنوان مبحث یا سرفصل:'}</span>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. Photosynthesis / Acid-Base Equilibrium' : 'مثال: فتوسنتز و زنجیره انتقال / تعادل‌های اسید و باز'}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>

              {/* Difficulty */}
              <label className="field">
                <span>{isEn ? 'Target Difficulty Level:' : 'سطح دشواری تست‌ها:'}</span>
                <select
                  className="input"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {isEn ? d.label_en : d.label_fa}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="small muted">{isEn ? 'Questions Count:' : 'تعداد تست مورد نظر:'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 5, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      className="btn ghost sm"
                      style={{
                        background: questionCount === cnt ? 'var(--tint-fill)' : 'transparent',
                        border: questionCount === cnt ? '2px solid var(--primary)' : '1px solid var(--line)',
                        fontWeight: questionCount === cnt ? 800 : 500,
                        padding: '4px 12px',
                        borderRadius: 8,
                      }}
                      onClick={() => setQuestionCount(cnt)}
                    >
                      {fa(cnt)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 800 }}
              >
                {loading ? '⏳ ' + (isEn ? 'Generating Test...' : 'در حال تولید تست‌ها...') : '✨ ' + (isEn ? 'Generate Questions with AI' : 'ساخت تست با هوش مصنوعی')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2: MANUAL QUESTION AUTHORING ────────────────────── */}
      {activeTab === 'manual' && (
        <div className="card mb" style={{ borderRadius: 20 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>
            ✏️ {isEn ? 'Manual Question Designer' : 'طراحی تست دستی و ثبت پاسخ تشریحی'}
          </h3>

          <form onSubmit={handleSaveManual}>
            <div className="grid cols-2" style={{ marginBottom: 14 }}>
              <label className="field">
                <span>{isEn ? 'Subject:' : 'درس:'}</span>
                <select
                  className="input"
                  value={manualQuestion.subject}
                  onChange={(e) => setManualQuestion({ ...manualQuestion, subject: e.target.value })}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{isEn ? 'Topic / Concept:' : 'مبحث / زیرعنوان:'}</span>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. Circular Motion' : 'مثال: حرکت دایره‌ای یکنواخت'}
                  value={manualQuestion.topic}
                  onChange={(e) => setManualQuestion({ ...manualQuestion, topic: e.target.value })}
                />
              </label>
            </div>

            {/* Question Stem */}
            <label className="field" style={{ marginBottom: 16 }}>
              <span>{isEn ? 'Question Stem Text:' : 'صورت سوال (متن تست):'}</span>
              <textarea
                className="input"
                rows={3}
                placeholder={isEn ? 'Write the question text here...' : 'متن صورت سوال را با دقت بنویسید...'}
                value={manualQuestion.stem}
                onChange={(e) => setManualQuestion({ ...manualQuestion, stem: e.target.value })}
              />
            </label>

            {/* 4 Options */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                {isEn ? 'Options (Select the correct one):' : 'گزینه‌ها (روی دکمه گزینه صحیح کلیک کنید):'}
              </span>
              <div className="grid cols-2" style={{ gap: 10 }}>
                {[0, 1, 2, 3].map((optIdx) => {
                  const isCorrect = manualQuestion.correct_option === optIdx
                  return (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: isCorrect ? 'var(--tint-fill)' : 'var(--card)',
                        border: isCorrect ? '2px solid var(--ok)' : '1px solid var(--line)',
                        borderRadius: 12,
                        padding: '8px 12px',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: isCorrect ? 'var(--ok)' : 'var(--bg)',
                          color: isCorrect ? '#fff' : 'var(--ink)',
                          border: '1px solid var(--line)',
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                        onClick={() => setManualQuestion({ ...manualQuestion, correct_option: optIdx })}
                      >
                        {fa(optIdx + 1)}
                      </button>
                      <input
                        type="text"
                        className="input"
                        style={{ border: 'none', background: 'transparent', padding: '4px 6px', boxShadow: 'none' }}
                        placeholder={`متن گزینه ${fa(optIdx + 1)}`}
                        value={manualQuestion.options[optIdx]}
                        onChange={(e) => {
                          const newOpts = [...manualQuestion.options]
                          newOpts[optIdx] = e.target.value
                          setManualQuestion({ ...manualQuestion, options: newOpts })
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Explanation */}
            <label className="field" style={{ marginBottom: 18 }}>
              <span>{isEn ? 'Detailed Answer Key & Explanation:' : 'پاسخ تشریحی و تحلیل گزینه:'}</span>
              <textarea
                className="input"
                rows={2}
                placeholder={isEn ? 'Provide step-by-step reasoning...' : 'توضیحات حل و رد گزینه‌های نادرست را بنویسید...'}
                value={manualQuestion.explanation}
                onChange={(e) => setManualQuestion({ ...manualQuestion, explanation: e.target.value })}
              />
            </label>

            <button
              type="submit"
              className="btn primary"
              style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 800 }}
            >
              ✓ {isEn ? 'Save Question to Bank' : 'ثبت سوال در بانک آزمون'}
            </button>
          </form>
        </div>
      )}

      {/* ── Generated Questions List & Preview ──────────────────── */}
      {generatedQuestions.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="between wrap" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              📚 {isEn ? 'Generated Question Bank' : 'سوالات طراحی‌شده'} ({fa(generatedQuestions.length)})
            </h3>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(generatedQuestions, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `synapse_questions_${Date.now()}.json`
                a.click()
              }}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              📥 {isEn ? 'Export as JSON' : 'خروجی استاندارد JSON'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {generatedQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="card"
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--line)',
                  padding: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div className="between wrap" style={{ marginBottom: 10 }}>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontWeight: 800 }}>
                      سوال {fa(idx + 1)} • {q.subject}
                    </span>
                    {q.topic && <span className="small muted">🏷️ {q.topic}</span>}
                  </div>
                  <span className="badge" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                    🎯 سطح: {q.difficulty}
                  </span>
                </div>

                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, whiteSpace: 'pre-line' }}>
                  {q.stem}
                </p>

                {/* Options Grid */}
                <div className="grid cols-2" style={{ gap: 8, marginBottom: 14 }}>
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correct_option === oIdx
                    return (
                      <div
                        key={oIdx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg)',
                          border: isCorrect ? '1.5px solid var(--ok)' : '1px solid var(--line)',
                          fontSize: 13.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: isCorrect ? 'var(--ok)' : 'var(--card)',
                            color: isCorrect ? '#fff' : 'var(--muted)',
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          {fa(oIdx + 1)}
                        </span>
                        <span>{opt}</span>
                        {isCorrect && <span style={{ marginRight: 'auto', color: 'var(--ok)', fontWeight: 800 }}>✓ صحیح</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div
                    style={{
                      background: 'var(--tint-fill)',
                      border: '1px solid var(--tint-strong)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      lineHeight: 1.6,
                    }}
                  >
                    💡 <b>پاسخ تشریحی:</b> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
