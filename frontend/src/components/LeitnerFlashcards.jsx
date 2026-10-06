import { useState, useEffect } from 'react'
import { useLang } from '../i18n.jsx'
import { fa } from '../api.js'

const SEED_CARDS = [
  // English
  {
    id: 'c1',
    category: 'english',
    category_fa: 'زبان انگلیسی',
    front: 'Comprehensive (adj)',
    back: 'شامل، همه‌جانبه، فراگیر\nمثال: The mentor gave a comprehensive study plan.',
    box: 1,
  },
  {
    id: 'c2',
    category: 'english',
    category_fa: 'زبان انگلیسی',
    front: 'Persevere (v)',
    back: 'استقامت کردن، پایداری ورزیدن\nمثال: You must persevere during tough exam prep days.',
    box: 2,
  },
  // Biology
  {
    id: 'c3',
    category: 'biology',
    category_fa: 'زیست‌شناسی',
    front: 'نقش هورمون سکرتین چیست؟',
    back: 'از دوازدهه ترشح می‌شود و با اثر بر پانکراس باعث ترشح بی‌کربنات برای خنثی کردن اسید معده در ابتدای روده باریک می‌شود.',
    box: 1,
  },
  {
    id: 'c4',
    category: 'biology',
    category_fa: 'زیست‌شناسی',
    front: 'محل تولید هورمون‌های ADH و اکسی‌توسین؟',
    back: 'تولید در هیپوتالاموس، ذخیره و ترشح از هیپوفیز پسین.',
    box: 3,
  },
  // Physics / Math Formulas
  {
    id: 'c5',
    category: 'physics',
    category_fa: 'فیزیک و ریاضی',
    front: 'معادله سرعت-زمان در حرکت با شتاب ثابت',
    back: 'v = at + v₀\nو جابجایی:\nΔx = ½at² + v₀t',
    box: 2,
  },
  {
    id: 'c6',
    category: 'physics',
    category_fa: 'فیزیک و ریاضی',
    front: 'پتانسیل الکتریکی خازن و انرژی ذخیره شده',
    back: 'U = ½ C V² = ½ Q V = ½ Q² / C\nظرفیت خازن تخت: C = k ε₀ A / d',
    box: 1,
  },
  // Chemistry
  {
    id: 'c7',
    category: 'chemistry',
    category_fa: 'شیمی کنکور',
    front: 'رابطه pH و غلظت یون هیدرونیوم [⁺H₃O]',
    back: 'pH = -log[H₃O⁺]\nدر دمای ۲۵ درجه: pH + pOH = 14',
    box: 4,
  },
]

