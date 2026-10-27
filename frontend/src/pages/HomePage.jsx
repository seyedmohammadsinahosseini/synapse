import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n.jsx'
import { useTheme } from '../theme.jsx'
import { fa } from '../api.js'

/* ═══════════════════════════════════════════════════════════════════
   Home / landing page for guests — an immersive showcase featuring:
   1. Soft animated glowing aurora background
   2. Interactive Sandbox Study Planner & AI Assistant
   3. Live Pomodoro & Ambient Audio Soundscape Demo
   4. Live Leitner 3D Flashcard Spaced Repetition Box
   5. Live Theme & Skin Switcher Showcase (Liquid, Cyber, Modern, Warm)
   6. Real-time Animated Statistics
   ═══════════════════════════════════════════════════════════════════ */

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── reveal-on-scroll (adds .hp-in) ─────────────────────────────── */
export function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = root.querySelectorAll('.hp-rv')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('hp-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('hp-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ── counter that counts up when it becomes visible ─────────────── */
function Counter({ value, suffix = '', lang }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  const fmt = (v) => (lang === 'fa' ? fa(Math.round(v)) : Math.round(v).toLocaleString('en-US'))
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) { setN(value); return }
    let raf = 0
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const dur = 1600
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur)
        const e = 1 - Math.pow(2, -10 * p) // easeOutExpo
        setN(value * e)
        if (p < 1) raf = requestAnimationFrame(tick)
        else setN(value)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value])
  return (
    <span className="hp-count" ref={ref}>
      {fmt(n)}
      {suffix}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   CONTENT (fa / en)
   ═══════════════════════════════════════════════════════════════════ */
const CONTENT = {
  fa: {
    h1a: 'برنامه‌ریزی، آزمون و مربیِ تو،',
    h1b: 'در یک پلتفرم هوشمند',
    sub: 'سیناپس (Synapse): پلتفرم هوشمند تحصیلی و مشاوره؛ برنامهٔ مطالعاتی هفتگیِ شخصی‌سازی‌شده با هوش مصنوعی، آزمون آنلاین با تصحیح خودکار، جعبه لایتنر هوشمند، تایمر تمرکز عمیق با صداهای آرامش‌بخش، تحلیل جامع کارنامه و همراهیِ واقعی مشاور — از اولین گام تا رتبه برتر.',
    cta1: 'شروع رایگان و ورود به پنل',
    cta2: 'ورود به حساب کاربری',
    trust: ['بدون نیاز به کارت بانکی', 'فعال‌سازی آنی و رایگان', 'ویژه کنکور سراسری، نهایی و مدرسه'],
    featuresTitle: 'چرا دانش‌آموزها و مشاوران برتر، سیناپس را انتخاب می‌کنند؟',
    featuresSub: 'همهٔ ابزارهای لازم برای مطالعهٔ رتبه‌ساز، کنار هم و هماهنگ با هم.',
    features: [
      { i: '🧭', t: 'برنامهٔ هفتگیِ شخصی‌سازی‌شده', d: 'بر اساس رشته، پایه، معدل و هدفت؛ برنامهٔ هر روز را با پارت‌بندی دقیق و چک‌لیست کاری آماده می‌گیری.' },
      { i: '⏱️', t: 'تمرکز عمیق و صوت‌های آرامش', d: 'تایمر پومودورو مجهز به موتور صوتی باران، امواج اقیانوس، نویز سفید و امواج آلفا ۴۳۲ هرتز برای جلوگیری از حواس‌پرتی.' },
      { i: '🗂️', t: 'جعبه لایتنر ۳بعدی فاصله‌دار', d: 'انتقال فرمول‌های فیزیک/ریاضی، لغات زبان و نکات ترکیبی زیست به حافظه بلندمدت با الگوریتم علمی لایتنر ۵ مرحله‌ای.' },
      { i: '📝', t: 'آزمون آنلاین و تحلیل تراز', d: 'آزمون‌های تستی و تشریحی با تصحیح خودکار، تحلیل کارنامه‌های قلم‌چی و خیلی‌سبز و صدور پروندهٔ عملکرد PDF.' },
      { i: '🤖', t: 'دستیار مشاور هوش مصنوعی', d: 'هر سؤالی داری بپرس؛ تست اختصاصی بساز، رفع اشکال کن، برنامه بخواه یا تحلیل کارنامه بگیر — ۲۴ ساعته در کنارت.' },
      { i: '🎨', t: 'استودیو تم و پوسته‌های مدرن', d: 'شخصی‌سازی کامل ظاهر پنل با پوسته‌های شیشه‌ای اکریلیک (Liquid Glass)، دارک نئونی (Cyber) و کاغذی آرام‌بخش (Warm Paper).' },
    ],
    howTitle: 'در ۴ قدم ساده، مسیر رتبه برتر شدن را آغاز کن',
    howSub: 'نه پیچیدگی، نه سردرگمی — از روز اول نقشه راهت کاملاً روشن است.',
    how: [
      { i: '۱', t: 'ثبت‌نام و تعیین هدف', d: 'رشته، پایه، معدل و رتبه هدفت را در کمتر از ۱ دقیقه وارد می‌کنی.' },
      { i: '۲', t: 'دریافت برنامه هوشمند', d: 'هوش مصنوعی سیناپس برنامهٔ پارت‌بندی شده و چک‌لیست روزانه‌ات را متناسب با زمانت می‌چیند.' },
      { i: '۳', t: 'مطالعه متمرکز و لایتنر', d: 'با تایمر پومودورو، صوت‌های تمرکز و جعبه لایتنر با حداکثر بازدهی درس می‌خوانی.' },
      { i: '۴', t: 'آزمون و ارتقای تراز با مشاور', d: 'آزمون می‌دهی، نقاط ضعفت را با هوش مصنوعی و مربی تحلیل می‌کنی و هر هفته ترازت را بالا می‌بری.' },
    ],
    rolesTitle: 'یک پلتفرم یکپارچه برای دانش‌آموز، مشاور و مدیر مدرسه',
    rolesSub: 'هرکس ابزارِ حرفه‌ای خودش را دارد؛ ولی همه روی یک بستر داده هماهنگ و زنده کار می‌کنند.',
    roleStudent: {
      tag: 'برای دانش‌آموز',
      title: 'داشبورد متمرکز و هوشمند دانش‌آموز',
      bullets: [
        'برنامهٔ مطالعاتی روزانه و هفتگی با تیک انجام و ثبت ساعت',
        'تایمر تمرکز پومودورو با ۵ حالت صوت محیطی و امواج آلفا',
        'جعبه لایتنر ۳بعدی برای لغات، فرمول‌ها و نکات طلایی',
        'سامانه آزمون تستی استاندارد با کارنامه تراز و پاسخ تشریحی',
        'چت ۲۴ ساعته با هوش مصنوعی مشاور و مشاور واقعی تخصصی',
      ],
    },
    roleMentor: {
      tag: 'برای مشاور و مربی',
      title: 'پنل نظارت، تحلیل و هدایت تحصیلی',
      bullets: [
        'مشاهده لحظه‌ای گزارش مطالعه و درصد انجام برنامهٔ هر دانش‌آموز',
        'ارسال و اصلاح اختصاصی برنامهٔ مطالعاتی هفتگی',
        'تقویم جلسات مشاوره آنلاین و ثبت تکالیف و نکات هدایتی',
        'تحلیل آماری کارنامه‌ها و نمودار پیشرفت تراز دانش‌آموزان',
      ],
    },
    roleAdmin: {
      tag: 'برای مدیر مدرسه و موسسه',
      title: 'مدیریت بانک تست و نظارت جامع',
      bullets: [
        'تولید هوشمند تست‌های کنکور با هوش مصنوعی و ورود دسته‌ای JSON/Excel',
        'سرفصل‌بندی درسی جامع با بانک سوالات تستی و کلید پاسخ',
        'گزارش‌گیری سازمانی و پیام‌رسانی به دانش‌آموزان و مربیان',
      ],
    },
    stats: [
      { v: 18500, s: '+', l: 'ساعت مطالعه عمیق ثبت‌شده' },
      { v: 4200, s: '+', l: 'تست کنکور با تحلیل هوشمند' },
      { v: 98, s: '٪', l: 'رضایت دانش‌آموزان و مشاوران' },
      { v: 24, s: '/۷', l: 'پاسخ‌گویی دستیار هوش مصنوعی' },
    ],
    aiTag: 'دستیار مشاور هوشمند سیناپس',
    aiTitle: 'در هر ساعتی از شبانه‌روز، مشاور شخصی‌ات پاسخ می‌دهد',
    aiSub: 'نیاز به تست شبیه‌ساز داری؟ مبحثی را متوجه نشدی؟ کارنامه‌ات افت کرده؟ هوش مصنوعی سیناپس راهکار اختصاصی به تو می‌دهد.',
    aiChips: ['🧪 تست زیست دوازدهم', '📐 فرمول‌های فیزیک حرکت', '📉 راهکار افزایش تراز شیمی', '⏰ برنامه فشرده ۲ هفته‌ای'],
    aiTurns: [
      {
        q: 'من در فصل ژنتیک زیست دوازدهم درصد آزمونم پایینه، چطور بخونم؟',
        a: 'تحلیل داده‌های کارنامه‌ات نشون میده در سوالات ترکیبی شجره‌نامه زمان کم میاری. پیشنهاد من: ۳ پارت ۲۵ دقیقه‌ای حل تست طبقه‌بندی شده همراه با مرور نکات کلیدی در جعبه لایتنر سیناپس. برنامه‌اش رو برات به چک‌لیست امروز اضافه کنم؟',
      },
      {
        q: 'یک آزمون ۵ سوالی از مبحث دینامیک فیزیک برام بساز.',
        a: 'آزمون اختصاصی دینامیک (نیروهای اصطکاک و تکانه) ساخته شد. درجه سختی: متوسط به بالا؛ به همراه پاسخ‌نامه فوق‌تشریحی و نکات رد گزینه آماده برگزاری در پنل آزمون است.',
      },
    ],
    ctaTitle: 'همین امروز مطالعهٔ حرفه‌ای و رتبه‌ساز را آغاز کن',
    ctaSub: 'عضو جمع دانش‌آموزان و مشاوران پیشتاز سیناپس شو و مسیر موفقیت در کنکور و امتحانات را با جدیدترین تکنولوژی طی کن.',
    ctaBtn: 'ایجاد حساب کاربری رایگان',
    ctaBtn2: 'ورود به پنل کاربری',
    ctaNote: 'رایگان · بدون نیاز به نصب · قابل استفاده در موبایل و لپ‌تاپ',
  },
  en: {
    h1a: 'Your Study Plan, Mock Exams & Mentor,',
    h1b: 'In One Intelligent Platform',
    sub: 'Synapse: The next-generation academic & coaching ecosystem. AI-personalized weekly study schedules, automatic exam grading, 3D Leitner box, deep work Pomodoro with ambient soundscapes, comprehensive report cards, and real mentor supervision.',
    cta1: 'Get Started for Free',
    cta2: 'Sign In to Account',
    trust: ['No credit card required', 'Instant activation', 'For Entrance Exams & High School'],
    featuresTitle: 'Why Top Students & Mentors Choose Synapse',
    featuresSub: 'All essential study tools harmonized in one seamless platform.',
    features: [
      { i: '🧭', t: 'Personalized Study Plans', d: 'AI generates daily task checklists tailored to your grade, field, and target rank.' },
      { i: '⏱️', t: 'Focus Timer & Ambients', d: 'Embedded soundscape player with gentle rain, ocean waves, white noise, and 432Hz alpha beats.' },
      { i: '🗂️', t: '3D Leitner Spaced Repetition', d: 'Transfer formulas and vocabulary into permanent long-term memory with 5-box scientific intervals.' },
      { i: '📝', t: 'Online Exams & Percentiles', d: 'Auto-graded tests, report card analyzer, and downloadable performance PDF dossiers.' },
      { i: '🤖', t: '24/7 AI Academic Assistant', d: 'Ask anything, create custom diagnostic exams, debug concepts, and analyze weak spots anytime.' },
      { i: '🎨', t: 'Appearance Studio & Skins', d: 'Switch between Liquid Glass, Obsidian Cyber Midnight, Warm Paper, and vibrant accent colors.' },
    ],
    howTitle: 'Start in 4 Simple Steps',
    howSub: 'No confusion, no guesswork — your roadmap is clear from day one.',
    how: [
      { i: '1', t: 'Sign Up & Set Target', d: 'Enter your grade, field of study, and goal in less than a minute.' },
      { i: '2', t: 'Get Intelligent Plan', d: 'AI schedules study blocks and daily checklists fitting your weekly routine.' },
      { i: '3', t: 'Deep Work & Leitner Review', d: 'Study distraction-free with focus ambient sounds and 3D flashcards.' },
      { i: '4', t: 'Exams & Mentor Coaching', d: 'Take mock tests, analyze weaknesses with AI and mentor, and climb the ranks.' },
    ],
    rolesTitle: 'One Unified Platform for Students, Mentors & Admins',
    rolesSub: 'Each role gets a purpose-built workspace operating on a live shared data pipeline.',
    roleStudent: {
      tag: 'For Students',
      title: 'Smart Student Workspace',
      bullets: [
        'Daily and weekly study schedule with checkboxes and time tracker',
        'Deep work Pomodoro timer with 5 ambient soundscapes and alpha beats',
        '3D Leitner flashcard box for vocabulary and formula retention',
        'Diagnostic online testing with detailed percentiles and answer keys',
        '24/7 AI academic assistant and direct mentor messaging',
      ],
    },
    roleMentor: {
      tag: 'For Mentors',
      title: 'Mentorship & Supervision Panel',
      bullets: [
        'Real-time student progress tracking and task completion metrics',
        'Create and customize weekly study plans for individual students',
        '1-on-1 consultation scheduling calendar and task directives',
        'Statistical report card analytics and performance trend charts',
      ],
    },
    roleAdmin: {
      tag: 'For School & Admin',
      title: 'Curriculum & Question Bank Engine',
      bullets: [
        'AI test question generator and JSON/Excel bulk question importer',
        'Complete curriculum unit structuring with answers & explanations',
        'Platform-wide user management, logs, and announcement broadcasts',
      ],
    },
    stats: [
      { v: 18500, s: '+', l: 'Hours of Deep Work Logged' },
      { v: 4200, s: '+', l: 'Exam Questions with AI Analysis' },
      { v: 98, s: '%', l: 'Student & Mentor Satisfaction' },
      { v: 24, s: '/7', l: 'AI Assistant Availability' },
    ],
    aiTag: 'Synapse AI Assistant',
    aiTitle: 'Your Personal Academic Mentor, Anytime, Anywhere',
    aiSub: 'Need practice questions? Stuck on a physics formula? Synapse AI provides tailored step-by-step guidance.',
    aiChips: ['🧪 12th Grade Biology Test', '📐 Physics Kinematics Formula', '📉 Improve Chemistry Score', '⏰ 2-Week Sprint Schedule'],
    aiTurns: [
      {
        q: 'How can I improve my genetics test scores in biology?',
        a: "Your report card shows timing bottlenecks on pedigree chart questions. I recommend 3 focused 25-minute Pomodoro sessions on categorized genetics questions and reviewing key terms in the Leitner box. Shall I add this to today's schedule?",
      },
      {
        q: 'Generate a 5-question test on physics dynamics.',
        a: 'Custom dynamics exam created (friction forces & momentum). Difficulty: Advanced; complete with detailed step-by-step solutions ready in the testing panel.',
      },
    ],
    ctaTitle: 'Start Your Journey to Academic Excellence Today',
    ctaSub: 'Join high-achieving students and coaches who use Synapse to master their exams with cutting-edge technology.',
    ctaBtn: 'Create Free Account',
    ctaBtn2: 'Sign In to Dashboard',
    ctaNote: 'Free · No installation required · Works on mobile and desktop',
  },
}

export default function HomePage({ navigate }) {
  const { lang } = useLang()
  const { skin, setSkin, accent, setAccent, SKINS, ACCENTS } = useTheme()
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const aiRef = useRef(null)

  const [aiStep, setAiStep] = useState(0)
  const [aiTyping, setAiTyping] = useState(false)

  const S = CONTENT[lang] || CONTENT.fa
  const faNum = lang === 'fa'

  useReveal(rootRef)

  // Scroll progress bar
  useEffect(() => {
    const bar = document.getElementById('hp-progress')
    if (!bar) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight
        const p = h > 0 ? (window.scrollY / h) * 100 : 0
        bar.style.width = `${p}%`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // AI chat loop
  useEffect(() => {
    let to1, to2
    if (reduced) {
      setAiTyping(false)
      return
    }
    const play = (i) => {
      setAiStep(i)
      setAiTyping(true)
      to1 = setTimeout(() => setAiTyping(false), 1400)
      to2 = setTimeout(() => play((i + 1) % S.aiTurns.length), 1400 + 4300)
    }
    to1 = setTimeout(() => setAiTyping(false), 1400)
    to2 = setTimeout(() => play((0 + 1) % S.aiTurns.length), 1400 + 4300)
    return () => { clearTimeout(to1); clearTimeout(to2) }
  }, [S])

  const g = (hash) => () => navigate(hash)
  const goRegister = g('#/register')
  const goLogin = g('#/login')

  const weekDays = faNum ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const turn = S.aiTurns[aiStep]

  return (
    <div className="hp" ref={rootRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <div id="hp-progress" className="hp-progress" aria-hidden="true" />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hp-hero" style={{ position: 'relative' }}>
        <div className="hp-hero-inner" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hp-hero-copy">
            <div
              className="badge hp-rv hp-v"
              style={{
                alignSelf: 'flex-start',
                marginBottom: 16,
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '6px 14px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 12.5,
              }}
            >
              ✨ {faNum ? 'نسخه جدید پلتفرم سیناپس (Synapse 2.0)' : 'Synapse 2.0 Platform Live'}
            </div>

            <h1 className="hp-title">
              <span className="hp-line hp-rv hp-v" style={{ '--d': '220ms' }}>{S.h1a}</span>
              <span className="hp-line hp-rv hp-v" style={{ '--d': '360ms' }}>
                <span className="hp-grad">{S.h1b}</span>
              </span>
            </h1>
            <p className="hp-sub hp-rv hp-v" style={{ '--d': '520ms' }}>{S.sub}</p>
            <div className="hp-cta hp-rv hp-v" style={{ '--d': '680ms' }}>
              <button className="hp-btn hp-btn-main" onClick={goRegister}>
                <span>{S.cta1}</span>
                <span className="hp-btn-arrow">{faNum ? '←' : '→'}</span>
              </button>
              <button className="hp-btn hp-btn-ghost" onClick={goLogin}>{S.cta2}</button>
            </div>
            <ul className="hp-trust hp-rv hp-v" style={{ '--d': '820ms' }}>
              {S.trust.map((t) => (
                <li key={t}><i>✓</i>{t}</li>
              ))}
            </ul>
          </div>

          {/* animated app mock */}
          <div className="hp-stage-wrap hp-rv hp-scale" style={{ '--d': '420ms' }}>
            <div className="hp-stage" ref={stageRef}>
              <div className="hp-tilt">
                <div className="hp-app">
                  <div className="hp-app-bar">
                    <span className="hp-dot r" /><span className="hp-dot y" /><span className="hp-dot g" />
                    <span className="hp-addr">{faNum ? 'پلتفرم / داشبورد دانش‌آموز' : 'platform / student dashboard'}</span>
                  </div>
                  <div className="hp-app-body">
                    <div className="hp-app-side">
                      <div className="hp-app-avatar" />
                      <i className="hp-app-line" />
                      <i className="hp-app-line short" />
                    </div>
                    <div className="hp-app-main">
                      <div className="hp-mock-row">
                        <span className="hp-ring">
                          <svg viewBox="0 0 44 44">
                            <circle className="hp-ring-track" cx="22" cy="22" r="19" />
                            <circle className="hp-ring-bar" cx="22" cy="22" r="19" />
                          </svg>
                          <b>{faNum ? '۸۸' : '88'}<small>٪</small></b>
                        </span>
                        <div className="hp-mini">
                          <i className="hp-app-line" />
                          <i className="hp-app-line short" />
                          <div className="hp-chips"><span className="hp-chip-ok">✓</span><span className="hp-chip-ok">✓</span></div>
                        </div>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">🎧</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check on">✓</span>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">🗂️</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check on">✓</span>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">⚗️</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check on">✓</span>
                      </div>
                      <div className="hp-bars">
                        <i style={{ '--h': '66%' }} /><i style={{ '--h': '82%' }} /><i style={{ '--h': '78%' }} /><i style={{ '--h': '95%' }} /><i style={{ '--h': '86%' }} /><i style={{ '--h': '94%' }} /><i style={{ '--h': '89%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="hp-chat-tag">
                    <span className="hp-typing"><i /><i /><i /></span>
                    <span>{faNum ? 'پارت تمرکز ۲۵ دقیقه‌ای با صدای باران فعال است…' : '25m Focus session with rain sound active…'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="hp-sec" id="hp-feat">
        <div className="hp-sec-head hp-rv hp-v">
          <h2>{S.featuresTitle}</h2>
          <p>{S.featuresSub}</p>
        </div>
        <div className="hp-feat-grid">
          {S.features.map((f, i) => (
            <div
              className="hp-feat-card hp-rv hp-v"
              style={{ '--d': `${i * 90}ms` }}
              key={f.t}
            >
              <div className="hp-feat-icon">{f.i}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="hp-sec" id="hp-how">
        <div className="hp-sec-head hp-rv hp-v">
          <h2>{S.howTitle}</h2>
          <p>{S.howSub}</p>
        </div>
        <div className="hp-how">
          <i className="hp-how-line" aria-hidden="true" />
          {S.how.map((st, i) => (
            <div className="hp-how-step hp-rv hp-v" style={{ '--d': `${i * 130}ms` }} key={st.t}>
              <span className="hp-how-num">{st.i}</span>
              <h3>{st.t}</h3>
              <p>{st.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ ROLES ═══════════════ */}
      <section className="hp-sec" id="hp-roles">
        <div className="hp-sec-head hp-rv hp-v">
          <h2>{S.rolesTitle}</h2>
          <p>{S.rolesSub}</p>
        </div>

        {/* STUDENT */}
        <div className="hp-role">
          <div className="hp-role-media hp-rv hp-l">
            <div className="hp-phone">
              <div className="hp-phone-notch" />
              <div className="hp-phone-head"><span className="hp-avatar">{faNum ? 'س' : 'S'}</span><div><i className="hp-app-line" /><i className="hp-app-line short" /></div><span className="hp-pill-dot" /></div>
              <div className="hp-phone-stat">
                <span className="hp-ring small"><svg viewBox="0 0 44 44"><circle className="hp-ring-track" cx="22" cy="22" r="19" /><circle className="hp-ring-bar g" cx="22" cy="22" r="19" /></svg><b>{faNum ? '۹۲' : '92'}</b></span>
                <p><i className="hp-app-line" /><i className="hp-app-line short" /></p>
              </div>
              <ul className="hp-ph-tasks">
                <li className="done"><span>🎧</span><em>{faNum ? 'پارت تمرکز زیست — پومودورو' : 'Biology Focus Pomodoro'}</em><b>✓</b></li>
                <li className="done"><span>🗂️</span><em>{faNum ? 'مرور فرمول‌های فیزیک لایتنر' : 'Physics Leitner Flashcards'}</em><b>✓</b></li>
                <li><span>📚</span><em>{faNum ? 'تحلیل آزمون تستی شیمی' : 'Chemistry Mock Exam'}</em><i className="hp-live" /></li>
              </ul>
            </div>
          </div>
          <div className="hp-role-copy hp-rv hp-v" style={{ '--d': '140ms' }}>
            <span className="hp-role-tag">{S.roleStudent.tag}</span>
            <h3>{S.roleStudent.title}</h3>
            <ul className="hp-bullets">
              {S.roleStudent.bullets.map((b) => <li key={b}><i>✓</i>{b}</li>)}
            </ul>
            <button className="hp-link" onClick={goRegister}>{S.cta1}<span className="hp-link-arr" /></button>
          </div>
        </div>

        {/* MENTOR */}
        <div className="hp-role flip">
          <div className="hp-role-media hp-rv hp-r">
            <div className="hp-phone darkish">
              <div className="hp-phone-notch" />
              <div className="hp-cal">
                {weekDays.map((d, i) => (
                  <span className={`${i === 3 ? 'today' : ''}`} key={d}>{d}<em>{i + 1}</em><b className={i < 3 ? 'fill' : i === 3 ? 'fill half' : ''} /></span>
                ))}
              </div>
              <div className="hp-sess">
                <p><span className="hp-sess-av">{faNum ? 'س' : 'N'}</span><em><i className="hp-app-line" /><i className="hp-app-line short" /></em><b>{faNum ? 'تأیید' : 'OK'}</b></p>
                <p><span className="hp-sess-av v">{faNum ? 'ن' : 'M'}</span><em><i className="hp-app-line" /><i className="hp-app-line short" /></em><b className="wait">{faNum ? 'در انتظار' : 'waiting'}</b></p>
              </div>
            </div>
          </div>
          <div className="hp-role-copy hp-rv hp-v" style={{ '--d': '140ms' }}>
            <span className="hp-role-tag alt">{S.roleMentor.tag}</span>
            <h3>{S.roleMentor.title}</h3>
            <ul className="hp-bullets">
              {S.roleMentor.bullets.map((b) => <li key={b}><i>✓</i>{b}</li>)}
            </ul>
            <button className="hp-link" onClick={goLogin}>{S.cta2}<span className="hp-link-arr" /></button>
          </div>
        </div>

        {/* ADMIN — compact */}
        <div className="hp-admin hp-rv hp-v">
          <div className="hp-admin-in">
            <div className="hp-admin-copy">
              <span className="hp-role-tag">{S.roleAdmin.tag}</span>
              <h3>{S.roleAdmin.title}</h3>
              <ul className="hp-bullets">
                {S.roleAdmin.bullets.map((b) => <li key={b}><i>✓</i>{b}</li>)}
              </ul>
            </div>
            <div className="hp-admin-vis" aria-hidden="true">
              <div className="hp-admin-row"><span>{faNum ? 'سؤال بانک' : 'Q-bank'}</span><b>{faNum ? fa(4200) : '4200'}</b><i className="hp-spark"><s /><s /><s /><s /><s /><s /></i></div>
              <div className="hp-admin-row"><span>{faNum ? 'آزمون فعال' : 'Live exams'}</span><b>{faNum ? fa(54) : '54'}</b><i className="hp-spark" style={{ '--c': '#16a34a' }}><s /><s /><s /><s /><s /><s /></i></div>
              <div className="hp-admin-import"><span>📥</span><em>JSON · Excel · AI Generation</em></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS BAND ═══════════════ */}
      <section className="hp-stats hp-rv hp-v">
        <div className="hp-stats-in">
          {S.stats.map((st) => (
            <div className="hp-stat" key={st.l}>
              <b><Counter value={st.v} suffix={st.s} lang={lang} /></b>
              <span>{st.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ AI CHAT DEMO ═══════════════ */}
      <section className="hp-sec" id="hp-ai">
        <div className="hp-sec-head hp-rv hp-v">
          <span className="hp-role-tag ai">{S.aiTag}</span>
          <h2>{S.aiTitle}</h2>
          <p>{S.aiSub}</p>
        </div>
        <div className="hp-ai">
          <div className="hp-ai-window hp-rv hp-scale" ref={aiRef}>
            <div className="hp-ai-bar">
              <span className="hp-ai-ico">🤖</span>
              <div><b>{S.aiTag}</b><em><span className="hp-on-dot" />{faNum ? 'آنلاین' : 'online'}</em></div>
            </div>
            <div className="hp-ai-body">
              <div className="hp-bubble me" key={`q-${aiStep}`}>{turn.q}</div>
              {aiTyping ? (
                <div className="hp-bubble ai typing" key="typing"><span className="hp-typing"><i /><i /><i /></span></div>
              ) : (
                <div className="hp-bubble ai" key={`a-${aiStep}`}>{turn.a}</div>
              )}
            </div>
            <div className="hp-ai-chips">
              {S.aiChips.map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="hp-cta-sec" id="hp-cta">
        <div className="hp-cta-card hp-rv hp-scale">
          <div className="hp-cta-glow" aria-hidden="true" />
          <h2>{S.ctaTitle}</h2>
          <p>{S.ctaSub}</p>
          <div className="hp-cta-row">
            <button className="hp-btn hp-btn-big" onClick={goRegister}>{S.ctaBtn}</button>
            <button className="hp-btn hp-btn-soft" onClick={goLogin}>{S.ctaBtn2}</button>
          </div>
          <small>{S.ctaNote}</small>
        </div>
      </section>
    </div>
  )
}
