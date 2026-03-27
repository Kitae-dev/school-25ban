import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../lib/adminAuth.jsx'
import supabase from '../lib/supabase.js'

const ADMIN_TABS = [
  { id: 'notices',    label: '공지',   icon: '📢' },
  { id: 'schedules',  label: '일정',   icon: '📅' },
  { id: 'volunteers', label: '자원봉사', icon: '🙋' },
  { id: 'contacts',  label: '연락처',  icon: '📞' },
]

const CATEGORY_OPTIONS = [
  { value: 'general',    label: '일반' },
  { value: 'attendance', label: '출결' },
  { value: 'exam',       label: '시험' },
  { value: 'event',      label: '행사' },
  { value: 'urgent',     label: '긴급' },
]

export default function Admin() {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('notices')

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3560, #0f2040)',
        padding: '0', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)'
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Noto Serif KR', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              ⚙️ 관리자 페이지
            </h1>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>숙명여중 2-5반</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/')} style={{
              padding: '7px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px', color: '#fff', fontSize: '12px'
            }}>앱 보기</button>
            <button onClick={handleLogout} style={{
              padding: '7px 12px', background: 'rgba(220,38,38,0.8)', border: 'none',
              borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600
            }}>로그아웃</button>
          </div>
        </div>
      </header>

      {/* Admin Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: '64px', zIndex: 99 }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex' }}>
          {ADMIN_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '13px 8px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--primary)' : 'transparent'}`,
              transition: 'all 0.2s', fontFamily: 'Noto Sans KR'
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Admin Content */}
      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '20px 14px 40px' }}>
        {tab === 'notices'    && <NoticeAdmin />}
        {tab === 'schedules'  && <ScheduleAdmin />}
        {tab === 'volunteers' && <VolunteerAdmin />}
        {tab === 'contacts'   && <ContactAdmin />}
      </main>
    </div>
  )
}

// ---- NOTICE ADMIN ----
function NoticeAdmin() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_pinned: false })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false })
    setNotices(data || []); setLoading(false)
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
  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('notices').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing)
    } else {
      await supabase.from('notices').insert(form)
    }
    setSaving(false); setShowForm(false); load()
  }
  const del = async (id) => {
    if (!confirm('공지를 삭제하시겠습니까?')) return
    await supabase.from('notices').delete().eq('id', id); load()
  }

  return (
    <div>
      <AdminSectionHeader title="공지사항 관리" onAdd={openNew} />
      {showForm && (
        <NoticeForm form={form} setForm={setForm} onSave={save} onCancel={() => setShowForm(false)} saving={saving} editing={editing} />
      )}
      {loading ? <Spinner /> : notices.map(n => (
        <AdminRow key={n.id}
          left={<>
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: '#dbeafe', color: 'var(--primary)', marginRight: '6px' }}>
              {CATEGORY_OPTIONS.find(c => c.value === n.category)?.label}
            </span>
            {n.is_pinned && <span style={{ fontSize: '11px', marginRight: '6px' }}>📌</span>}
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</span>
          </>}
          right={<>
            <ActionBtn icon="✏️" onClick={() => openEdit(n)} />
            <ActionBtn icon="🗑️" onClick={() => del(n.id)} danger />
          </>}
          sub={<span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>}
        />
      ))}
    </div>
  )
}

function NoticeForm({ form, setForm, onSave, onCancel, saving, editing }) {
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="animate-slide-down" style={{
      background: '#f0f4fb', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #c7d7f8'
    }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
        {editing ? '공지 수정' : '새 공지 작성'}
      </h3>
      <FormField label="제목">
        <input value={form.title} onChange={e => F('title', e.target.value)} placeholder="공지 제목" style={inputStyle} />
      </FormField>
      <FormField label="내용">
        <textarea value={form.body} onChange={e => F('body', e.target.value)} placeholder="공지 내용" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
      </FormField>
      <FormField label="카테고리">
        <select value={form.category} onChange={e => F('category', e.target.value)} style={inputStyle}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FormField>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
        <input type="checkbox" checked={form.is_pinned} onChange={e => F('is_pinned', e.target.checked)} style={{ width: '16px', height: '16px' }} />
        📌 상단 고정
      </label>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...btnStyle, background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)' }}>취소</button>
        <button onClick={onSave} disabled={saving} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? '저장 중...' : editing ? '수정 완료' : '등록'}
        </button>
      </div>
    </div>
  )
}

