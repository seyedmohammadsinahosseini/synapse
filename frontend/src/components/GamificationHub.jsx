import { useState, useEffect } from 'react'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'

const BADGES = [
  {
    id: 'b1',
    icon: '🔥',
    title_fa: 'آتش استمرار',
    title_en: 'Consistency Flame',
    desc_fa: 'حفظ زنجیره مطالعه به مدت ۷ روز متوالی',
    desc_en: 'Maintain a 7-day study streak',
    unlocked: true,
    xpBonus: 100,
  },
  {
    id: 'b2',
    icon: '⏱️',
    title_fa: 'فرمانده تمرکز',
    title_en: 'Focus Commander',
    desc_fa: 'تکمیل ۲۰ پارت تمرکز عمیق پومودورو',
    desc_en: 'Complete 20 deep work focus sessions',
    unlocked: true,
    xpBonus: 250,
  },
  {
    id: 'b3',
    icon: '🎯',
    title_fa: 'تک‌تیرانداز کنکور',
    title_en: 'Test Sniper',
    desc_fa: 'کسب درصد بالای ۸۰٪ در ۳ آزمون متوالی',
    desc_en: 'Score 80%+ on 3 consecutive tests',
    unlocked: false,
    progress: '2/3',
    xpBonus: 300,
  },
  {
    id: 'b4',
    icon: '🧠',
    title_fa: 'حافظه برتر لایتنر',
    title_en: 'Leitner Master',
    desc_fa: 'انتقال ۵۰ فلش‌کارت به جعبه حافظه دائمی',
    desc_en: 'Move 50 cards to permanent memory box',
    unlocked: false,
    progress: '28/50',
    xpBonus: 200,
  },
  {
    id: 'b5',
    icon: '🏆',
    title_fa: 'اسطوره سحرخیزی',
    title_en: 'Early Bird Legend',
    desc_fa: 'شروع اولین پارت مطالعه قبل از ساعت ۷:۰۰ صبح در ۵ روز',
    desc_en: 'Start studying before 7:00 AM on 5 days',
    unlocked: true,
    xpBonus: 150,
  },
  {
    id: 'b6',
    icon: '👑',
    title_fa: 'رتبه برتر سیناپس',
    title_en: 'Synapse Grandmaster',
    desc_fa: 'رسیدن به سطح ۲۰ و تسلط بر تمامی سرفصل‌ها',
    desc_en: 'Reach Level 20 and complete curriculum',
    unlocked: false,
    progress: 'Level 8/20',
    xpBonus: 1000,
  },
]

export default function GamificationHub() {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const [xp, setXp] = useState(() => {
    return parseInt(localStorage.getItem('synapse_user_xp') || '1450', 10)
  })

  useEffect(() => {
    const handleStorage = () => {
      setXp(parseInt(localStorage.getItem('synapse_user_xp') || '1450', 10))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Calculate Level: each level is 200 XP
  const level = Math.floor(xp / 200) + 1
  const currentLevelXp = xp % 200
  const nextLevelXp = 200
  const levelPct = Math.round((currentLevelXp / nextLevelXp) * 100)

  // Rank title
  const getRankTitle = (lvl) => {
    if (lvl < 3) return isEn ? 'Novice Scholar' : 'دانش‌پژوه نوپا'
    if (lvl < 6) return isEn ? 'Dedicated Aspirant' : 'داوطلب مصمم'
    if (lvl < 10) return isEn ? 'Exam Warrior' : 'جنگجوی پرتلاش کنکور'
    if (lvl < 20) return isEn ? 'Top Rank Candidate' : 'کاندیدای رتبه تک‌رقمی'
    return isEn ? 'Synapse Grandmaster' : 'اسطوره و استاد سیناپس'
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Level Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          borderRadius: 16,
          padding: '20px 24px',
          color: '#fff',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 140,
            height: 140,
            background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                {isEn ? 'Current Level & Title' : 'سطح کنکوری و عنوان'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {isEn ? `Level ${level}` : `سطح ${fa(level)}`}: {getRankTitle(level)}
              </div>
            </div>
          </div>

          <div style={{ textAlign: isEn ? 'right' : 'left' }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{isEn ? 'Total Study XP' : 'مجموع امتیاز XP'}</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>{fa(xp)} XP</div>
          </div>
        </div>

        {/* Progress bar to next level */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
            <span>{isEn ? 'Progress to Next Level' : 'پیشرفت تا سطح بعدی:'}</span>
            <span>
              {fa(currentLevelXp)} / {fa(nextLevelXp)} XP ({fa(levelPct)}%)
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${levelPct}%`,
                height: '100%',
                background: '#facc15',
                borderRadius: 999,
                boxShadow: '0 0 10px #facc15',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Badges and Milestones Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏅</span>
            <h4 style={{ margin: 0, fontSize: 16 }}>
              {isEn ? 'Milestone Badges & Honors' : 'مدال‌ها و دستاوردهای افتخار'}
            </h4>
          </div>
          <span className="small muted">
            {fa(BADGES.filter((b) => b.unlocked).length)} / {fa(BADGES.length)} {isEn ? 'Unlocked' : 'آنلاک شده'}
          </span>
        </div>

        {/* Grid of Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {BADGES.map((b) => {
            return (
              <div
                key={b.id}
                style={{
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: b.unlocked ? 'var(--bg)' : 'var(--bg)',
                  border: b.unlocked ? '1.5px solid #22c55e' : '1px solid var(--line)',
                  opacity: b.unlocked ? 1 : 0.65,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: b.unlocked ? 'rgba(34, 197, 94, 0.15)' : 'var(--tint-fill)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    filter: b.unlocked ? 'none' : 'grayscale(100%)',
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13.5, color: 'var(--ink)' }}>{isEn ? b.title_en : b.title_fa}</b>
                    <span className="badge" style={{ fontSize: 10, background: '#fef3c7', color: '#b45309' }}>
                      +{fa(b.xpBonus)} XP
                    </span>
                  </div>
                  <div className="small muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>
                    {isEn ? b.desc_en : b.desc_fa}
                  </div>
                  {!b.unlocked && b.progress && (
                    <div style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 700, marginTop: 4 }}>
                      🔒 {isEn ? 'In Progress:' : 'در حال پیشرفت:'} {b.progress}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