export default function LeitnerFlashcards() {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_leitner_cards')
      return saved ? JSON.parse(saved) : SEED_CARDS
    } catch {
      return SEED_CARDS
    }
  })

  const [activeCategory, setActiveCategory] = useState('all')
  const [activeBox, setActiveBox] = useState(1)
  const [flipped, setFlipped] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)

  // New card state
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newCat, setNewCat] = useState('english')

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('synapse_leitner_cards', JSON.stringify(cards))
  }, [cards])

  // Filtered cards for review
  const filteredCards = cards.filter((c) => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory
    const matchBox = activeBox === 0 || c.box === activeBox
    return matchCat && matchBox
  })

  const currentCard = filteredCards[currentIndex] || null

  const handleFlip = () => {
    setFlipped(!flipped)
  }

  // Handle Box Progression
  const handleAnswer = (correct) => {
    if (!currentCard) return

    setCards((prev) =>
      prev.map((c) => {
        if (c.id === currentCard.id) {
          let newBox = c.box
          if (correct) {
            newBox = Math.min(5, c.box + 1)
          } else {
            newBox = 1 // return to box 1 if failed
          }
          return { ...c, box: newBox }
        }
        return c
      })
    )

    setFlipped(false)
    if (currentIndex >= filteredCards.length - 1) {
      setCurrentIndex(0)
    }
  }

  const handleNext = () => {
    setFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length))
  }

  const handlePrev = () => {
    setFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % Math.max(1, filteredCards.length))
  }

  // Add Card
  const handleAddCard = (e) => {
    e.preventDefault()
    if (!newFront.trim() || !newBack.trim()) return

    const card = {
      id: 'c_' + Date.now(),
      category: newCat,
      category_fa:
        newCat === 'english'
          ? 'زبان انگلیسی'
          : newCat === 'biology'
          ? 'زیست‌شناسی'
          : newCat === 'physics'
          ? 'فیزیک و ریاضی'
          : 'شیمی کنکور',
      front: newFront.trim(),
      back: newBack.trim(),
      box: 1,
    }

    setCards([...cards, card])
    setNewFront('')
    setNewBack('')
    setShowAddModal(false)
  }

  // Count per box
  const boxCounts = [1, 2, 3, 4, 5].map((b) => cards.filter((c) => c.box === b).length)

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🗂️</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              {isEn ? 'Leitner 3D Spaced Repetition Box' : 'جعبه لایتنر هوشمند ۳بعدی و مرور فاصله‌دار'}
            </h3>
          </div>
          <p className="small muted" style={{ margin: '4px 0 0 0' }}>
            {isEn ? 'Transfer facts into permanent long-term memory' : 'انتقال سریع لغات، فرمول‌ها و نکات به حافظه بلندمدت با قاعده لایتنر ۵ مرحله‌ای'}
          </p>
        </div>

        <button
          type="button"
          className="btn sm primary"
          style={{ borderRadius: 10 }}
          onClick={() => setShowAddModal(true)}
        >
          + {isEn ? 'Add New Card' : 'افزودن فلش‌کارت جدید'}
        </button>
      </div>

      {/* 5-Box Step Pipeline */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[1, 2, 3, 4, 5].map((boxNum) => {
          const count = boxCounts[boxNum - 1]
          const isSelected = activeBox === boxNum
          return (
            <div
              key={boxNum}
              onClick={() => {
                setActiveBox(boxNum)
                setCurrentIndex(0)
                setFlipped(false)
              }}
              style={{
                background: isSelected ? 'var(--tint-fill)' : 'var(--bg)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--line)',
                borderRadius: 12,
                padding: '8px 10px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--muted)' }}>
                {isEn ? `Box ${boxNum}` : `خانه ${fa(boxNum)}`}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>{fa(count)}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {boxNum === 1
                  ? isEn
                    ? 'Daily'
                    : 'هر روز'
                  : boxNum === 2
                  ? isEn
                    ? '2 Days'
                    : '۲ روز'
                  : boxNum === 3
                  ? isEn
                    ? '4 Days'
                    : '۴ روز'
                  : boxNum === 4
                  ? isEn
                    ? '8 Days'
                    : '۸ روز'
                  : isEn
                  ? 'Perm'
                  : 'دائمی'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 16 }}>
        {[
          { id: 'all', label_fa: 'همه دروس', label_en: 'All Subjects' },
          { id: 'english', label_fa: 'زبان انگلیسی', label_en: 'English' },
          { id: 'biology', label_fa: 'زیست‌شناسی', label_en: 'Biology' },
          { id: 'physics', label_fa: 'فیزیک و ریاضی', label_en: 'Physics/Math' },
          { id: 'chemistry', label_fa: 'شیمی کنکور', label_en: 'Chemistry' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="btn sm"
            style={{
              borderRadius: 20,
              fontSize: 12,
              padding: '4px 12px',
              background: activeCategory === cat.id ? 'var(--ink)' : 'var(--bg)',
              color: activeCategory === cat.id ? 'var(--card)' : 'var(--ink)',
              border: '1px solid var(--line)',
            }}
            onClick={() => {
              setActiveCategory(cat.id)
              setCurrentIndex(0)
              setFlipped(false)
            }}
          >
            {isEn ? cat.label_en : cat.label_fa}
          </button>
        ))}
      </div>

      {/* 3D Flashcard Display Area */}
      {filteredCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg)', borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {isEn ? 'No cards in this box!' : 'هیچ کارتی در این خانه وجود ندارد!'}
          </div>
          <p className="small muted">
            {isEn
              ? 'Select another box or add new cards above.'
              : 'یک خانه دیگر را انتخاب کنید یا کارت جدید اضافه نمایید.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Card container with 3D Flip */}
          <div
            onClick={handleFlip}
            style={{
              minHeight: 200,
              background: flipped
                ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)'
                : 'var(--bg)',
              border: flipped ? '2px solid var(--primary)' : '1px solid var(--line)',
              borderRadius: 18,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Top row in card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge" style={{ background: 'var(--tint-fill)', color: 'var(--primary)', fontWeight: 700 }}>
                {currentCard.category_fa || currentCard.category}
              </span>
              <span className="small muted">
                {isEn ? 'Card' : 'کارت'} {fa(currentIndex + 1)} / {fa(filteredCards.length)}
              </span>
            </div>

            {/* Content (Front or Back) */}
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <div className="small muted" style={{ marginBottom: 6, fontWeight: 600 }}>
                {flipped ? (isEn ? '💡 Answer / Explanation:' : '💡 پاسخ و نکته طلایی:') : (isEn ? '❓ Question / Prompt:' : '❓ سوال یا مفهوم:')}
              </div>
              <div
                style={{
                  fontSize: flipped ? 17 : 20,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.6,
                }}
              >
                {flipped ? currentCard.back : currentCard.front}
              </div>
            </div>

            {/* Bottom hint */}
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
              {isEn ? '👆 Click to flip card' : '👆 برای مشاهده پاسخ / روی کارت کلیک کنید'}
            </div>
          </div>

          {/* Action Buttons: Pass / Fail / Navigation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <button
              type="button"
              className="btn"
              style={{
                borderRadius: 12,
                background: '#ef4444',
                color: '#fff',
                fontWeight: 700,
                padding: '10px 16px',
              }}
              onClick={() => handleAnswer(false)}
            >
              ❌ {isEn ? "Didn't Know (Back to Box 1)" : 'بلد نبودم (برگشت به خانه ۱)'}
            </button>

            <button
              type="button"
              className="btn"
              style={{
                borderRadius: 12,
                background: '#22c55e',
                color: '#fff',
                fontWeight: 700,
                padding: '10px 16px',
              }}
              onClick={() => handleAnswer(true)}
            >
              ✅ {isEn ? 'Mastered (Next Box)' : 'بلد بودم (انتقال به خانه بعدی)'}
            </button>
          </div>

          {/* Card Carousel Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn ghost sm" onClick={handlePrev}>
              ◀ {isEn ? 'Previous' : 'کارت قبلی'}
            </button>
            <button type="button" className="btn ghost sm" onClick={handleNext}>
              {isEn ? 'Next' : 'کارت بعدی'} ▶
            </button>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>
              {isEn ? 'Add Flashcard to Leitner Box' : 'افزودن فلش‌کارت به جعبه لایتنر'}
            </h3>

            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Subject Category:' : 'موضوع / درس:'}
                </label>
                <select className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                  <option value="english">زبان انگلیسی</option>
                  <option value="biology">زیست‌شناسی</option>
                  <option value="physics">فیزیک و ریاضی</option>
                  <option value="chemistry">شیمی کنکور</option>
                </select>
              </div>

              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Front (Question / Word / Formula):' : 'روی کارت (کلمه / فرمول / سوال):'}
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={isEn ? 'e.g. Velocity formula' : 'مثال: فرمول سرعت'}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  {isEn ? 'Back (Meaning / Answer / Explanation):' : 'پشت کارت (معنی / جواب / توضیح کامل):'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder={isEn ? 'Detailed explanation...' : 'توضیحات و پاسخ کامل...'}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setShowAddModal(false)}>
                  {isEn ? 'Cancel' : 'انصراف'}
                </button>
                <button type="submit" className="btn primary">
                  {isEn ? 'Save Card' : 'ذخیره کارت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
