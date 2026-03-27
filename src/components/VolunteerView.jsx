// VolunteerView.jsx
import React, { useState, useEffect } from 'react'
import supabase from '../lib/supabase.js'

export default function VolunteerView() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('volunteers').select('*').order('created_at').then(({ data }) => {
      setVolunteers(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>

  const lunch = volunteers.filter(v => v.category === 'lunch')
  const exam  = volunteers.filter(v => v.category === 'exam_supervisor')
  const dele  = volunteers.filter(v => v.category === 'delegate')

  const sem1 = exam.filter(v => v.semester === '1학기')
  const sem2 = exam.filter(v => v.semester === '2학기')

  return (
    <div className="stagger">
      {/* 급식 모니터링 */}
      <TableCard title="🍱 급식 모니터링" sub="날짜 추후 공지"
        headers={['시간', '학생', '학부모']}
        rows={lunch.map(v => [v.time_slot, v.student_name, v.parent_name])}
      />

      {/* 시험감독 1학기 */}
      <TableCard title="📝 시험감독 명단 — 1학기" sub=""
        headers={['시험', '날짜', '학생', '학부모']}
        rows={sem1.map(v => [v.exam_type, v.exam_date, v.student_name, v.parent_name])}
      />

      {/* 시험감독 2학기 */}
      <TableCard title="📝 시험감독 명단 — 2학기" sub=""
        headers={['시험', '날짜', '학생', '학부모']}
        rows={sem2.map(v => [v.exam_type, v.exam_date, v.student_name, v.parent_name])}
      />

      {/* 대의원 */}
      <TableCard title="🏅 학급 대의원 명단" sub=""
        headers={['학생', '학부모']}
        rows={dele.map(v => [v.student_name, v.parent_name])}
      />
    </div>
  )
}

function TableCard({ title, sub, headers, rows }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: '16px'
    }}>
      <div style={{
        background: 'var(--primary)', color: '#fff',
        padding: '13px 18px', fontSize: '14px', fontWeight: 700
      }}>
        {title}
        {sub && <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8, marginLeft: '8px' }}>{sub}</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f0f4fb' }}>
              {headers.map(h => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: 'left',
                  color: 'var(--primary)', fontWeight: 700,
                  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '10px 14px', color: 'var(--text)' }}>{cell || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
