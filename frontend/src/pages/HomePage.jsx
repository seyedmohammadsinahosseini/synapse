import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'

/* ═══════════════════════════════════════════════════════════════════
   Home / landing page for guests — a heavy-animation showcase that
   introduces the whole platform (student / mentor / admin).
   Pure CSS + small rAF/IntersectionObserver hooks. All geometry is
   theme-agnostic; colors ride the --var palette (light + dark).
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
        const e = 1 - Math.pow(2, -10 * p)          // easeOutExpo
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

/* ── pointer spotlight for cards (CSS var --mx / --my) ──────────── */
function spotlight(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
function clearSpot(e) {
  e.currentTarget.style.removeProperty('--mx')
  e.currentTarget.style.removeProperty('--my')
}

/* ═══════════════════════════════════════════════════════════════════
   CONTENT (fa / en)
   ═══════════════════════════════════════════════════════════════════ */
const CONTENT = {
  fa: {
    h1a: 'برنامه‌ریزی، آزمون و مربیِ تو،',
    h1b: 'در یک پلتفرم هوشمند',
    sub: 'پلتفرم دانش‌آموز و مربی: برنامهٔ مطالعاتی هفتگیِ شخصی‌سازی‌شده با هوش مصنوعی، آزمون آنلاین با تصحیح خودکار، دستیارِ همیشه‌بیدار و همراهیِ واقعی مربی — از ثبت‌نام تا قبولی.',
    cta1: 'شروع رایگان',
    cta2: 'ورود به حساب',
    trust: ['بدون نیاز به کارت بانکی', 'فعال‌سازی فوری', 'مناسب کنکور و مدرسه'],
    featuresTitle: 'چرا دانش‌آموزها و مربی‌ها اینجا جمع می‌شوند؟',
    featuresSub: 'همهٔ ابزارهای لازم برای مطالعهٔ هدفمند، کنار هم و هماهنگ با هم.',
    features: [
      { i: '🧭', t: 'برنامهٔ هفتگیِ شخصی', d: 'بر اساس رشته، پایه، معدل و هدفت؛ برنامهٔ هر روز را با چک‌لیست کاری آماده می‌گیری.' },
      { i: '📝', t: 'آزمون آنلاین و تحلیل', d: 'آزمون‌های تستی و تشریحی با تصحیح خودکار، نمرهٔ ۰ تا ۲۰ و گزارش نقاط ضعف و قوت.' },
      { i: '🤖', t: 'دستیار هوشمند', d: 'هر سؤالی داری بپرس؛ آزمون بساز، برنامه بخواه یا تحلیل بگیر — همیشه پاسخ می‌دهد.' },
      { i: '🧑‍🏫', t: 'مربیِ آنلاین', d: 'با کد اتصال به مربی وصل شو؛ پیام لحظه‌ای، جلسهٔ مشاوره و نظارت هفتگی روی پیشرفتت.' },
      { i: '📈', t: 'پیشرفتِ دیده‌شده', d: 'نمودار روند نمره‌ها و بازخورد رنگی هفتگی، انگیزه‌ات را زنده نگه می‌دارد.' },
      { i: '🛡️', t: 'پنلِ منظم برای همه', d: 'دانش‌آموز، مربی و مدیر هرکدام داشبوردِ تمیز و مختصِ خودشان را دارند.' },
    ],
    howTitle: 'در ۴ قدم، شروع کن',
    howSub: 'نه پیچیدگی، نه سردرگمی — از روز اول مسیرت روشن است.',
    how: [
      { i: '۱', t: 'ثبت‌نام هدفمند', d: 'رشته، پایه، معدل و هدفت را در چند دقیقه می‌گویی.' },
      { i: '۲', t: 'برنامهٔ هوشمند', d: 'هوش مصنوعی برنامهٔ هفتگی و چک‌لیست روزانه‌ات را می‌سازد.' },
      { i: '۳', t: 'تمرین و آزمون', d: 'می‌خوانی، آزمون می‌دهی و تحلیلِ نتیجه را می‌گیری.' },
      { i: '۴', t: 'پیشرفت با مربی', d: 'با مربی در ارتباطی و هر هفته برنامه و روندت را مرور می‌کنید.' },
    ],
    rolesTitle: 'یک پلتفرم، برای هر سه نقش',
    rolesSub: 'هرکس ابزارِ خودش را دارد؛ ولی همه روی یک دادهٔ مشترک و واقعی کار می‌کنند.',
    roleStudent: {
      tag: 'برای دانش‌آموز',
      title: 'برنامه‌ای که دقیقاً برای تو ساخته شده',
      bullets: [
        'ثبت‌نام ۳ دقیقه‌ای با پرسش‌های هدفمند',
        'برنامهٔ هفتگی + چک‌لیست روزانه با وضعیت رنگی',
        'آزمون آنلاین، تصحیح خودکار و تحلیل نقاط ضعف',
        'چت لحظه‌ای، جلسهٔ مشاوره و همراهی مربی',
      ],
    },
    roleMentor: {
      tag: 'برای مربی',
      title: 'همهٔ دانش‌آموزهایت، زیر یک سقف',
      bullets: [
        'کد اتصال اختصاصی برای هر دانش‌آموز',
        'پیام‌رسان لحظه‌ای و جلسات مشاورهٔ ۴۵ دقیقه‌ای',
        'نظارت هفتگی روی برنامه‌ها و علامت‌گذاری نتیجه',
        'کارنامه و گزارش پیشرفتِ هر دانش‌آموز',
      ],
    },
    roleAdmin: {
      tag: 'برای مدیر',
      title: 'دیده‌بانِ کل پلتفرم',
      bullets: [
        'داشبورد آماری کل کاربران و آزمون‌ها',
        'مدیریت دانش‌آموزان و مربی‌ها',
        'بانک سؤال با ایمپورت فایل JSON و Excel',
      ],
    },
    aiTag: 'دستیار هوشمند',
    aiTitle: 'یک دستیار که واقعاً کمکت می‌کند',
    aiSub: 'برنامه بساز، آزمون طراحی کن، سؤال بپرس یا تحلیل بگیر — گفتگو با دستیار هوشمند پلتفرم.',
    aiChips: ['برنامهٔ این هفته را بساز', 'آزمون ۱۰ سؤالی', 'نقطهٔ ضعفم را بگو', 'انگیزه‌نامه'],
    aiTurns: [
      { q: 'سلام! برای کنکور ریاضی، برنامهٔ این هفته را بساز.', a: 'سلام! 👋 با توجه به معدل و هدف کنکورت، این هفته را با ۳ جلسهٔ ریاضی، ۲ جلسهٔ فیزیک و یک مرور هفتگی چیدم. جزئیات هر روز را در «برنامهٔ من» ببین.' },
      { q: 'از روی ضعف‌هایم یک آزمون ۱۰ سؤالی بساز.', a: 'آزمونت آماده است! 🚀 تمرکز را روی «مشتق و کاربرد آن» گذاشتم — ۱۵ دقیقه وقت داری، در پایان هم تحلیل کامل می‌گیری.' },
    ],
    stats: [
      { v: 2500, s: '+', l: 'دانش‌آموز فعال' },
      { v: 180, s: '+', l: 'مربی همراه' },
      { v: 9600, s: '+', l: 'آزمون برگزارشده' },
      { v: 97, s: '٪', l: 'رضایت کاربران' },
    ],
    ctaTitle: 'آماده‌ای مسیرت را بسازی؟',
    ctaSub: 'همین امروز ثبت‌نام کن؛ برنامهٔ شخصی‌ات تا چند دقیقه دیگر آماده است.',
    ctaBtn: 'ساخت حساب رایگان',
    ctaBtn2: 'ورود به حساب',
    ctaNote: 'دانش‌آموز هستی؟ کد مربی را هم می‌توانی بعداً اضافه کنی.',
    marquee: ['برنامهٔ هوشمند', 'آزمون آنلاین', 'دستیار AI', 'مربی آنلاین', 'جلسهٔ مشاوره', 'تحلیل پیشرفت', 'پنل ادمین', 'بانک سؤال'],
  },
  en: {
    h1a: 'Your study plan, tests and mentor,',
    h1b: 'all in one smart platform',
    sub: 'A student–mentor platform: AI-personalised weekly study plans, online exams with auto-grading, an always-on assistant and real mentor support — from sign-up to success.',
    cta1: 'Get started free',
    cta2: 'Log in',
    trust: ['No credit card needed', 'Instant activation', 'For school & university entrance'],
    featuresTitle: 'Why students and mentors gather here?',
    featuresSub: 'Every tool you need for focused studying — together and in sync.',
    features: [
      { i: '🧭', t: 'Personal weekly plan', d: 'Based on your field, grade, average and goal — each day comes with a ready task checklist.' },
      { i: '📝', t: 'Online exams & analytics', d: 'MCQ & essay tests with auto-grading, 0–20 scores and clear weak/strong point reports.' },
      { i: '🤖', t: 'AI assistant', d: 'Ask anything, generate a test, request a plan or get feedback — it always answers.' },
      { i: '🧑‍🏫', t: 'Online mentor', d: 'Connect with a mentor by code: instant chat, consultation sessions and weekly supervision.' },
      { i: '📈', t: 'Visible progress', d: 'Trend charts and colour-coded weekly feedback keep your motivation alive.' },
      { i: '🛡️', t: 'A clean panel for everyone', d: 'Students, mentors and admins each get their own tidy, focused dashboard.' },
    ],
    howTitle: 'Start in 4 steps',
    howSub: 'No complexity, no confusion — your path is clear from day one.',
    how: [
      { i: '1', t: 'Goal-driven sign-up', d: 'Tell us your field, grade, average and goal in minutes.' },
      { i: '2', t: 'Smart plan', d: 'AI builds your weekly plan and daily task checklist.' },
      { i: '3', t: 'Practice & test', d: 'Study, take exams and get result analytics.' },
      { i: '4', t: 'Grow with a mentor', d: 'Stay in touch with your mentor and review weekly.' },
    ],
    rolesTitle: 'One platform for all three roles',
    rolesSub: 'Everyone has their own tools — all working on one shared, real dataset.',
    roleStudent: {
      tag: 'For students',
      title: 'A plan built exactly for you',
      bullets: [
        '3-minute goal-driven sign-up',
        'Weekly plan + daily checklist with status colours',
        'Online exams, auto-grading and weak-point analysis',
        'Instant chat, counselling sessions and mentor guidance',
      ],
    },
    roleMentor: {
      tag: 'For mentors',
      title: 'All your students under one roof',
      bullets: [
        'Personal connect code for every student',
        'Instant messenger & 45-minute counselling sessions',
        'Weekly supervision with clear done/missed marking',
        'Progress reports for every student',
      ],
    },
    roleAdmin: {
      tag: 'For admins',
      title: 'Watch over the whole platform',
      bullets: [
        'Stats dashboard for users & exams',
        'Manage students and mentors',
        'Question bank with JSON & Excel import',
      ],
    },
    aiTag: 'AI assistant',
    aiTitle: 'An assistant that actually helps',
    aiSub: 'Build plans, design tests, ask questions or get analytics — talk to the platform AI.',
    aiChips: ['Build this week’s plan', '10-question test', 'Find my weak spots', 'Motivate me'],
    aiTurns: [
      { q: 'Hi! Build this week’s plan for the university entrance exam — maths track.', a: 'Hey! 👋 Based on your average and goal, I scheduled 3 maths sessions, 2 physics and one weekly review. See the details in “My Plan”.' },
      { q: 'Generate a 10-question test from my weak areas.', a: 'Your test is ready! 🚀 I focused on “derivatives and applications” — you have 15 minutes, and you’ll get full analytics at the end.' },
    ],
    stats: [
      { v: 2500, s: '+', l: 'Active students' },
      { v: 180, s: '+', l: 'Mentors on board' },
      { v: 9600, s: '+', l: 'Exams taken' },
      { v: 97, s: '%', l: 'User satisfaction' },
    ],
    ctaTitle: 'Ready to build your path?',
    ctaSub: 'Sign up today — your personal plan is ready in minutes.',
    ctaBtn: 'Create a free account',
    ctaBtn2: 'Log in',
    ctaNote: 'A student? You can add a mentor code later too.',
    marquee: ['Smart planning', 'Online exams', 'AI assistant', 'Online mentor', 'Counselling', 'Progress analytics', 'Admin panel', 'Question bank'],
  },
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function HomePage({ navigate }) {
  const { lang } = useLang()
  const rootRef = useRef(null)
  const stageRef = useRef(null)      // hero visual (mouse tilt)
  const aiRef = useRef(null)
  const [aiStep, setAiStep] = useState(0)
  const [aiTyping, setAiTyping] = useState(true)

  useReveal(rootRef)

  const S = CONTENT[lang] || CONTENT.fa
  const faNum = lang === 'fa'

  /* hero mouse tilt (rotate a 3D mock towards the cursor) */
  useEffect(() => {
    if (reduced) return
    const stage = stageRef.current
    if (!stage || !window.matchMedia('(pointer: fine)').matches) return
    const MAX = 7
    const onMove = (e) => {
      const r = stage.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      stage.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX}deg`)
      stage.style.setProperty('--rx', `${(0.5 - py) * 2 * MAX}deg`)
    }
    const onLeave = () => {
      stage.style.setProperty('--ry', '0deg')
      stage.style.setProperty('--rx', '0deg')
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  /* scroll progress bar */
  useEffect(() => {
    const bar = document.getElementById('hp-progress')
    if (!bar) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const max = h.scrollHeight - window.innerHeight
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
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

  /* AI chat auto demo */
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
    <div className="hp" ref={rootRef}>
      <div id="hp-progress" className="hp-progress" aria-hidden="true" />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hp-hero">
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
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
                <span className="hp-btn-arrow">←</span>
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
                          <b>{faNum ? '۷۸' : '78'}<small>٪</small></b>
                        </span>
                        <div className="hp-mini">
                          <i className="hp-app-line" />
                          <i className="hp-app-line short" />
                          <div className="hp-chips"><span className="hp-chip-ok">✓</span><span className="hp-chip-ok">✓</span></div>
                        </div>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">📘</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check on">✓</span>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">📐</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check on">✓</span>
                      </div>
                      <div className="hp-todo">
                        <span className="hp-todo-ic">⚗️</span>
                        <span className="hp-todo-tx"><i className="hp-app-line" /><i className="hp-app-line short" /></span>
                        <span className="hp-todo-check" />
                      </div>
                      <div className="hp-bars">
                        <i style={{ '--h': '46%' }} /><i style={{ '--h': '72%' }} /><i style={{ '--h': '58%' }} /><i style={{ '--h': '92%' }} /><i style={{ '--h': '66%' }} /><i style={{ '--h': '84%' }} /><i style={{ '--h': '74%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="hp-chat-tag">
                    <span className="hp-typing"><i /><i /><i /></span>
                    <span>{faNum ? 'برنامهٔ امروز آماده است…' : 'Your plan for today is ready…'}</span>
                  </div>
                </div>
              </div>

              <div className="hp-float hp-f1 hp-rv hp-scale" style={{ '--d': '900ms' }}>🧠 {faNum ? 'هوش مصنوعی' : 'AI'}</div>
              <div className="hp-float hp-f2 hp-rv hp-scale" style={{ '--d': '1000ms' }}>📝 {faNum ? 'آزمون آنلاین' : 'Exam'}</div>
              <div className="hp-float hp-f3 hp-rv hp-scale" style={{ '--d': '1100ms' }}>🗓️ {faNum ? 'جلسه با مربی' : 'Session'}</div>
              <div className="hp-float hp-f4 hp-rv hp-scale" style={{ '--d': '1200ms' }}>⭐ +{faNum ? fa(78) : 78}٪</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MARQUEE ═══════════════ */}
      <div className="hp-marquee" aria-hidden="true">
        <div className="hp-marquee-track">
          {[0, 1].map((k) => (
            <div className="hp-marquee-half" key={k}>
              {[...S.marquee, ...S.marquee].map((m, i) => (
                <span className="hp-marquee-item" key={i}>
                  <b>{m}</b><em>✦</em>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="hp-sec" id="hp-features">
        <div className="hp-sec-head hp-rv hp-v">
          <h2>{S.featuresTitle}</h2>
          <p>{S.featuresSub}</p>
        </div>
        <div className="hp-feat-grid">
          {S.features.map((f, i) => (
            <article
              key={f.t}
              className="hp-fcard hp-rv hp-v"
              style={{ '--d': `${(i % 3) * 90}ms` }}
              onPointerMove={spotlight}
              onPointerLeave={clearSpot}
            >
              <div className="hp-fcard-ico">{f.i}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
              <span className="hp-fcard-go" />
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="hp-sec hp-sec-plain" id="hp-how">
        <div className="hp-sec-head hp-rv hp-v">
          <h2>{S.howTitle}</h2>
          <p>{S.howSub}</p>
        </div>
        <div className="hp-how">
          <div className="hp-how-line hp-rv hp-x" />
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
              <div className="hp-phone-head"><span className="hp-avatar">{faNum ? 'ز' : 'S'}</span><div><i className="hp-app-line" /><i className="hp-app-line short" /></div><span className="hp-pill-dot" /></div>
              <div className="hp-phone-stat">
                <span className="hp-ring small"><svg viewBox="0 0 44 44"><circle className="hp-ring-track" cx="22" cy="22" r="19" /><circle className="hp-ring-bar g" cx="22" cy="22" r="19" /></svg><b>{faNum ? '۸۵' : '85'}</b></span>
                <p><i className="hp-app-line" /><i className="hp-app-line short" /></p>
              </div>
              <ul className="hp-ph-tasks">
                <li className="done"><span>📘</span><em>{faNum ? 'ریاضی — فصل ۵' : 'Maths — ch. 5'}</em><b>✓</b></li>
                <li className="done"><span>📐</span><em>{faNum ? 'فیزیک — حرکت' : 'Physics'}</em><b>✓</b></li>
                <li><span>📚</span><em>{faNum ? 'ادبیات — آرایه‌ها' : 'Persian lit'}</em><i className="hp-live" /></li>
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
              <div className="hp-admin-row"><span>{faNum ? 'سؤال بانک' : 'Q-bank'}</span><b>{faNum ? fa(320) : '320'}</b><i className="hp-spark"><s /><s /><s /><s /><s /><s /></i></div>
              <div className="hp-admin-row"><span>{faNum ? 'آزمون فعال' : 'Live exams'}</span><b>{faNum ? fa(42) : '42'}</b><i className="hp-spark" style={{ '--c': '#16a34a' }}><s /><s /><s /><s /><s /><s /></i></div>
              <div className="hp-admin-import"><span>📥</span><em>JSON · Excel</em></div>
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
