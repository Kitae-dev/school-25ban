import React, { useState, useEffect } from 'react'
import supabase from '../lib/supabase.js'

const CAT_META = {
  teacher:    { icon: '👩‍🏫', label: '담임선생님', color: '#dbeafe' },
  uniform:    { icon: '👔', label: '교복',     color: '#ffedd5' },
  sports:     { icon: '👟', label: '체육복',   color: '#fef3c7' },
  parent_rep: { icon: '👤', label: '대표학부모', color: '#ede9fe' },
}

export default function ContactView() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contacts').select('*').order('sort_order').then(({ data }) => {
      setContacts(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>

  const sections = [
    { key: 'teacher',    label: '🏫 학교 연락처' },
    { key: 'parent_rep', label: '👥 대표학부모' },
    { key: 'sports',     label: '🛍️ 교복 · 체육복' },
    { key: 'uniform',    label: null },
  ]

  return (
    <div className="stagger">
      <InfoBanner />
      {['teacher','parent_rep','sports','uniform'].reduce((acc, cat, i, arr) => {
        const items = contacts.filter(c => c.category === cat)
        if (!items.length) return acc

        const isNewGroup = cat === 'teacher' || cat === 'parent_rep' ||
          (cat === 'sports' && !contacts.find(c => c.category === 'uniform'))
        const label = cat === 'teacher' ? '🏫 학교 연락처'
          : cat === 'parent_rep' ? '👥 대표학부모'
          : (cat === 'sports' || cat === 'uniform') ? '🛍️ 교복 · 체육복' : null

        if (cat === 'sports') {
          acc.push(
            <p key="label-shop" style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px',
              color: 'var(--muted)', margin: '16px 0 10px'
            }}>🛍️ 교복 · 체육복</p>
          )
        } else if (cat !== 'uniform') {
          acc.push(
            <p key={`label-${cat}`} style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px',
              color: 'var(--muted)', margin: '16px 0 10px'
            }}>{label}</p>
          )
        }
        items.forEach(c => acc.push(<ContactCard key={c.id} contact={c} />))
        return acc
      }, [])}
    </div>
  )
}

function InfoBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4fb, #e8f0fe)',
      border: '1px solid #c7d7f8', borderRadius: '12px', padding: '14px 16px',
      display: 'flex', gap: '10px', marginBottom: '4px'
    }}>
      <span style={{ fontSize: '20px' }}>ℹ️</span>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
          학교 전화 안내
        </p>
        <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
          <strong>02-6480-</strong>으로 시작하는 번호는 학교에서 오는 전화입니다
        </p>
      </div>
    </div>
  )
}

function ContactCard({ contact }) {
  const meta = CAT_META[contact.category] || CAT_META.teacher

  const call = (phone) => {
    const clean = phone.replace(/[^0-9]/g, '')
    window.location.href = `tel:${clean}`
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      padding: '16px', marginBottom: '10px', boxShadow: 'var(--shadow)',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      transition: 'transform 0.15s, box-shadow 0.15s'
    }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        background: meta.color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '22px', flexShrink: 0
      }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>{contact.name}</h3>
        {contact.phone && (
          <button onClick={() => call(contact.phone)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'none', border: 'none', padding: 0,
            fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '3px'
          }}>
            📞 {contact.phone}
          </button>
        )}
        {contact.phone2 && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>{contact.phone2}</p>
        )}
        {contact.address && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>{contact.address}</p>
        )}
        {contact.website && (
          <a href={`https://${contact.website}`} target="_blank" rel="noreferrer" style={{
            fontSize: '12px', color: 'var(--primary)', fontWeight: 500
          }}>{contact.website}</a>
        )}
        {contact.note && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{contact.note}</p>
        )}
      </div>
    </div>
  )
}
