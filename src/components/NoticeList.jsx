import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase.js'

const CATEGORY_META = {
  general:    { label: '일반',   color: '#2a4a7f', bg: '#dbeafe' },
  attendance: { label: '출결',   color: '#b45309', bg: '#fef3c7' },
  exam:       { label: '시험',   color: '#dc2626', bg: '#fee2e2' },
  event:      { label: '행사',   color: '#7c3aed', bg: '#ede9fe' },
  urgent:     { label: '긴급',   color: '#fff',    bg: '#dc2626' },
}

const EMOJIS = ['👍', '❤️', '😮', '🙏']

// 브라우저 세션 ID (익명 구분용)
function getSessionId() {
  let id = localStorage.getItem('session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('session_id', id)
  }
  return id
}

export default function NoticeList() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setNotices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel('notices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div className="spinner" />
    </div>
  )

  if (!notices.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
      <p>등록된 공지사항이 없습니다</p>
    </div>
  )

  const pinned = notices.filter(n => n.is_pinned)
  const normal = notices.filter(n => !n.is_pinned)

  return (
    <div className="stagger">
      {pinned.length > 0 && (
        <>
          <SectionLabel icon="📌" text="중요 공지" />
          {pinned.map(n => (
            <NoticeCard key={n.id} notice={n}
              expanded={expandedId === n.id}
              onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)}
            />
          ))}
        </>
      )}
      {normal.length > 0 && (
        <>
          <SectionLabel icon="📋" text="공지사항" />
          {normal.map(n => (
            <NoticeCard key={n.id} notice={n}
              expanded={expandedId === n.id}
              onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function SectionLabel({ icon, text }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px',
      color: 'var(--muted)', textTransform: 'uppercase',
      margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: '5px'
    }}>
      {icon} {text}
    </p>
  )
}

function NoticeCard({ notice, expanded, onToggle }) {
  const meta = CATEGORY_META[notice.category] || CATEGORY_META.general
  const date = new Date(notice.created_at).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric'
  })

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      marginBottom: '10px', boxShadow: 'var(--shadow)',
      transition: 'box-shadow 0.2s', overflow: 'hidden'
    }}>
      {/* Card header */}
      <div onClick={onToggle} style={{
        padding: '16px 18px', cursor: 'pointer',
        borderLeft: `4px solid ${notice.is_pinned ? '#c8935a' : meta.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '2px 8px',
            borderRadius: '20px', background: meta.bg, color: meta.color
          }}>{meta.label}</span>
          {notice.is_pinned && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px',
              borderRadius: '20px', background: '#fef3c7', color: '#b45309'
            }}>📌 고정</span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 'auto' }}>{date}</span>
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, color: 'var(--text)' }}>
          {notice.title}
        </h3>
        {!expanded && (
          <p style={{
            fontSize: '13px', color: 'var(--muted)', marginTop: '5px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{notice.body}</p>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {notice.body}
            </p>
          </div>
          <ReactionBar noticeId={notice.id} />
          <CommentSection noticeId={notice.id} />
        </div>
      )}
    </div>
  )
}

function ReactionBar({ noticeId }) {
  const sessionId = getSessionId()
  const [counts, setCounts] = useState({})
  const [myReactions, setMyReactions] = useState(new Set())

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reactions')
      .select('emoji, session_id')
      .eq('notice_id', noticeId)

    const c = {}
    const mine = new Set()
    ;(data || []).forEach(r => {
      c[r.emoji] = (c[r.emoji] || 0) + 1
      if (r.session_id === sessionId) mine.add(r.emoji)
    })
    setCounts(c)
    setMyReactions(mine)
  }, [noticeId, sessionId])

  useEffect(() => { load() }, [load])

  const toggle = async (emoji) => {
    if (myReactions.has(emoji)) {
      await supabase.from('reactions')
        .delete()
        .eq('notice_id', noticeId)
        .eq('emoji', emoji)
        .eq('session_id', sessionId)
    } else {
      await supabase.from('reactions').insert({ notice_id: noticeId, emoji, session_id: sessionId })
    }
    load()
  }

  return (
    <div style={{
      padding: '10px 18px', display: 'flex', gap: '8px',
      borderTop: '1px solid var(--border)', background: '#faf8f5'
    }}>
      {EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => toggle(emoji)} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 10px', border: '1.5px solid',
          borderColor: myReactions.has(emoji) ? 'var(--primary)' : 'var(--border)',
          background: myReactions.has(emoji) ? 'var(--primary-light)' : '#fff',
          borderRadius: '20px', fontSize: '14px', fontWeight: 600,
          color: myReactions.has(emoji) ? 'var(--primary)' : 'var(--muted)',
          transition: 'all 0.15s'
        }}>
          {emoji}
          {counts[emoji] ? <span style={{ fontSize: '12px' }}>{counts[emoji]}</span> : null}
        </button>
      ))}
    </div>
  )
}

function CommentSection({ noticeId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('comment_name') || '')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('notice_id', noticeId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }, [noticeId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!text.trim() || !name.trim()) return
    setSubmitting(true)
    localStorage.setItem('comment_name', name)
    await supabase.from('comments').insert({
      notice_id: noticeId,
      author_name: name.trim(),
      body: text.trim()
    })
    setText('')
    setShowForm(false)
    setSubmitting(false)
    load()
  }

  return (
    <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
          💬 댓글 {comments.length > 0 ? `${comments.length}개` : ''}
        </span>
        <button onClick={() => setShowForm(v => !v)} style={{
          fontSize: '12px', color: 'var(--primary)', fontWeight: 600,
          background: 'none', border: 'none', padding: 0
        }}>
          {showForm ? '취소' : '+ 댓글 쓰기'}
        </button>
      </div>

      {comments.map(c => (
        <div key={c.id} style={{
          background: '#f7f5f2', borderRadius: '10px', padding: '10px 12px',
          marginBottom: '8px', fontSize: '13px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.author_name}</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          </div>
          <p style={{ color: '#374151', lineHeight: 1.6 }}>{c.body}</p>
        </div>
      ))}

      {showForm && (
        <div className="animate-slide-down" style={{
          background: '#f0f4fb', borderRadius: '10px', padding: '12px', marginTop: '8px'
        }}>
          <input
            placeholder="이름 (예: 홍길동 어머님)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '13px', marginBottom: '8px',
              background: '#fff', outline: 'none'
            }}
          />
          <textarea
            placeholder="댓글을 입력하세요..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '13px', resize: 'none',
              background: '#fff', outline: 'none', display: 'block'
            }}
          />
          <button onClick={submit} disabled={submitting || !text.trim() || !name.trim()} style={{
            marginTop: '8px', padding: '9px 20px', background: 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: 700, opacity: (!text.trim() || !name.trim()) ? 0.5 : 1,
            float: 'right'
          }}>
            {submitting ? '전송 중...' : '등록'}
          </button>
          <div style={{ clear: 'both' }} />
        </div>
      )}
    </div>
  )
}
