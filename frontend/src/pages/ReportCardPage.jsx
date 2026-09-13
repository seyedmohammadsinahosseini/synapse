import { useEffect, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Empty, Modal, Badge } from '../ui.jsx'

export default function ReportCardPage({ navigate }) {
  const { t } = useLang()
  const [reportCards, setReportCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadModal, setUploadModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)

  // Upload Form State
  const [title, setTitle] = useState('آزمون مرحله‌ای خیلی سبز')
  const [provider, setProvider] = useState('خیلی سبز')
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [totalTraz, setTotalTraz] = useState(6500)
  const [overallRank, setOverallRank] = useState(120)
  const [file, setFile] = useState(null)
  const [manualRows, setManualRows] = useState([
    { subject: 'زیست‌شناسی', percentage: 72, traz: 6800, class_average: 45 },
    { subject: 'شیمی', percentage: 65, traz: 6400, class_average: 40 },
    { subject: 'فیزیک', percentage: 55, traz: 5900, class_average: 35 },
    { subject: 'ریاضی', percentage: 60, traz: 6200, class_average: 38 },
  ])
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'manual'
  const [submitting, setSubmitting] = useState(false)

  const loadReportCards = () => {
    setLoading(true)
    api('/api/report-cards')
      .then((data) => {
        setReportCards(data)
        if (data && data.length > 0 && !selectedCard) {
          setSelectedCard(data[0])
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadReportCards, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualRowChange = (idx, field, val) => {
    setManualRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    )
  }

  const addManualRow = () => {
    setManualRows((prev) => [...prev, { subject: '', percentage: 50, traz: 6000, class_average: 40 }])
  }

  const removeManualRow = (idx) => {
    setManualRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (uploadMode === 'file') {
        const formData = new FormData()
        if (file) formData.append('file', file)
        formData.append('title', title)
        formData.append('provider', provider)
        formData.append('exam_date', examDate)
        if (totalTraz) formData.append('total_traz', totalTraz)
        if (overallRank) formData.append('overall_rank', overallRank)

        const res = await fetch('/api/report-card/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'خطا در بارگذاری کارنامه')
        }
        const data = await res.json()
        setUploadModal(false)
        loadReportCards()
        setSelectedCard(data)
      } else {
        const payload = {
          title,
          provider,
          exam_date: examDate,
          total_traz: parseInt(totalTraz) || null,
          overall_rank: parseInt(overallRank) || null,
          subjects: manualRows.filter((r) => r.subject.trim()),
        }
        const res = await api('/api/report-card/manual', {
          method: 'POST',
          body: payload,
        })
        setUploadModal(false)
        loadReportCards()
        setSelectedCard(res)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const subjects = selectedCard?.parsed_data?.subjects || []
  const insights = selectedCard?.ai_insights || {}

  return (
    <div className="report-card-page">
      {/* Top Hero Banner */}
      <div className="hero" style={{ borderRadius: 20, boxShadow: '0 12px 30px rgba(0,0,0,0.12)', marginBottom: 24 }}>
        <div className="flex wrap between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>📊 تحلیل کارنامه و ارزیابی هوشمند آزمون‌ها</h2>
              <span className="badge" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 12 }}>
                خیلی سبز · قلم‌چی · گاج · سنجش · آزمون‌های مدرسه
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.9 }}>
              تصویر یا PDF کارنامه خود را بارگذاری کنید تا هوش مصنوعی درصدها، تراز، نمودارهای پیشرفت و نقاط ضعف/قوت شما را استخراج کند.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              style={{ borderRadius: 12, padding: '10px 18px', background: '#fff', color: '#4f46e5', fontWeight: 700 }}
              onClick={() => setUploadModal(true)}
            >
              📤 بارگذاری کارنامه جدید
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      {/* Main Content: Card List & Details */}
      {loading ? (
        <div className="empty">در حال بارگذاری کارنامه‌ها...</div>
      ) : reportCards.length === 0 ? (
        <Card style={{ borderRadius: 20, padding: 40, textAlign: 'center', opacity: 0.85 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📑</div>
          <h3>هنوز کارنامه‌ای ثبت نشده است</h3>
          <p className="muted" style={{ maxWidth: 500, margin: '0 auto 20px auto' }}>
            با بارگذاری اولین کارنامه آزمون آزمایشی (خیلی سبز، قلم‌چی یا مدرسه)، جداول دقیق درصدها، نمودارهای تحلیلی و پرونده تحلیلی هوش مصنوعی فعال می‌شود.
          </p>
          <button className="btn" style={{ borderRadius: 12, padding: '10px 24px' }} onClick={() => setUploadModal(true)}>
            📤 بارگذاری اولین کارنامه آزمایشی
          </button>

          {/* Dimmed Placeholder Preview */}
          <div style={{ marginTop: 36, opacity: 0.35, filter: 'grayscale(60%)', pointerEvents: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 16, height: 160, display: 'grid', placeItems: 'center' }}>
                نمودار تراز و درصد دروس (پس از بارگذاری فعال می‌شود)
              </div>
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 16, height: 160, display: 'grid', placeItems: 'center' }}>
                جدول مقایسه‌ای با میانگین کشوری (خیلی سبز)
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card selector bar */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {reportCards.map((rc) => (
              <button
                key={rc.id}
                onClick={() => setSelectedCard(rc)}
                style={{
                  background: selectedCard?.id === rc.id ? '#4f46e5' : '#ffffff',
                  color: selectedCard?.id === rc.id ? '#ffffff' : '#1e293b',
                  border: selectedCard?.id === rc.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <span>📊</span>
                <span>{rc.title}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>({rc.provider})</span>
              </button>
            ))}
          </div>

          {selectedCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card Meta & Download Dossier PDF */}
              <Card style={{ borderRadius: 18, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: 20 }}>{selectedCard.title}</h3>
                    <div className="small muted" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>صادرکننده: <b>{selectedCard.provider}</b></span>
                      <span>تاریخ آزمون: <b>{fa(selectedCard.exam_date || 'نامشخص')}</b></span>
                      {selectedCard.total_traz && <span>تراز کل: <b style={{ color: '#4f46e5' }}>{fa(selectedCard.total_traz)}</b></span>}
                      {selectedCard.overall_rank && <span>رتبه آزمون: <b>{fa(selectedCard.overall_rank)}</b></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <a
                      href={`/api/report-card/pdf/${selectedCard.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{
                        borderRadius: 12,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      📄 دریافت فایل PDF پرونده جامع عملکرد
                    </a>
                  </div>
                </div>
              </Card>

              {/* Visual Performance Charts & Table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {/* Visual Bars Chart */}
                <Card style={{ borderRadius: 18, padding: 22 }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: 16 }}>📊 نمودار مقایسه‌ای درصد دروس با میانگین</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {subjects.map((s, idx) => {
                      const pct = s.percentage ?? s.score ?? 0
                      const avg = s.class_average ?? 35
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                            <b>{s.subject}</b>
                            <span style={{ fontWeight: 600, color: pct >= 60 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626' }}>
                              درصد شما: {fa(pct)}٪ (میانگین: {fa(avg)}٪)
                            </span>
                          </div>
                          <div style={{ background: '#f1f5f9', height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                background: pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444',
                                width: `${Math.min(100, Math.max(5, pct))}%`,
                                height: '100%',
                                borderRadius: 6,
                              }}
                            />
                            {/* Average Marker */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${avg}%`,
                                top: 0,
                                bottom: 0,
                                width: 2,
                                background: '#334155',
                              }}
                              title={`میانگین: ${avg}%`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Score & Traz Breakdown Table */}
                <Card style={{ borderRadius: 18, padding: 22 }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: 16 }}>📋 ریزنمرات، درصد و تراز تخصصی</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', textAlign: 'start' }}>
                      <thead>
                        <tr>
                          <th>نام درس</th>
                          <th>درصد</th>
                          <th>تراز</th>
                          <th>میانگین</th>
                          <th>وضعیت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((s, idx) => {
                          const pct = s.percentage ?? s.score ?? 0
                          const avg = s.class_average ?? 35
                          const isHigh = pct >= avg
                          return (
                            <tr key={idx}>
                              <td><b>{s.subject}</b></td>
                              <td>{fa(pct)}٪</td>
                              <td><b style={{ color: '#4f46e5' }}>{fa(s.traz || '—')}</b></td>
                              <td>{fa(avg)}٪</td>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: 11,
                                    background: isHigh ? '#dcfce7' : '#fee2e2',
                                    color: isHigh ? '#15803d' : '#b91c1c',
                                  }}
                                >
                                  {isHigh ? 'بالاتر از میانگین' : 'نیاز به تمرین'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* AI Diagnostic Summary & Recommendations */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* AI Diagnostic Box */}
                <Card style={{ borderRadius: 18, padding: 22, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                    <h4 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>جمع‌بندی و تحلیل تشخیصی هوش مصنوعی</h4>
                  </div>
                  <div className="small" style={{ color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {insights.diagnostic_summary || 'تحلیل در حال پردازش است...'}
                  </div>

                  {insights.recommendations?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <b className="small" style={{ color: '#4f46e5', display: 'block', marginBottom: 6 }}>💡 راهکارهای پیشنهادی هوش مصنوعی:</b>
                      <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        {insights.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                {/* Strengths & Weaknesses Cards */}
                <Card style={{ borderRadius: 18, padding: 22 }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: 16 }}>🎯 دروس محوری و نقاط نیازمند ارتقا</h4>

                  <div style={{ marginBottom: 16 }}>
                    <span className="small muted" style={{ display: 'block', marginBottom: 6 }}>نقاط قوت شناسایی شده:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(insights.strengths || ['زیست‌شناسی', 'ادبیات فارسی']).map((item, idx) => (
                        <Badge key={idx} color="#22c55e">✓ {item}</Badge>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <span className="small muted" style={{ display: 'block', marginBottom: 6 }}>نقاط نیازمند توجه و تمرین بیشتر:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(insights.weaknesses || ['فیزیک', 'ریاضی']).map((item, idx) => (
                        <Badge key={idx} color="#ef4444">✕ {item}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="small muted" style={{ display: 'block', marginBottom: 6 }}>اولویت مطالعه هفتگی:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(insights.focus_subjects || ['فیزیک', 'شیمی']).map((item, idx) => (
                        <Badge key={idx} color="#6366f1">🔥 {item}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload / Add Report Card Modal */}
      {uploadModal && (
        <Modal title="📤 بارگذاری و تحلیل کارنامه آزمون آزمایشی" onClose={() => setUploadModal(false)}>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
              <button
                type="button"
                className="btn sm"
                style={{
                  flex: 1,
                  background: uploadMode === 'file' ? '#4f46e5' : 'transparent',
                  color: uploadMode === 'file' ? '#fff' : '#64748b',
                  borderRadius: 8,
                }}
                onClick={() => setUploadMode('file')}
              >
                📁 بارگذاری فایل (عکس یا PDF)
              </button>
              <button
                type="button"
                className="btn sm"
                style={{
                  flex: 1,
                  background: uploadMode === 'manual' ? '#4f46e5' : 'transparent',
                  color: uploadMode === 'manual' ? '#fff' : '#64748b',
                  borderRadius: 8,
                }}
                onClick={() => setUploadMode('manual')}
              >
                ✍️ ثبت دستی درصدها
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="small muted">عنوان کارنامه:</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: آزمون مرحله ۳ خیلی سبز"
                  required
                />
              </div>

              <div>
                <label className="small muted">صادرکننده آزمون:</label>
                <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="خیلی سبز">خیلی سبز</option>
                  <option value="قلم‌چی">قلم‌چی</option>
                  <option value="گاج">گاج</option>
                  <option value="سنجش">سنجش</option>
                  <option value="مدرسه">مدرسه / آزمون کلاسی</option>
                  <option value="سایر">سایر</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="small muted">تاریخ آزمون:</label>
                <input
                  type="date"
                  className="input"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              <div>
                <label className="small muted">تراز کل (اختیاری):</label>
                <input
                  type="number"
                  className="input"
                  placeholder="مثلا 6500"
                  value={totalTraz}
                  onChange={(e) => setTotalTraz(e.target.value)}
                />
              </div>

              <div>
                <label className="small muted">رتبه کل (اختیاری):</label>
                <input
                  type="number"
                  className="input"
                  placeholder="مثلا 120"
                  value={overallRank}
                  onChange={(e) => setOverallRank(e.target.value)}
                />
              </div>
            </div>

            {uploadMode === 'file' ? (
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: 14, padding: 20, textAlign: 'center', background: '#f8fafc' }}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                  id="reportCardFileInput"
                />
                <label htmlFor="reportCardFileInput" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                  <b>{file ? file.name : 'انتخاب تصویر یا PDF کارنامه آزمون'}</b>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    فرمت‌های مجاز: JPG, PNG, PDF (خیلی سبز، قلم‌چی یا مدرسه)
                  </div>
                </label>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="small muted">درصدهای دروس را وارد کنید:</label>
                  <button type="button" className="btn ghost sm" onClick={addManualRow}>+ افزودن درس</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {manualRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="input"
                        placeholder="نام درس"
                        value={row.subject}
                        onChange={(e) => handleManualRowChange(idx, 'subject', e.target.value)}
                        style={{ flex: 1.5 }}
                      />
                      <input
                        className="input"
                        type="number"
                        placeholder="درصد"
                        value={row.percentage}
                        onChange={(e) => handleManualRowChange(idx, 'percentage', parseFloat(e.target.value) || 0)}
                        style={{ width: 68 }}
                      />
                      <input
                        className="input"
                        type="number"
                        placeholder="تراز"
                        value={row.traz}
                        onChange={(e) => handleManualRowChange(idx, 'traz', parseInt(e.target.value) || 0)}
                        style={{ width: 78 }}
                      />
                      <input
                        className="input"
                        type="number"
                        placeholder="میانگین"
                        value={row.class_average}
                        onChange={(e) => handleManualRowChange(idx, 'class_average', parseFloat(e.target.value) || 0)}
                        style={{ width: 72 }}
                      />
                      <button type="button" className="btn ghost sm danger" onClick={() => removeManualRow(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex mt" style={{ justifyContent: 'space-between', marginTop: 14 }}>
              <button type="button" className="btn ghost" onClick={() => setUploadModal(false)}>انصراف</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'در حال تحلیل و ثبت...' : '🚀 ثبت و تحلیل هوشمند کارنامه'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="btn ghost" onClick={() => navigate('#/dashboard')}>← بازگشت به داشبورد</button>
      </div>
    </div>
  )
}
