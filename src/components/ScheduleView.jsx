import React, { useState, useEffect } from 'react'
import supabase from '../lib/supabase.js'

const TYPE_META = {
  exam:    { label: '시험',  color: '#dc2626', bg: '#fee2e2' },
  holiday: { label: '휴일',  color: '#065f46', bg: '#d1fae5' },
  event:   { label: '행사',  color: '#6d28d9', bg: '#ede9fe' },
  break:   { label: '방학',  color: '#1d4ed8', bg: '#dbeafe' },
}

const MONTH_ORDER = ['3월','4월','5월','6월','7월','8월','9월','10월','11월','12월','1월','2월']

export default function ScheduleView() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [activeMonth, setActiveMonth] = useState(null)

  useEffect(() => {
    supabase.from('schedules').select('*').order('sort_order').then(({ data }) => {
      setSchedules(data || [])
      setLoading(false)
    })
  }, [])

  // 현재 달 기본 선택
  useEffect(() => {
    if (schedules.length && !activeMonth) {
      const now = new Date()
      const m = `${now.getMonth() + 1}월`
      setActiveMonth(schedules.some(s => s.month === m) ? m : schedules[0].month)
    }
  }, [schedules, activeMonth])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>

  // Group by month
  const grouped = {}
  schedules.forEach(s => {
    if (!grouped[s.month]) grouped[s.month] = []
    grouped[s.month].push(s)
  })
  const months = MONTH_ORDER.filter(m => grouped[m])

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Noto Serif KR', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
          2026 학사일정
        </h2>
        <div style={{
          display: 'flex', background: '#f0f4fb', borderRadius: '10px', padding: '3px'
        }}>
          {[['list','목록'],['calendar','월별']].map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '6px 14px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: viewMode === mode ? '#fff' : 'transparent',
              color: viewMode === mode ? 'var(--primary)' : 'var(--muted)',
              boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="stagger">
          {months.map(month => (
            <MonthGroup key={month} month={month} items={grouped[month]} />
          ))}
        </div>
      ) : (
        <CalendarView months={months} grouped={grouped} activeMonth={activeMonth} onMonthChange={setActiveMonth} />
      )}
    </div>
  )
}

function MonthGroup({ month, items }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '36px', height: '36px', background: 'var(--primary)', color: '#fff',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, flexShrink: 0
        }}>{month.replace('월','')}</div>
        <span style={{ fontFamily: 'Noto Serif KR', fontSize: '16px', fontWeight: 700 }}>{month}</span>
      </div>
      {items.map(item => <ScheduleRow key={item.id} item={item} />)}
    </div>
  )
}

function ScheduleRow({ item }) {
  const meta = TYPE_META[item.type] || TYPE_META.event
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: '10px',
      padding: '12px 14px', marginBottom: '7px', display: 'flex', alignItems: 'flex-start',
      gap: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'transform 0.15s'
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
        background: meta.bg, color: meta.color, flexShrink: 0, marginTop: '2px', whiteSpace: 'nowrap'
      }}>{meta.label}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>{item.date_str}</span>
        </div>
        {item.sub_title && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{item.sub_title}</p>
        )}
      </div>
    </div>
  )
}

function CalendarView({ months, grouped, activeMonth, onMonthChange }) {
  const idx = months.indexOf(activeMonth)
  const prev = () => onMonthChange(months[idx - 1])
  const next = () => onMonthChange(months[idx + 1])

  return (
    <div>
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={prev} disabled={idx === 0} style={{
          width: '36px', height: '36px', border: '1px solid var(--border)', background: '#fff',
          borderRadius: '10px', fontSize: '16px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'default' : 'pointer'
        }}>‹</button>
        <span style={{ fontFamily: 'Noto Serif KR', fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
          {activeMonth}
        </span>
        <button onClick={next} disabled={idx === months.length - 1} style={{
          width: '36px', height: '36px', border: '1px solid var(--border)', background: '#fff',
          borderRadius: '10px', fontSize: '16px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', opacity: idx === months.length - 1 ? 0.3 : 1,
          cursor: idx === months.length - 1 ? 'default' : 'pointer'
        }}>›</button>
      </div>

      {/* Month pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
        {months.map(m => (
          <button key={m} onClick={() => onMonthChange(m)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: '1.5px solid', transition: 'all 0.15s',
            borderColor: m === activeMonth ? 'var(--primary)' : 'var(--border)',
            background: m === activeMonth ? 'var(--primary)' : '#fff',
            color: m === activeMonth ? '#fff' : 'var(--muted)'
          }}>{m}</button>
        ))}
      </div>

      {/* Items */}
      {activeMonth && grouped[activeMonth] && (
        <div className="stagger">
          {grouped[activeMonth].map(item => <ScheduleRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
