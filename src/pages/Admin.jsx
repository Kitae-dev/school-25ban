import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../lib/adminAuth.jsx'
import { createClient } from '@supabase/supabase-js'

// ⭐ 관리자용 Supabase 클라이언트
// anon key는 RLS로 막혀있으므로, 관리자는 service_role key 없이
// RLS를 bypass하는 방법으로 Supabase Auth 대신 별도 정책 활용
// → schema.sql에서 anon에게 모든 권한 부여한 상태이므로 동일 클라이언트 사용
import supabase from '../lib/supabase.js'

const ADMIN_TABS = [
  { id: 'notices',    label: '공지',    icon: '📢' },
  { id: 'schedules',  label: '일정',    icon: '📅' },
  { id: 'volunteers', label: '자원봉사', icon: '🙋' },
  { id: 'contacts',   label: '연락처',  icon: '📞' },
]

const CATEGORY_OPTIONS = [
  { value: 'general',    label: '일반' },
  { value: 'attendance', label: '출결' },
  { value: 'exam',       label: '시험' },
  { value: 'event',      label: '행사' },
  { value: 'urgent',     label: '긴급' },
]

// ── 공통 스타일 ──────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid var(--border)', borderRadius: '8px',
  fontSize: '14px', background: '#fff', outline: 'none',
  fontFamily: 'Noto Sans KR', boxSizing: 'border-box',
}
const btnStyle = {
  padding: '10px 20px', border: 'none', borderRadius: '8px',
  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Noto Sans KR',
}
const formBoxStyle = {
  background: '#f0f4fb', borderRadius: '14px', padding: '20px',
  marginBottom: '16px', border: '1px solid #c7d7f8',
}

