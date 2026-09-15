import { useEffect, useRef, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { FIELDS_FA, GRADES_FA, useLang, tSubject } from '../i18n.jsx'
import { Badge, Card, Empty, Modal, Stat } from '../ui.jsx'

const SUBJECTS = ['ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'ادبیات فارسی', 'زبان انگلیسی', 'عربی', 'دین و زندگی', 'حسابان', 'هندسه', 'گسسته', 'فلسفه و منطق', 'جامعه‌شناسی', 'اقتصاد']
const GOALS = ['امتحانات نهایی', 'کنکور سراسری', 'هر دو (کنکور و نهایی)']

export default function AdminDashboard({ section = 'stats', navigate }) {
  const { t, grades, lang } = useLang()
  const tab = section  // active pane is driven by the slide-bar route
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [mentors, setMentors] = useState([])
  const [questions, setQuestions] = useState([])
  const [curriculumSources, setCurriculumSources] = useState([])
  const [mentorModal, setMentorModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [editMentor, setEditMentor] = useState(null)
  const [qModal, setQModal] = useState(null)
  const [currModal, setCurrModal] = useState(false)
  const [aiGenModal, setAiGenModal] = useState(null)
  const [aiGenCount, setAiGenCount] = useState(5)
  const [aiGenDifficulty, setAiGenDifficulty] = useState('medium')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [activeQSubtab, setActiveQSubtab] = useState('curriculum') // 'questions' | 'curriculum'
  const [jsonBatchModal, setJsonBatchModal] = useState(false)
  const [rawJsonInput, setRawJsonInput] = useState('')
  const [batchImporting, setBatchImporting] = useState(false)
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const jsonRef = useRef(null)
  const xlsxRef = useRef(null)

  const handleImportBatchJson = async () => {
    if (!rawJsonInput.trim()) return
    setBatchImporting(true)
    setError('')
    setImportMsg('')
    try {
      const res = await api('/api/admin/curriculum/import-batch-json', {
        method: 'POST',
        body: { batch_json: rawJsonInput },
      })
      if (res.ok) {
        setImportMsg(`✅ تعداد ${res.imported_sources} سرفصل و ${res.imported_questions} سوال با موفقیت به بانک سوالات اضافه شد.`)
        setJsonBatchModal(false)
        setRawJsonInput('')
        load('curriculum')
        load('questions')
        load('stats')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBatchImporting(false)
    }
  }

  const doImport = async (kind) => {
    const file = (kind === 'json' ? jsonRef : xlsxRef).current?.files?.[0]
    if (!file) return
    setImportMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api(`/api/admin/questions/import/${kind}`, { method: 'POST', form: fd })
      const errTxt = r.error_count ? ` · ${r.error_count} خطا (اولین: ${(r.errors || [])[0]})` : ''
      setImportMsg(`✅ ${fa(r.imported)} ${t('importedOk')}${errTxt}`)
      load('questions'); load('stats'); load('curriculum')
    } catch (e) {
      setImportMsg('⚠️ ' + e.message)
    }
    if (kind === 'json') jsonRef.current.value = ''
    else xlsxRef.current.value = ''
  }

  const load = async (which) => {
    try {
      if (which === 'stats') setStats(await api('/api/admin/stats'))
      if (which === 'students') setStudents(await api('/api/admin/students'))
      if (which === 'mentors') setMentors(await api('/api/admin/mentors'))
      if (which === 'questions') setQuestions(await api('/api/admin/questions'))
      if (which === 'curriculum') {
        const res = await api('/api/admin/curriculum')
        if (res.ok && res.sources) setCurriculumSources(res.sources)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load('stats')
    load('students')
    load('mentors')
    load('questions')
    load('curriculum')
  }, [])

  const createMentor = async (form) => {
    setError('')
    try {
      await api('/api/admin/mentors', { method: 'POST', body: form })
      setMentorModal(false)
      load('mentors'); load('stats')
    } catch (e) {
      setError(e.message)
    }
  }

  const toggleMentor = async (id) => {
    await api(`/api/admin/mentors/${id}/toggle`, { method: 'PATCH' })
    load('mentors')
  }

  const saveStudent = async (form) => {
    setError('')
    try {
      const body = { ...form }
      if (!body.password) delete body.password
      await api(`/api/admin/students/${form.id}`, { method: 'PATCH', body })
      setEditStudent(null)
      load('students')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteStudent = async (id, name) => {
    if (!window.confirm(`آیا از حذف حساب کاربری دانش‌آموز «${name}» اطمینان دارید؟`)) return
    try {
      await api(`/api/admin/students/${id}`, { method: 'DELETE' })
      load('students'); load('stats')
    } catch (e) {
      setError(e.message)
    }
  }

  const saveMentor = async (form) => {
    setError('')
    try {
      const body = { ...form }
      if (!body.password) delete body.password
      await api(`/api/admin/mentors/${form.id}`, { method: 'PATCH', body })
      setEditMentor(null)
      load('mentors')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteMentor = async (id, name) => {
    if (!window.confirm(`آیا از حذف مشاور «${name}» اطمینان دارید؟`)) return
    try {
      await api(`/api/admin/mentors/${id}`, { method: 'DELETE' })
      load('mentors'); load('stats')
    } catch (e) {
      setError(e.message)
    }
  }

  const saveQuestion = async (form) => {
    setError('')
    try {
      if (form.id) {
        await api(`/api/admin/questions/${form.id}`, { method: 'PATCH', body: form })
      } else {
        await api('/api/admin/questions', { method: 'POST', body: form })
      }
      setQModal(null)
      load('questions'); load('stats')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteQuestion = async (id) => {
    if (!window.confirm('آیا از حذف این سوال اطمینان دارید؟')) return
    try {
      await api(`/api/admin/questions/${id}`, { method: 'DELETE' })
      setQModal(null)
      load('questions'); load('stats')
    } catch (e) {
      setError(e.message)
    }
  }

  const syncCurriculumQuestions = async () => {
    setImportMsg('')
    setError('')
    try {
      const res = await api('/api/admin/curriculum/sync-to-bank', { method: 'POST' })
      if (res.ok) {
        setImportMsg(`✅ ${res.message}`)
        load('questions')
        load('stats')
      }
    } catch (e) {
      setError(e.message)
    }
  }

  // Curriculum Sources Actions
  const createCurriculumSource = async (form) => {
    setError('')
    try {
      await api('/api/admin/curriculum', { method: 'POST', body: form })
      setCurrModal(false)
      load('curriculum')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteCurriculumSource = async (id) => {
    if (!window.confirm('آیا از حذف این منبع درسی اطمینان دارید؟')) return
    try {
      await api(`/api/admin/curriculum/${id}`, { method: 'DELETE' })
      load('curriculum')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleGenerateQuestionsFromSource = async () => {
    if (!aiGenModal) return
    setGeneratingAi(true)
    setError('')
    try {
      const res = await api(`/api/admin/curriculum/${aiGenModal.id}/generate-questions`, {
        method: 'POST',
        body: {
          count: parseInt(aiGenCount) || 5,
          difficulty: aiGenDifficulty,
        },
      })
      if (res.ok) {
        setAiGenModal(null)
        load('questions')
        load('stats')
        setImportMsg(`✅ تعداد ${fa(res.count_generated)} تست استاندارد کنکوری از مبحث «${res.source_title}» با موفقیت توسط هوش مصنوعی تولید و به بانک سوالات اضافه شد!`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setGeneratingAi(false)
    }
  }

  return (
    <div>
      <div className="hero">
        <h2>🛡️ {t('adminTitle')}</h2>
        <p>{t('adminSub')}</p>
      </div>

      {error && <div className="error-box mb">{error}</div>}

      {/* ── 4 Main Admin Statistics Cards Horizontally Side-by-Side at Top ── */}
      <div
        className="stats-row mb"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginTop: 18,
          marginBottom: 20,
        }}
      >
        <Stat
          label={lang === 'fa' ? 'تعداد کل دانش‌آموزان' : 'Total Students'}
          value={stats?.students ?? students.length}
          icon="👨‍🎓"
          color="#3b82f6"
        />
        <Stat
          label={lang === 'fa' ? 'تعداد کل مشاوران' : 'Active Mentors'}
          value={stats?.mentors ?? mentors.length}
          icon="🧑‍🏫"
          color="#a855f7"
        />
        <Stat
          label={lang === 'fa' ? 'بانک تست‌ها و سوالات' : 'Question Bank'}
          value={stats?.questions ?? questions.length}
          icon="📚"
          color="#10b981"
        />
        <Stat
          label={lang === 'fa' ? 'آزمون‌های برگزارشده' : 'Exams Taken'}
          value={stats?.attempts ?? 0}
          icon="📝"
          color="#f59e0b"
        />
      </div>

      {/* ── Quick Access Hub for Admin ── */}
      <div className="section-title" style={{ marginTop: 12, fontSize: 16 }}>⚡ {lang === 'fa' ? 'دسترسی سریع مدیریتی سامانه سیناپس' : 'Admin Operations Quick Hub'}</div>
      <div className="quick-hub-grid">
        <div
          className="quick-hub-card"
          onClick={() => (navigate ? navigate('#/admin/students') : (window.location.hash = '#/admin/students'))}
        >
          <div>
            <span className="quick-hub-icon">👨‍🎓</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'مدیریت دانش‌آموزان' : 'Student Management'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'مشاهده حساب‌ها، ترازها، رشته‌ها و ویرایش اطلاعات' : 'Roster of students, academic goals, scores & account controls'}</div>
          </div>
        </div>

        <div
          className="quick-hub-card"
          onClick={() => (navigate ? navigate('#/admin/mentors') : (window.location.hash = '#/admin/mentors'))}
        >
          <div>
            <span className="quick-hub-icon">🧑‍🏫</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'مدیریت مشاوران' : 'Mentor Management'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'ثبت مشاور جدید با کد اختصاصی MNT، فعال‌سازی و نظارت' : 'Register counselors with MNT code, oversee active quotas'}</div>
          </div>
        </div>

        <div
          className="quick-hub-card"
          onClick={() => {
            setActiveQSubtab('curriculum')
            if (navigate) navigate('#/admin/questions')
            else window.location.hash = '#/admin/questions'
          }}
        >
          <div>
            <span className="quick-hub-icon">📚</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'منابع درسی و AI' : 'Curriculum & AI Gen'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'تعریف سرفصل‌ها و تولید خودکار تست‌های کنکوری با AI' : 'Textbook topics and automated AI exam question generator'}</div>
          </div>
        </div>

        <div
          className="quick-hub-card"
          onClick={() => {
            setActiveQSubtab('questions')
            if (navigate) navigate('#/admin/questions')
            else window.location.hash = '#/admin/questions'
          }}
        >
          <div>
            <span className="quick-hub-icon">📝</span>
            <div className="quick-hub-title">{lang === 'fa' ? 'بانک تست و سوالات' : 'Question Bank'}</div>
            <div className="quick-hub-desc">{lang === 'fa' ? 'ایمپورت اکسل/JSON، ویرایش گزینه‌ها و پاسخ‌های تشریحی' : 'Import Excel/JSON tests, edit answers & full explanations'}</div>
          </div>
        </div>
      </div>

      {/* ── overview ── */}
      {tab === 'stats' && stats && (
        <Card>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 17 }}>📊 {lang === 'fa' ? 'سلامت و پایش سامانه' : 'System Health & Analytics'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="list-item between" style={{ margin: 0 }}>
              <span>{lang === 'fa' ? 'میانگین نمرات آزمون‌ها' : 'Average Exam Score'}</span>
              <b>{stats.avg_score != null ? `${fa(stats.avg_score)} / ۲۰` : '—'}</b>
            </div>
            <div className="list-item between" style={{ margin: 0 }}>
              <span>{lang === 'fa' ? 'پیام‌ها و تیکت‌های پشتیبانی' : 'Support Inquiries'}</span>
              <b>{fa(stats.messages)}</b>
            </div>
            <div className="list-item between" style={{ margin: 0 }}>
              <span>{lang === 'fa' ? 'منابع درسی ثبت‌شده' : 'Curriculum Sources'}</span>
              <b>{fa(curriculumSources.length)} {lang === 'fa' ? 'سرفصل' : 'Topics'}</b>
            </div>
          </div>
        </Card>
      )}

      {/* ── students ── */}
      {tab === 'students' && (
        <>
          <div className="between mb">
            <h3>{t('tabStudents')} ({fa(students.length)})</h3>
          </div>
          <Card>
            {students.length === 0 && <Empty>{t('tabStudents')}…</Empty>}
            {students.map((s) => (
              <div key={s.id} className="list-item between">
                <div className="flex">
                  <div className="avatar">{s.full_name.slice(0, 1)}</div>
                  <div>
                    <b>{s.full_name}</b>
                    <div className="small muted">{s.email} · {s.phone || '—'}</div>
                  </div>
                </div>
                <div className="flex wrap" style={{ gap: 8 }}>
                  <Badge color="#3b82f6">{s.grade_level || '—'}</Badge>
                  <Badge color="#10b981">{s.field_of_study || '—'}</Badge>
                  <Badge color="#f59e0b">{t('mentor')}: {s.mentor_name || '—'}</Badge>
                  <button className="btn ghost sm" onClick={() => setEditStudent(s)}>{t('edit')}</button>
                  <button className="btn ghost sm danger" onClick={() => deleteStudent(s.id, s.full_name)}>حذف</button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ── mentors ── */}
      {tab === 'mentors' && (
        <>
          <div className="between mb">
            <h3>{t('tabMentors')} ({fa(mentors.length)})</h3>
            <button className="btn sm" onClick={() => setMentorModal(true)}>{t('newMentor')}</button>
          </div>
          <Card>
            {mentors.length === 0 && <Empty>{t('tabMentors')}…</Empty>}
            {mentors.map((m) => (
              <div key={m.id} className="list-item between">
                <div className="flex">
                  <div className="avatar">{m.full_name.slice(0, 1)}</div>
                  <div>
                    <b>{m.full_name}</b>
                    <div className="small muted">{m.email}</div>
                  </div>
                </div>
                <div className="flex wrap" style={{ gap: 8 }}>
                  <Badge color="#6366f1">{t('mentorCode')}: {m.code}</Badge>
                  <Badge color="#a855f7">{fa(m.student_count)} {t('studentsPerMentor')}</Badge>
                  <Badge color={m.is_active ? '#22c55e' : '#ef4444'}>
                    {m.is_active ? t('active') : t('inactive')}
                  </Badge>
                  <button className="btn ghost sm" onClick={() => toggleMentor(m.id)}>
                    {m.is_active ? t('deactivate') : t('activate')}
                  </button>
                  <button className="btn ghost sm" onClick={() => setEditMentor(m)}>{t('edit')}</button>
                  <button className="btn ghost sm danger" onClick={() => deleteMentor(m.id, m.full_name)}>{t('deleteMentor')}</button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ── question bank & curriculum sources ── */}
      {tab === 'questions' && (
        <>
          <div className="between mb wrap" style={{ gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className={`btn sm ${activeQSubtab === 'curriculum' ? '' : 'ghost'}`}
                style={{ borderRadius: 10, fontWeight: 700 }}
                onClick={() => setActiveQSubtab('curriculum')}
              >
                📚 منابع و سورس‌های درسی ({fa(curriculumSources.length)})
              </button>
              <button
                className={`btn sm ${activeQSubtab === 'questions' ? '' : 'ghost'}`}
                style={{ borderRadius: 10, fontWeight: 700 }}
                onClick={() => setActiveQSubtab('questions')}
              >
                📝 بانک تست‌ها و سوالات ({fa(questions.length)})
              </button>
            </div>

            <div className="flex wrap" style={{ gap: 8 }}>
              {activeQSubtab === 'curriculum' ? (
                <>
                  <button className="btn sm" style={{ background: '#4f46e5', color: '#fff' }} onClick={() => setCurrModal(true)}>
                    + {lang === 'fa' ? 'افزودن سرفصل دستی' : 'Add Source Manually'}
                  </button>
                  <button className="btn sm" style={{ background: '#0891b2', color: '#fff' }} onClick={() => setJsonBatchModal(true)}>
                    📋 {lang === 'fa' ? 'چسباندن متن JSON' : 'Paste JSON'}
                  </button>
                  <input ref={jsonRef} type="file" accept=".json,application/json" hidden
                    onChange={() => doImport('json')} />
                  <button className="btn ghost sm" onClick={() => jsonRef.current?.click()}>
                    📁 {lang === 'fa' ? 'آپلود فایل JSON' : 'Upload JSON'}
                  </button>
                </>
              ) : (
                <>
                  <input ref={jsonRef} type="file" accept=".json,application/json" hidden
                    onChange={() => doImport('json')} />
                  <input ref={xlsxRef} type="file" accept=".xlsx,.xlsm" hidden
                    onChange={() => doImport('excel')} />
                  <button className="btn ghost sm" onClick={() => jsonRef.current?.click()}>📥 {t('importJson')}</button>
                  <button className="btn sm" style={{ background: '#0891b2', color: '#fff' }} onClick={() => setJsonBatchModal(true)}>
                    📋 {lang === 'fa' ? 'چسباندن متن JSON' : 'Paste JSON'}
                  </button>
                  <button className="btn ghost sm" onClick={() => xlsxRef.current?.click()}>📊 {t('importExcel')}</button>
                  <button className="btn sm" style={{ background: '#059669', color: '#fff' }} onClick={syncCurriculumQuestions}>
                    🔄 {lang === 'fa' ? 'بروزرسانی از سرفصل‌ها' : 'Sync from Curriculum'}
                  </button>
                  <button className="btn sm" onClick={() => setQModal('new')}>{t('newQuestion')}</button>
                </>
              )}
            </div>
          </div>

          {importMsg && (
            <div className={`mb ${importMsg.startsWith('✅') ? 'ok-box' : 'error-box'}`}>{importMsg}</div>
          )}

          {/* Subtab 1: Curriculum Sources & AI Generator */}
          {activeQSubtab === 'curriculum' && (
            <div>
              {curriculumSources.length === 0 && (
                <Card>
                  <Empty>
                    {lang === 'fa'
                      ? 'هنوز هیچ منبع یا سرفصل درسی ثبت نشده است. با افزودن منبع درسی، می‌توانید تست‌های استاندارد کنکوری را با هوش مصنوعی مستقیماً تولید و به بانک سوالات تزریق کنید.'
                      : 'No curriculum sources logged yet. Add textbook chapters to let AI automatically generate standard exam questions and inject them into the question bank.'}
                  </Empty>
                </Card>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {curriculumSources.map((cs) => (
                  <Card key={cs.id} style={{ borderRadius: 16, padding: 18, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="between mb" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <b style={{ fontSize: 15, color: 'var(--ink)' }}>{cs.title}</b>
                          <div className="small muted" style={{ marginTop: 2 }}>{tSubject(cs.subject, lang)} · {cs.chapter_name || (lang === 'fa' ? 'کل کتاب' : 'Entire Book')}</div>
                        </div>
                        <span className="tag" style={{ background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700 }}>
                          {cs.grade_level} · {cs.field_of_study}
                        </span>
                      </div>

                      {cs.summary_text && (
                        <div className="curriculum-summary-box">
                          {cs.summary_text.slice(0, 160)}{cs.summary_text.length > 160 ? '...' : ''}
                        </div>
                      )}
                    </div>

                    <div className="between" style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                      <button
                        className="btn sm"
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          color: '#fff',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '6px 12px',
                        }}
                        onClick={() => setAiGenModal(cs)}
                      >
                        ✨ {lang === 'fa' ? 'تولید تست‌های کنکور با AI' : 'Generate Konkur MCQs with AI'}
                      </button>
                      <button
                        className="btn ghost sm danger"
                        style={{ borderRadius: 8, fontSize: 12 }}
                        onClick={() => deleteCurriculumSource(cs.id)}
                      >
                        🗑️ {lang === 'fa' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 2: Question Bank Table */}
          {activeQSubtab === 'questions' && (
            <Card>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>{t('subjectCol')}</th><th>{t('model')}</th><th>{t('difficultyShort')}</th>
                    <th>{t('questionText')}</th><th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 && <tr><td colSpan={6} className="empty">{t('tabQuestions')}…</td></tr>}
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td>{fa(q.id)}</td>
                      <td>{q.subject}</td>
                      <td><Badge color="#6366f1">{t('type_' + q.type)}</Badge></td>
                      <td>{fa('●'.repeat(q.difficulty))}</td>
                      <td style={{ maxWidth: 340 }}>{q.text.slice(0, 70)}{q.text.length > 70 ? '…' : ''}</td>
                      <td>
                        <div className="flex">
                          <button className="btn ghost sm" onClick={() => setQModal(q)}>{t('edit')}</button>
                          <button className="btn ghost sm danger" onClick={() => deleteQuestion(q.id)}>{t('deleteQ')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {mentorModal && (
        <Modal title={t('createMentor')} onClose={() => setMentorModal(false)}>
          <MentorForm onSubmit={createMentor} t={t} />
        </Modal>
      )}

      {editStudent && (
        <Modal title={`${t('editStudent')}: ${editStudent.full_name}`} onClose={() => setEditStudent(null)}>
          <StudentEditForm student={editStudent} onSubmit={saveStudent} t={t} />
        </Modal>
      )}

      {editMentor && (
        <Modal title={`${t('editMentor')}: ${editMentor.full_name}`} onClose={() => setEditMentor(null)}>
          <MentorEditForm mentor={editMentor} onSubmit={saveMentor} t={t} />
        </Modal>
      )}

      {qModal && (
        <Modal title={qModal === 'new' ? t('addQuestion') : t('editQuestion')} onClose={() => setQModal(null)} wide>
          <QuestionForm question={qModal === 'new' ? null : qModal} onSubmit={saveQuestion} onDelete={qModal !== 'new' ? () => deleteQuestion(qModal.id) : null} t={t} />
        </Modal>
      )}

      {/* Curriculum Source Add Modal */}
      {currModal && (
        <Modal title="📚 افزودن منبع و سرفصل درسی جدید" onClose={() => setCurrModal(false)} wide>
          <CurriculumForm onSubmit={createCurriculumSource} />
        </Modal>
      )}

      {/* JSON Batch Import Modal */}
      {jsonBatchModal && (
        <Modal title="📋 ورود و تحلیل دسته‌ای سرفصل و سوالات (JSON Batch Import)" onClose={() => setJsonBatchModal(false)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="small muted" style={{ margin: 0 }}>
              {lang === 'fa'
                ? 'متن خروجی هوش مصنوعی (ChatGPT / Claude / Gemini) که بر اساس پرامپت استاندارد تولید شده است را در کادر زیر قرار دهید. سیستم به طور خودکار سرفصل‌ها را ثبت کرده و سوالات تستی را به بانک سوالات تزریق می‌کند.'
                : 'Paste the JSON output generated by external LLMs (matching the standard Synapse curriculum schema). The system will ingest chapters and question items automatically without duplicates.'}
            </p>
            <textarea
              className="input"
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: 12.5, direction: 'ltr', textAlign: 'left' }}
              placeholder='{\n  "curriculum_units": [\n    {\n      "title": "زیست‌شناسی ۳",\n      "grade_level": "دوازدهم",\n      ...\n    }\n  ]\n}'
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
            />
            <div className="flex between" style={{ marginTop: 8 }}>
              <button className="btn ghost sm" type="button" onClick={() => setJsonBatchModal(false)}>
                {lang === 'fa' ? 'انصراف' : 'Cancel'}
              </button>
              <button
                className="btn sm"
                style={{ background: '#0891b2', color: '#fff' }}
                disabled={batchImporting || !rawJsonInput.trim()}
                onClick={handleImportBatchJson}
              >
                {batchImporting
                  ? (lang === 'fa' ? 'در حال پردازش...' : 'Ingesting...')
                  : (lang === 'fa' ? '🚀 ثبت سرفصل و تزریق سوالات به بانک' : '🚀 Ingest Chapters & Questions')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Exam Question Generator Modal */}
      {aiGenModal && (
        <Modal title={`✨ تولید هوشمند تست برای «${aiGenModal.title}»`} onClose={() => setAiGenModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <b style={{ fontSize: 13, color: '#1e293b' }}>درس: {aiGenModal.subject} · {aiGenModal.chapter_name || 'سرفصل اصلی'}</b>
              <div className="small muted">پایه {aiGenModal.grade_level} · رشته {aiGenModal.field_of_study}</div>
            </div>

            <label className="field">
              <span style={{ fontWeight: 800 }}>تعداد تست‌های موردنظر:</span>
              <input
                type="number"
                min="1"
                max="20"
                className="input"
                value={aiGenCount}
                onChange={(e) => setAiGenCount(e.target.value)}
              />
            </label>

            <label className="field">
              <span style={{ fontWeight: 800 }}>سطح دشواری تست‌ها:</span>
              <select
                className="input"
                value={aiGenDifficulty}
                onChange={(e) => setAiGenDifficulty(e.target.value)}
              >
                <option value="easy">🟢 آسان (تثبیت و تسلط اولیه)</option>
                <option value="medium">🟡 متوسط (استاندارد کنکور سراسری)</option>
                <option value="hard">🔴 دشوار / چالشی (تراز برتر)</option>
              </select>
            </label>

            <div className="flex between" style={{ marginTop: 10 }}>
              <button type="button" className="btn ghost" onClick={() => setAiGenModal(null)}>انصراف</button>
              <button
                type="button"
                className="btn"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 800 }}
                disabled={generatingAi}
                onClick={handleGenerateQuestionsFromSource}
              >
                {generatingAi ? '✨ در حال تولید سوالات توسط AI...' : '🚀 تولید و ذخیره در بانک سوالات'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CurriculumForm({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState(GRADES_FA[0])
  const [field, setField] = useState(FIELDS_FA[0])
  const [subject, setSubject] = useState('زیست‌شناسی')
  const [chapter, setChapter] = useState('')
  const [summary, setSummary] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      title,
      grade_level: grade,
      field_of_study: field,
      subject,
      chapter_name: chapter,
      summary_text: summary,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label className="field">
        <span>عنوان منبع درسی:</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: زیست‌شناسی دوازدهم - فصل ۲ (جریان اطلاعات در یاخته)" required />
      </label>

      <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field">
          <span>پایه تحصیلی:</span>
          <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES_FA.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="field">
          <span>رشته تحصیلی:</span>
          <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
            {FIELDS_FA.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field">
          <span>عنوان درس:</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: شیمی، فیزیک، حسابان..." required />
        </label>
        <label className="field">
          <span>نام فصل / مبحث:</span>
          <input className="input" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="مثلاً: فصل ۱ - ساختار اتم و پیوندها" />
        </label>
      </div>

      <label className="field">
        <span>خلاصه مفاهیم، نکات کلیدی و سرفصل‌ها (جهت استفاده هوش مصنوعی):</span>
        <textarea
          className="input"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="نکات کلیدی، فرمول‌ها، روابط و تعاریف مهم این فصل..."
        />
      </label>

      <button className="btn block" style={{ marginTop: 10 }}>💾 ثبت سرفصل منبع درسی</button>
    </form>
  )
}

function MentorForm({ onSubmit, t }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', code: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <label className="field"><span>{t('nameLabel')}</span><input className="input" value={form.full_name} onChange={set('full_name')} required /></label>
      <label className="field"><span>{t('emailLabel')}</span><input className="input" type="email" value={form.email} onChange={set('email')} required /></label>
      <label className="field"><span>{t('passwordLabel')}</span><input className="input" type="password" value={form.password} onChange={set('password')} minLength={9} required />
        <div className="hint">{t('pwHint')}</div>
      </label>
      <label className="field"><span>{t('mentorCodeLabel')} (MNT…)</span><input className="input" value={form.code} onChange={set('code')} required /></label>
      <button className="btn block">{t('createMentor')}</button>
    </form>
  )
}

function StudentEditForm({ student, onSubmit, t }) {
  const [form, setForm] = useState({
    id: student.id,
    full_name: student.full_name || '',
    email: student.email || '',
    phone: student.phone || '',
    password: '',
    field_of_study: student.field_of_study || FIELDS_FA[0],
    grade_level: student.grade_level || GRADES_FA[0],
    goal_type: student.goal_type || GOALS[1],
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <label className="field"><span>{t('nameLabel')}</span><input className="input" value={form.full_name} onChange={set('full_name')} required /></label>
      <div className="two-col">
        <label className="field"><span>{t('emailLabel')}</span><input className="input" type="email" value={form.email} onChange={set('email')} required /></label>
        <label className="field"><span>{t('phoneLabel')}</span><input className="input" value={form.phone} onChange={set('phone')} /></label>
      </div>
      <label className="field"><span>{t('passwordLabel')} (— {t('edit')})</span><input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
        <div className="hint">{t('pwHint')}</div>
      </label>
      <div className="two-col">
        <label className="field">
          <span>{t('gradeLabel')}</span>
          <select className="input" value={form.grade_level} onChange={set('grade_level')}>
            {GRADES_FA.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t('fieldOfStudy')}</span>
          <select className="input" value={form.field_of_study} onChange={set('field_of_study')}>
            {FIELDS_FA.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{t('goal')}</span>
        <select className="input" value={form.goal_type} onChange={set('goal_type')}>
          {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <button className="btn block">{t('save')}</button>
    </form>
  )
}

function MentorEditForm({ mentor, onSubmit, t }) {
  const [form, setForm] = useState({
    id: mentor.id,
    full_name: mentor.full_name || '',
    email: mentor.email || '',
    phone: mentor.phone || '',
    code: mentor.code || '',
    password: '',
    is_active: mentor.is_active !== false,
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <label className="field"><span>{t('nameLabel')}</span><input className="input" value={form.full_name} onChange={set('full_name')} required /></label>
      <div className="two-col">
        <label className="field"><span>{t('emailLabel')}</span><input className="input" type="email" value={form.email} onChange={set('email')} required /></label>
        <label className="field"><span>{t('phoneLabel')}</span><input className="input" value={form.phone} onChange={set('phone')} /></label>
      </div>
      <label className="field"><span>{t('passwordLabel')} (— {t('edit')})</span><input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
        <div className="hint">{t('pwHint')}</div>
      </label>
      <label className="field"><span>{t('mentorCode')}</span><input className="input" value={form.code} onChange={set('code')} required /></label>
      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        <span>{t('active')}</span>
      </label>
      <button className="btn block">{t('save')}</button>
    </form>
  )
}

function QuestionForm({ question, onSubmit, onDelete, t }) {
  const [form, setForm] = useState(
    question || {
      subject: SUBJECTS[0],
      type: 'mcq',
      difficulty: 2,
      text: '',
      options: ['', '', '', ''],
      answer: '0',
      explanation: '',
    }
  )
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setOpt = (i) => (e) => {
    const copy = [...(form.options || [])]
    copy[i] = e.target.value
    setForm({ ...form, options: copy })
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, options: form.type === 'mcq' ? form.options.filter((o) => o.trim()) : [] }) }}>
      <div className="two-col">
        <label className="field">
          <span>{t('subjectCol')}</span>
          <select className="input" value={form.subject} onChange={set('subject')}>
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t('model')}</span>
          <select className="input" value={form.type} onChange={set('type')}>
            <option value="mcq">{t('type_mcq')}</option>
            <option value="essay">{t('type_essay')}</option>
            <option value="fill">{t('type_fill')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('difficultyShort')} (1–4)</span>
          <select className="input" value={form.difficulty} onChange={set('difficulty')}>
            <option value={1}>{t('diff_1')}</option>
            <option value={2}>{t('diff_2')}</option>
            <option value={3}>{t('diff_3')}</option>
            <option value={4}>{t('diff_4')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('yourAnswer')}</span>
          <input className="input" value={form.answer} onChange={set('answer')}
            placeholder={form.type === 'mcq' ? '0–3' : form.type === 'fill' ? '…' : '|'} />
        </label>
      </div>

      <label className="field"><span>{t('questionText')}</span>
        <textarea className="input" rows={3} value={form.text} onChange={set('text')} required />
      </label>

      {form.type === 'mcq' && (
        <div className="two-col">
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="field">
              <span>{t('optionNumber', { n: fa(i + 1) })} {form.answer === String(i) ? '✓' : ''}</span>
              <input className="input" value={(form.options || [])[i] || ''} onChange={setOpt(i)} />
            </label>
          ))}
        </div>
      )}

      <label className="field"><span>{t('explanation')}</span>
        <textarea className="input" rows={2} value={form.explanation} onChange={set('explanation')} />
      </label>

      <div className="flex between">
        {onDelete && <button type="button" className="btn ghost danger" onClick={onDelete}>{t('deleteQ')}</button>}
        <button className="btn">{t('save')}</button>
      </div>
    </form>
  )
}