// ---- SCHEDULE ADMIN ----
function ScheduleAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ month: '3월', date_str: '', title: '', sub_title: '', type: 'event', sort_order: 0 })
  const [saving, setSaving] = useState(false)

  const MONTHS = ['3월','4월','5월','6월','7월','8월','9월','10월','11월','12월','1월','2월']
  const TYPES = [{ value: 'exam', label: '시험' }, { value: 'holiday', label: '휴일' }, { value: 'event', label: '행사' }, { value: 'break', label: '방학' }]

  const load = useCallback(async () => {
    const { data } = await supabase.from('schedules').select('*').order('sort_order')
    setItems(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const openNew = () => { setEditing(null); setForm({ month: '3월', date_str: '', title: '', sub_title: '', type: 'event', sort_order: (items.length + 1) * 10 }); setShowForm(true) }
  const openEdit = (i) => { setEditing(i.id); setForm({ month: i.month, date_str: i.date_str, title: i.title, sub_title: i.sub_title || '', type: i.type, sort_order: i.sort_order }); setShowForm(true) }
  const save = async () => {
    setSaving(true)
    if (editing) await supabase.from('schedules').update(form).eq('id', editing)
    else await supabase.from('schedules').insert(form)
    setSaving(false); setShowForm(false); load()
  }
  const del = async (id) => { if (!confirm('삭제하시겠습니까?')) return; await supabase.from('schedules').delete().eq('id', id); load() }

  return (
    <div>
      <AdminSectionHeader title="학사일정 관리" onAdd={openNew} />
      {showForm && (
        <div className="animate-slide-down" style={{ background: '#f0f4fb', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #c7d7f8' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>{editing ? '일정 수정' : '새 일정 추가'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="월">
              <select value={form.month} onChange={e => F('month', e.target.value)} style={inputStyle}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="일자">
              <input value={form.date_str} onChange={e => F('date_str', e.target.value)} placeholder="예: 29~30일" style={inputStyle} />
            </FormField>
          </div>
          <FormField label="일정명">
            <input value={form.title} onChange={e => F('title', e.target.value)} placeholder="예: 1학기 중간고사" style={inputStyle} />
          </FormField>
          <FormField label="과목 / 비고">
            <input value={form.sub_title} onChange={e => F('sub_title', e.target.value)} placeholder="예: 국어, 수학, 과학, 영어" style={inputStyle} />
          </FormField>
          <FormField label="구분">
            <select value={form.type} onChange={e => F('type', e.target.value)} style={inputStyle}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => setShowForm(false)} style={{ ...btnStyle, background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)' }}>취소</button>
            <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}>{saving ? '저장 중...' : editing ? '수정' : '추가'}</button>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : items.map(item => (
        <AdminRow key={item.id}
          left={<><span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginRight: '8px' }}>{item.month} {item.date_str}</span><span style={{ fontSize: '14px' }}>{item.title}</span></>}
          right={<><ActionBtn icon="✏️" onClick={() => openEdit(item)} /><ActionBtn icon="🗑️" onClick={() => del(item.id)} danger /></>}
          sub={item.sub_title && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.sub_title}</span>}
        />
      ))}
    </div>
  )
}

// ---- VOLUNTEER ADMIN (Full CRUD) ----
const VOL_CATS = [
  { value: 'lunch',           label: '🍱 급식 모니터링' },
  { value: 'exam_supervisor', label: '📝 시험감독' },
  { value: 'delegate',        label: '🏅 학급 대의원' },
]
const SEMESTERS  = ['1학기', '2학기']
const EXAM_TYPES = ['중간', '기말']

const EMPTY_FORM = {
  category: 'lunch',
  time_slot: '',
  student_name: '',
  parent_name: '',
  semester: '1학기',
  exam_type: '중간',
  exam_date: '',
}

function VolunteerAdmin() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)   // null = 신규, id = 수정
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState('lunch') // 카테고리 탭 필터

  const load = useCallback(async () => {
    const { data } = await supabase.from('volunteers').select('*').order('created_at')
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category: activeTab })
    setShowForm(true)
  }

  const openEdit = (v) => {
    setEditing(v.id)
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

  const save = async () => {
    if (!form.student_name.trim() || !form.parent_name.trim()) {
      alert('학생 이름과 학부모 이름은 필수입니다.')
      return
    }
    setSaving(true)
    // 카테고리별로 불필요한 필드 정리
    const payload = { ...form }
    if (form.category !== 'lunch')           { payload.time_slot = null }
    if (form.category !== 'exam_supervisor') { payload.semester = null; payload.exam_type = null; payload.exam_date = null }

    if (editing) {
      await supabase.from('volunteers').update(payload).eq('id', editing)
    } else {
      await supabase.from('volunteers').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const del = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('volunteers').delete().eq('id', id)
    load()
  }

  const filtered = items.filter(v => v.category === activeTab)

  const catLabel = (cat) => VOL_CATS.find(c => c.value === cat)?.label || cat

  return (
    <div>
      <AdminSectionHeader title="자원봉사 관리" onAdd={openNew} />

      {/* 카테고리 탭 필터 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {VOL_CATS.map(cat => (
          <button key={cat.value} onClick={() => { setActiveTab(cat.value); setShowForm(false) }} style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: '1.5px solid',
            borderColor: activeTab === cat.value ? 'var(--primary)' : 'var(--border)',
            background: activeTab === cat.value ? 'var(--primary)' : '#fff',
            color: activeTab === cat.value ? '#fff' : 'var(--muted)',
            transition: 'all 0.15s', cursor: 'pointer'
          }}>{cat.label}</button>
        ))}
      </div>

      {/* 추가 / 수정 폼 */}
      {showForm && (
        <div className="animate-slide-down" style={{
          background: '#f0f4fb', borderRadius: '14px', padding: '20px',
          marginBottom: '16px', border: '1px solid #c7d7f8'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
            {editing ? '✏️ 항목 수정' : '➕ 새 항목 추가'} — {catLabel(form.category)}
          </h3>

          {/* 카테고리 선택 (신규만) */}
          {!editing && (
            <FormField label="구분">
              <select value={form.category} onChange={e => F('category', e.target.value)} style={inputStyle}>
                {VOL_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
          )}

          {/* 급식 모니터링 전용 */}
          {form.category === 'lunch' && (
            <FormField label="시간대">
              <input value={form.time_slot} onChange={e => F('time_slot', e.target.value)}
                placeholder="예: 오전 6:30~7:00" style={inputStyle} />
            </FormField>
          )}

          {/* 시험감독 전용 */}
          {form.category === 'exam_supervisor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <FormField label="학기">
                <select value={form.semester} onChange={e => F('semester', e.target.value)} style={inputStyle}>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="시험">
                <select value={form.exam_type} onChange={e => F('exam_type', e.target.value)} style={inputStyle}>
                  {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="날짜">
                <input value={form.exam_date} onChange={e => F('exam_date', e.target.value)}
                  placeholder="예: 4월 29일" style={inputStyle} />
              </FormField>
            </div>
          )}

          {/* 공통 필드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="학생 이름 *">
              <input value={form.student_name} onChange={e => F('student_name', e.target.value)}
                placeholder="홍길동" style={inputStyle} />
            </FormField>
            <FormField label="학부모 이름 *">
              <input value={form.parent_name} onChange={e => F('parent_name', e.target.value)}
                placeholder="홍길동 어머님" style={inputStyle} />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => setShowForm(false)} style={{ ...btnStyle, background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              취소
            </button>
            <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? '저장 중...' : editing ? '수정 완료' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '14px' }}>
          등록된 항목이 없습니다
        </div>
      ) : filtered.map(v => (
        <AdminRow key={v.id}
          left={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {v.student_name}
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '6px', fontSize: '13px' }}>
                  / {v.parent_name}
                </span>
              </span>
              {v.category === 'lunch' && v.time_slot && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>⏰ {v.time_slot}</span>
              )}
              {v.category === 'exam_supervisor' && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  📋 {v.semester} {v.exam_type}고사 — {v.exam_date}
                </span>
              )}
            </div>
          }
          right={
            <>
              <ActionBtn icon="✏️" onClick={() => { openEdit(v); setActiveTab(v.category) }} />
              <ActionBtn icon="🗑️" onClick={() => del(v.id)} danger />
            </>
          }
        />
      ))}
    </div>
  )
}

// ---- CONTACT ADMIN ----
function ContactAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ category: 'teacher', name: '', phone: '', phone2: '', address: '', website: '', note: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)

  const CATS = [{ value: 'teacher', label: '담임선생님' }, { value: 'parent_rep', label: '대표학부모' }, { value: 'sports', label: '체육복' }, { value: 'uniform', label: '교복' }]

  const load = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').order('sort_order')
    setItems(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const openNew = () => { setEditing(null); setForm({ category: 'teacher', name: '', phone: '', phone2: '', address: '', website: '', note: '', sort_order: (items.length + 1) * 10 }); setShowForm(true) }
  const openEdit = (i) => { setEditing(i.id); setForm({ category: i.category, name: i.name, phone: i.phone || '', phone2: i.phone2 || '', address: i.address || '', website: i.website || '', note: i.note || '', sort_order: i.sort_order }); setShowForm(true) }
  const save = async () => {
    setSaving(true)
    if (editing) await supabase.from('contacts').update(form).eq('id', editing)
    else await supabase.from('contacts').insert(form)
    setSaving(false); setShowForm(false); load()
  }
  const del = async (id) => { if (!confirm('삭제?')) return; await supabase.from('contacts').delete().eq('id', id); load() }

  return (
    <div>
      <AdminSectionHeader title="연락처 관리" onAdd={openNew} />
      {showForm && (
        <div className="animate-slide-down" style={{ background: '#f0f4fb', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #c7d7f8' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>{editing ? '수정' : '새 연락처'}</h3>
          <FormField label="분류"><select value={form.category} onChange={e => F('category', e.target.value)} style={inputStyle}>{CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></FormField>
          <FormField label="이름"><input value={form.name} onChange={e => F('name', e.target.value)} placeholder="이름 / 상호명" style={inputStyle} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="전화1"><input value={form.phone} onChange={e => F('phone', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="전화2"><input value={form.phone2} onChange={e => F('phone2', e.target.value)} style={inputStyle} /></FormField>
          </div>
          <FormField label="주소"><input value={form.address} onChange={e => F('address', e.target.value)} style={inputStyle} /></FormField>
          <FormField label="웹사이트"><input value={form.website} onChange={e => F('website', e.target.value)} style={inputStyle} /></FormField>
          <FormField label="비고"><input value={form.note} onChange={e => F('note', e.target.value)} style={inputStyle} /></FormField>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => setShowForm(false)} style={{ ...btnStyle, background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)' }}>취소</button>
            <button onClick={save} disabled={saving} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}>{saving ? '저장 중...' : editing ? '수정' : '추가'}</button>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : items.map(item => (
        <AdminRow key={item.id}
          left={<><span style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</span><span style={{ fontSize: '12px', color: 'var(--primary)', marginLeft: '8px' }}>{item.phone}</span></>}
          right={<><ActionBtn icon="✏️" onClick={() => openEdit(item)} /><ActionBtn icon="🗑️" onClick={() => del(item.id)} danger /></>}
          sub={<span style={{ fontSize: '12px', color: 'var(--muted)' }}>{CATS.find(c => c.value === item.category)?.label}</span>}
        />
      ))}
    </div>
  )
}

// ---- Shared UI ----
function AdminSectionHeader({ title, onAdd }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
      <h2 style={{ fontFamily: 'Noto Serif KR', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{title}</h2>
      {onAdd && (
        <button onClick={onAdd} style={{
          padding: '8px 16px', background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>+ 추가</button>
      )}
    </div>
  )
}

function AdminRow({ left, right, sub }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: '10px',
      padding: '13px 14px', marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {left}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>{right}</div>
      </div>
      {sub && <div style={{ marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function ActionBtn({ icon, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: '32px', height: '32px', border: '1px solid var(--border)',
      background: danger ? '#fff5f5' : '#f7f5f2', borderRadius: '8px',
      fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.15s'
    }}>{icon}</button>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)',
  borderRadius: '8px', fontSize: '14px', background: '#fff', outline: 'none',
  fontFamily: 'Noto Sans KR'
}

const btnStyle = {
  padding: '10px 20px', border: 'none', borderRadius: '8px',
  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR'
}