// ── 공통 헬퍼 ────────────────────────────────────────────
async function dbInsert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select()
  if (error) throw error
  return data
}
async function dbUpdate(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select()
  if (error) throw error
  return data
}
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// ── Admin 루트 ────────────────────────────────────────────
export default function Admin() {
  const { logout } = useAdminAuth()
  const navigate   = useNavigate()
  const [tab, setTab] = useState('notices')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #1a3560, #0f2040)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Noto Serif KR', fontSize: '16px', fontWeight: 700, color: '#fff' }}>⚙️ 관리자 페이지</h1>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>숙명여중 2-5반</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/')} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>앱 보기</button>
            <button onClick={() => { logout(); navigate('/') }} style={{ padding: '7px 12px', background: 'rgba(220,38,38,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>로그아웃</button>
          </div>
        </div>
      </header>

      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: '64px', zIndex: 99 }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex' }}>
          {ADMIN_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '13px 8px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--primary)' : 'transparent'}`,
              transition: 'all 0.2s', fontFamily: 'Noto Sans KR',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '20px 14px 40px' }}>
        {tab === 'notices'    && <NoticeAdmin />}
        {tab === 'schedules'  && <ScheduleAdmin />}
        {tab === 'volunteers' && <VolunteerAdmin />}
        {tab === 'contacts'   && <ContactAdmin />}
      </main>
    </div>
  )
}

// ── 공지 관리 ─────────────────────────────────────────────
function NoticeAdmin() {
  const [notices,   setNotices]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_pinned: false })
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    if (error) console.error('notices load error:', error)
    setNotices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', body: '', category: 'general', is_pinned: false })
    setShowForm(true)
  }
  const openEdit = (n) => {
    setEditing(n.id)
    setForm({ title: n.title, body: n.body, category: n.category, is_pinned: n.is_pinned })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    if (!form.title.trim()) { alert('제목을 입력해 주세요.'); return }
    if (!form.body.trim())  { alert('내용을 입력해 주세요.'); return }
    setSaving(true)
    try {
      if (editing) {
        await dbUpdate('notices', editing, {
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category,
          is_pinned: form.is_pinned,
          updated_at: new Date().toISOString(),
        })
      } else {
        await dbInsert('notices', {
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category,
          is_pinned: form.is_pinned,
        })
      }
      closeForm()
      await load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return
    try {
      await dbDelete('notices', id)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  return (
    <div>
      <SectionHeader title="공지사항 관리" onAdd={openNew} />

      {showForm && (
        <div className="animate-slide-down" style={formBoxStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
            {editing ? '✏️ 공지 수정' : '➕ 새 공지 작성'}
          </h3>
          <Field label="제목">
            <input value={form.title} onChange={e => F('title', e.target.value)} placeholder="공지 제목" style={inputStyle} />
          </Field>
          <Field label="내용">
            <textarea value={form.body} onChange={e => F('body', e.target.value)} placeholder="공지 내용을 입력하세요" rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="카테고리">
            <select value={form.category} onChange={e => F('category', e.target.value)} style={inputStyle}>
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
            <input type="checkbox" checked={form.is_pinned} onChange={e => F('is_pinned', e.target.checked)} style={{ width: '16px', height: '16px' }} />
            📌 상단 고정
          </label>
          <BtnRow onCancel={closeForm} onSave={save} saving={saving} editing={editing} />
        </div>
      )}

      {loading ? <Spinner /> : notices.length === 0 ? <Empty /> : notices.map(n => (
        <Row key={n.id}
          left={<>
            <Tag>{CATEGORY_OPTIONS.find(c => c.value === n.category)?.label}</Tag>
            {n.is_pinned && <span style={{ fontSize: '11px', marginRight: '4px' }}>📌</span>}
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</span>
          </>}
          sub={<span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(n.created_at).toLocaleDateString('ko-KR')} · {n.body.slice(0, 40)}{n.body.length > 40 ? '...' : ''}</span>}
          onEdit={() => openEdit(n)}
          onDel={() => del(n.id)}
        />
      ))}
    </div>
  )
}

// ── 학사일정 관리 ─────────────────────────────────────────
const MONTHS = ['3월','4월','5월','6월','7월','8월','9월','10월','11월','12월','1월','2월']
const SCHED_TYPES = [
  { value: 'exam',    label: '시험' },
  { value: 'holiday', label: '휴일' },
  { value: 'event',   label: '행사' },
  { value: 'break',   label: '방학' },
]
const EMPTY_SCHED = { month: '3월', date_str: '', title: '', sub_title: '', type: 'event' }

function ScheduleAdmin() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState(EMPTY_SCHED)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('schedules').select('*').order('sort_order')
    if (error) console.error('schedules load error:', error)
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_SCHED, sort_order: (items.length + 1) * 10 })
    setShowForm(true)
  }
  const openEdit = (i) => {
    setEditing(i.id)
    setForm({ month: i.month, date_str: i.date_str, title: i.title, sub_title: i.sub_title || '', type: i.type, sort_order: i.sort_order })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    if (!form.date_str.trim()) { alert('일자를 입력해 주세요.'); return }
    if (!form.title.trim())    { alert('일정명을 입력해 주세요.'); return }
    setSaving(true)
    try {
      const payload = {
        month: form.month,
        date_str: form.date_str.trim(),
        title: form.title.trim(),
        sub_title: form.sub_title.trim() || null,
        type: form.type,
        sort_order: Number(form.sort_order) || 0,
      }
      if (editing) {
        await dbUpdate('schedules', editing, payload)
      } else {
        await dbInsert('schedules', payload)
      }
      closeForm()
      await load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return
    try {
      await dbDelete('schedules', id)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  return (
    <div>
      <SectionHeader title="학사일정 관리" onAdd={openNew} />

      {showForm && (
        <div className="animate-slide-down" style={formBoxStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
            {editing ? '✏️ 일정 수정' : '➕ 새 일정 추가'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="월">
              <select value={form.month} onChange={e => F('month', e.target.value)} style={inputStyle}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="일자 *">
              <input value={form.date_str} onChange={e => F('date_str', e.target.value)} placeholder="예: 29~30일" style={inputStyle} />
            </Field>
          </div>
          <Field label="일정명 *">
            <input value={form.title} onChange={e => F('title', e.target.value)} placeholder="예: 1학기 중간고사" style={inputStyle} />
          </Field>
          <Field label="과목 / 비고">
            <input value={form.sub_title} onChange={e => F('sub_title', e.target.value)} placeholder="예: 국어, 수학, 과학, 영어" style={inputStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="구분">
              <select value={form.type} onChange={e => F('type', e.target.value)} style={inputStyle}>
                {SCHED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="정렬 순서">
              <input type="number" value={form.sort_order} onChange={e => F('sort_order', e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <BtnRow onCancel={closeForm} onSave={save} saving={saving} editing={editing} />
        </div>
      )}

      {loading ? <Spinner /> : items.length === 0 ? <Empty /> : items.map(item => (
        <Row key={item.id}
          left={<>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginRight: '8px', flexShrink: 0 }}>{item.month} {item.date_str}</span>
            <span style={{ fontSize: '14px' }}>{item.title}</span>
          </>}
          sub={item.sub_title && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.sub_title}</span>}
          onEdit={() => openEdit(item)}
          onDel={() => del(item.id)}
        />
      ))}
    </div>
  )
}

// ── 자원봉사 관리 ─────────────────────────────────────────
const VOL_CATS = [
  { value: 'lunch',           label: '🍱 급식 모니터링' },
  { value: 'exam_supervisor', label: '📝 시험감독' },
  { value: 'delegate',        label: '🏅 학급 대의원' },
]
const SEMESTERS  = ['1학기', '2학기']
const EXAM_TYPES = ['중간', '기말']
const EMPTY_VOL  = { category: 'lunch', time_slot: '', student_name: '', parent_name: '', semester: '1학기', exam_type: '중간', exam_date: '' }

function VolunteerAdmin() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState('lunch')
  const [form, setForm] = useState(EMPTY_VOL)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('volunteers').select('*').order('created_at')
    if (error) console.error('volunteers load error:', error)
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_VOL, category: activeTab })
    setShowForm(true)
  }
  const openEdit = (v) => {
    setEditing(v.id)
    setActiveTab(v.category)
    setForm({
      category:     v.category,
      time_slot:    v.time_slot    || '',
      student_name: v.student_name || '',
      parent_name:  v.parent_name  || '',
      semester:     v.semester     || '1학기',
      exam_type:    v.exam_type    || '중간',
      exam_date:    v.exam_date    || '',
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    if (!form.student_name.trim()) { alert('학생 이름을 입력해 주세요.'); return }
    if (!form.parent_name.trim())  { alert('학부모 이름을 입력해 주세요.'); return }
    setSaving(true)
    try {
      const payload = {
        category:     form.category,
        student_name: form.student_name.trim(),
        parent_name:  form.parent_name.trim(),
        time_slot:    form.category === 'lunch'           ? (form.time_slot.trim() || null) : null,
        semester:     form.category === 'exam_supervisor' ? form.semester  : null,
        exam_type:    form.category === 'exam_supervisor' ? form.exam_type : null,
        exam_date:    form.category === 'exam_supervisor' ? (form.exam_date.trim() || null) : null,
      }
      if (editing) {
        await dbUpdate('volunteers', editing, payload)
      } else {
        await dbInsert('volunteers', payload)
      }
      closeForm()
      await load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    try {
      await dbDelete('volunteers', id)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  const filtered = items.filter(v => v.category === activeTab)

  return (
    <div>
      <SectionHeader title="자원봉사 관리" onAdd={openNew} />

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {VOL_CATS.map(cat => (
          <button key={cat.value} onClick={() => { setActiveTab(cat.value); setShowForm(false); setEditing(null) }} style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
            borderColor: activeTab === cat.value ? 'var(--primary)' : 'var(--border)',
            background:  activeTab === cat.value ? 'var(--primary)' : '#fff',
            color:       activeTab === cat.value ? '#fff' : 'var(--muted)',
          }}>{cat.label}</button>
        ))}
      </div>

      {showForm && (
        <div className="animate-slide-down" style={formBoxStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
            {editing ? '✏️ 항목 수정' : '➕ 새 항목 추가'} — {VOL_CATS.find(c => c.value === form.category)?.label}
          </h3>

          {/* 카테고리 선택 (신규만) */}
          {!editing && (
            <Field label="구분">
              <select value={form.category} onChange={e => { F('category', e.target.value); setActiveTab(e.target.value) }} style={inputStyle}>
                {VOL_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          )}

          {/* 급식 전용 */}
          {form.category === 'lunch' && (
            <Field label="시간대">
              <input value={form.time_slot} onChange={e => F('time_slot', e.target.value)} placeholder="예: 오전 6:30~7:00" style={inputStyle} />
            </Field>
          )}

          {/* 시험감독 전용 */}
          {form.category === 'exam_supervisor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Field label="학기">
                <select value={form.semester} onChange={e => F('semester', e.target.value)} style={inputStyle}>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="시험">
                <select value={form.exam_type} onChange={e => F('exam_type', e.target.value)} style={inputStyle}>
                  {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="날짜">
                <input value={form.exam_date} onChange={e => F('exam_date', e.target.value)} placeholder="예: 4월 29일" style={inputStyle} />
              </Field>
            </div>
          )}

          {/* 공통 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="학생 이름 *">
              <input value={form.student_name} onChange={e => F('student_name', e.target.value)} placeholder="홍길동" style={inputStyle} />
            </Field>
            <Field label="학부모 이름 *">
              <input value={form.parent_name} onChange={e => F('parent_name', e.target.value)} placeholder="홍길동 어머님" style={inputStyle} />
            </Field>
          </div>
          <BtnRow onCancel={closeForm} onSave={save} saving={saving} editing={editing} />
        </div>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty /> : filtered.map(v => (
        <Row key={v.id}
          left={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {v.student_name}
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '6px', fontSize: '13px' }}>/ {v.parent_name}</span>
              </span>
              {v.category === 'lunch' && v.time_slot && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>⏰ {v.time_slot}</span>
              )}
              {v.category === 'exam_supervisor' && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>📋 {v.semester} {v.exam_type}고사 — {v.exam_date}</span>
              )}
            </div>
          }
          onEdit={() => openEdit(v)}
          onDel={() => del(v.id)}
        />
      ))}
    </div>
  )
}

// ── 연락처 관리 ───────────────────────────────────────────
const CONTACT_CATS = [
  { value: 'teacher',    label: '담임선생님' },
  { value: 'parent_rep', label: '대표학부모' },
  { value: 'sports',     label: '체육복' },
  { value: 'uniform',    label: '교복' },
]
const EMPTY_CONTACT = { category: 'teacher', name: '', phone: '', phone2: '', address: '', website: '', note: '', sort_order: '' }

function ContactAdmin() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState(EMPTY_CONTACT)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('contacts').select('*').order('sort_order')
    if (error) console.error('contacts load error:', error)
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_CONTACT, sort_order: String((items.length + 1) * 10) })
    setShowForm(true)
  }
  const openEdit = (i) => {
    setEditing(i.id)
    setForm({
      category:   i.category,
      name:       i.name       || '',
      phone:      i.phone      || '',
      phone2:     i.phone2     || '',
      address:    i.address    || '',
      website:    i.website    || '',
      note:       i.note       || '',
      sort_order: String(i.sort_order ?? ''),
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    if (!form.name.trim()) { alert('이름을 입력해 주세요.'); return }
    setSaving(true)
    try {
      const payload = {
        category:   form.category,
        name:       form.name.trim(),
        phone:      form.phone.trim()   || null,
        phone2:     form.phone2.trim()  || null,
        address:    form.address.trim() || null,
        website:    form.website.trim() || null,
        note:       form.note.trim()    || null,
        sort_order: Number(form.sort_order) || 0,
      }
      if (editing) {
        await dbUpdate('contacts', editing, payload)
      } else {
        await dbInsert('contacts', payload)
      }
      closeForm()
      await load()
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('이 연락처를 삭제하시겠습니까?')) return
    try {
      await dbDelete('contacts', id)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  return (
    <div>
      <SectionHeader title="연락처 관리" onAdd={openNew} />

      {showForm && (
        <div className="animate-slide-down" style={formBoxStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
            {editing ? '✏️ 연락처 수정' : '➕ 새 연락처 추가'}
          </h3>
          <Field label="분류">
            <select value={form.category} onChange={e => F('category', e.target.value)} style={inputStyle}>
              {CONTACT_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="이름 / 상호명 *">
            <input value={form.name} onChange={e => F('name', e.target.value)} placeholder="예: 이학선 담임선생님" style={inputStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="전화번호 1">
              <input value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="02-0000-0000" style={inputStyle} />
            </Field>
            <Field label="전화번호 2">
              <input value={form.phone2} onChange={e => F('phone2', e.target.value)} placeholder="010-0000-0000" style={inputStyle} />
            </Field>
          </div>
          <Field label="주소">
            <input value={form.address} onChange={e => F('address', e.target.value)} placeholder="주소를 입력하세요" style={inputStyle} />
          </Field>
          <Field label="웹사이트">
            <input value={form.website} onChange={e => F('website', e.target.value)} placeholder="www.example.com" style={inputStyle} />
          </Field>
          <Field label="비고">
            <input value={form.note} onChange={e => F('note', e.target.value)} placeholder="추가 메모" style={inputStyle} />
          </Field>
          <Field label="정렬 순서">
            <input type="number" value={form.sort_order} onChange={e => F('sort_order', e.target.value)} placeholder="10" style={inputStyle} />
          </Field>
          <BtnRow onCancel={closeForm} onSave={save} saving={saving} editing={editing} />
        </div>
      )}

      {loading ? <Spinner /> : items.length === 0 ? <Empty /> : items.map(item => (
        <Row key={item.id}
          left={<>
            <Tag>{CONTACT_CATS.find(c => c.value === item.category)?.label}</Tag>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</span>
            {item.phone && <span style={{ fontSize: '12px', color: 'var(--primary)', marginLeft: '8px' }}>{item.phone}</span>}
          </>}
          sub={item.address && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.address}</span>}
          onEdit={() => openEdit(item)}
          onDel={() => del(item.id)}
        />
      ))}
    </div>
  )
}

// ── 공통 UI 컴포넌트 ──────────────────────────────────────
function SectionHeader({ title, onAdd }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
      <h2 style={{ fontFamily: 'Noto Serif KR', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{title}</h2>
      {onAdd && (
        <button onClick={onAdd} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          + 추가
        </button>
      )}
    </div>
  )
}

function Row({ left, sub, onEdit, onDel }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '13px 14px', marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', overflow: 'hidden' }}>
          {left}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <Btn icon="✏️" onClick={onEdit} />
          <Btn icon="🗑️" onClick={onDel} danger />
        </div>
      </div>
      {sub && <div style={{ marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}

function Btn({ icon, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: '32px', height: '32px', border: '1px solid var(--border)',
      background: danger ? '#fff5f5' : '#f7f5f2', borderRadius: '8px',
      fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>{icon}</button>
  )
}

function BtnRow({ onCancel, onSave, saving, editing }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
      <button onClick={onCancel} style={{ ...btnStyle, background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)' }}>취소</button>
      <button onClick={onSave} disabled={saving} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
        {saving ? '저장 중...' : editing ? '수정 완료' : '등록'}
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#dbeafe', color: 'var(--primary)', flexShrink: 0 }}>
      {children}
    </span>
  )
}

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
}

function Empty() {
  return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '14px' }}>등록된 항목이 없습니다</div>
}
