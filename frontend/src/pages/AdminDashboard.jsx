import { useEffect, useRef, useState } from 'react'
import { api, fa, faDate } from '../api.js'
import { useLang } from '../i18n.jsx'
import { Card, Stat, Badge, Modal, Empty } from '../ui.jsx'

const SUBJECTS = ['ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'ادبیات فارسی', 'زبان انگلیسی', 'عربی', 'دین و زندگی']
const GOALS = ['better_average', 'specific_subjects', 'konkur']

export default function AdminDashboard({ section = 'stats' }) {
  const { t, grades } = useLang()
  const tab = section  // active pane is driven by the slide-bar route
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [mentors, setMentors] = useState([])
  const [questions, setQuestions] = useState([])
  const [mentorModal, setMentorModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [editMentor, setEditMentor] = useState(null)
  const [qModal, setQModal] = useState(null)
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const jsonRef = useRef(null)
  const xlsxRef = useRef(null)

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
      load('questions'); load('stats')
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
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load('stats'); load('students'); load('mentors'); load('questions')
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
      load('students'); load('mentors')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteStudent = async (id, name) => {
    if (!window.confirm(`${t('deleteConfirm')}\n👨‍🎓 ${name}`)) return
    try {
      await api(`/api/admin/students/${id}`, { method: 'DELETE' })
      load('students'); load('stats'); load('mentors')
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
      load('mentors'); load('students')
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteMentor = async (id, name) => {
    if (!window.confirm(`${t('deleteConfirm')}\n🧑‍🏫 ${name}`)) return
    try {
      await api(`/api/admin/mentors/${id}`, { method: 'DELETE' })
      load('mentors'); load('stats'); load('students')
    } catch (e) {
      setError(e.message)
    }
  }

  const saveQuestion = async (form) => {
    setError('')
    try {
      if (form.id) {
        await api(`/api/admin/questions/${form.id}`, { method: 'PUT', body: form })
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
    if (!window.confirm(t('deleteConfirm'))) return
    await api(`/api/admin/questions/${id}`, { method: 'DELETE' })
    load('questions'); load('stats')
  }

  const isPreUni = (s) => ['پیش‌دانشگاهی / کنکوری', 'Pre-University / Konkur'].includes(s)

  return (
    <div>
      <div className="hero">
        <h2>{t('adminPanel')}</h2>
        <p>{t('adminSub')}</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* ── stats ── */}
      {tab === 'stats' && stats && (
        <div className="grid cols-4">
          <Stat label={t('studentsCount')} value={fa(stats.students)} icon="👨‍🎓" color="#eef2ff" />
          <Stat label={t('mentorsCount')} value={fa(stats.mentors)} icon="🧑‍🏫" color="#dcfce7" />
          <Stat label={t('questionsCount')} value={fa(stats.questions)} icon="📚" color="#fef3c7" />
          <Stat label={t('attemptsCount')} value={fa(stats.attempts)} icon="📝" color="#fce7f3" />
        </div>
      )}

      {/* ── students ── */}
      {tab === 'students' && (
        <Card>
          <div className="between mb">
            <h3>{t('tabStudents')} ({fa(students.length)})</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>{t('nameLabel')}</th><th>{t('emailLabel')}</th><th>{t('fieldOfStudy')}</th>
                <th>{t('avgCol')}</th><th>{t('goal')}</th><th>{t('mentorLabel')}</th><th>{t('memberSince')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && <tr><td colSpan={8} className="empty">{t('newStudent')}…</td></tr>}
              {students.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.full_name}</b></td>
                  <td className="muted">{s.email}</td>
                  <td>{s.field_of_study || '—'}</td>
                  <td>{s.last_year_avg != null ? fa(s.last_year_avg) : '—'}</td>
                  <td>{t('goal_' + s.goal_type) || s.goal_type || '—'}</td>
                  <td>{s.mentor || '—'}</td>
                  <td className="muted">{faDate(s.joined)}</td>
                  <td>
                    <div className="flex">
                      <button className="btn ghost sm" onClick={() => setEditStudent(s)}>{t('edit')}</button>
                      <button className="btn ghost sm danger" onClick={() => deleteStudent(s.id, s.full_name)}>{t('deleteStudent')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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

      {/* ── question bank ── */}
      {tab === 'questions' && (
        <>
          <div className="between mb wrap" style={{ gap: 8 }}>
            <h3>{t('tabQuestions')} ({fa(questions.length)})</h3>
            <div className="flex" style={{ gap: 8 }}>
              <input ref={jsonRef} type="file" accept=".json,application/json" hidden
                onChange={() => doImport('json')} />
              <input ref={xlsxRef} type="file" accept=".xlsx,.xlsm" hidden
                onChange={() => doImport('excel')} />
              <button className="btn ghost sm" onClick={() => jsonRef.current?.click()}>📥 {t('importJson')}</button>
              <button className="btn ghost sm" onClick={() => xlsxRef.current?.click()}>📊 {t('importExcel')}</button>
              <button className="btn sm" onClick={() => setQModal('new')}>{t('newQuestion')}</button>
            </div>
          </div>
          {importMsg && (
            <div className={`mb ${importMsg.startsWith('✅') ? 'ok-box' : 'error-box'}`}>{importMsg}</div>
          )}
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
        </>
      )}

      {mentorModal && (
        <Modal title={t('createMentor')} onClose={() => setMentorModal(false)}>
          <MentorForm onSubmit={createMentor} t={t} />
        </Modal>
      )}

      {editStudent && (
        <Modal title={`${t('editStudent')}: ${editStudent.full_name}`} onClose={() => setEditStudent(null)}>
          <StudentEditForm student={editStudent} onSubmit={saveStudent} t={t} grades={grades} isPreUni={isPreUni} />
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
    </div>
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

function StudentEditForm({ student, onSubmit, t, grades, isPreUni }) {
  const [form, setForm] = useState({
    id: student.id,
    full_name: student.full_name || '',
    email: student.email || '',
    phone: student.phone || '',
    password: '',
    field_of_study: student.field_of_study || '',
    grade_level: student.grade_level || grades[0],
    goal_type: isPreUni(student.grade_level) ? 'konkur' : (student.goal_type || 'better_average'),
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
            {grades.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="field"><span>{t('fieldOfStudy')}</span><input className="input" value={form.field_of_study} onChange={set('field_of_study')} /></label>
      </div>
      <label className="field">
        <span>{t('goal')}</span>
        <select className="input" value={form.goal_type} onChange={set('goal_type')}>
          {GOALS.map((g) => <option key={g} value={g}>{t('goal_' + g)}</option>)}
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
      <label className="field">
        <span>{t('questionText')}</span>
        <textarea className="input" rows={3} value={form.text} onChange={set('text')} required />
      </label>
      {form.type === 'mcq' && (
        <label className="field">
          <span>{t('options')}</span>
          <div className="subjects-grid">
            {form.options.map((o, i) => (
              <input key={i} className="input" value={o} onChange={setOpt(i)} placeholder={`${fa(i + 1)}`} required />
            ))}
          </div>
        </label>
      )}
      <label className="field">
        <span>{t('explanation')}</span>
        <textarea className="input" rows={2} value={form.explanation} onChange={set('explanation')} />
      </label>
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        {onDelete ? <button type="button" className="btn danger sm" onClick={onDelete}>{t('deleteQ')}</button> : <span />}
        <button className="btn">{t('save')}</button>
      </div>
    </form>
  )
}
