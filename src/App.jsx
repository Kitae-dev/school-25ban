import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import { AdminAuthProvider, useAdminAuth } from './lib/adminAuth.jsx'

function ProtectedAdmin() {
  const { isAdmin } = useAdminAuth()
  return isAdmin ? <Admin /> : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<ProtectedAdmin />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  )
}

function AdminLogin() {
  const { login, isAdmin } = useAdminAuth()
  const [pw, setPw] = React.useState('')
  const [err, setErr] = React.useState('')
  if (isAdmin) return <Navigate to="/admin" replace />

  const handle = (e) => {
    e.preventDefault()
    if (!login(pw)) setErr('비밀번호가 올바르지 않습니다')
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px 32px',
        width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontFamily: 'Noto Serif KR', fontSize: '20px', color: 'var(--primary)' }}>
            관리자 로그인
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
            대표학부모 전용
          </p>
        </div>
        <form onSubmit={handle}>
          <input
            type="password"
            placeholder="관리자 비밀번호"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr('') }}
            style={{
              width: '100%', padding: '14px 16px', border: '1.5px solid var(--border)',
              borderRadius: '10px', fontSize: '15px', outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {err && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '14px', background: 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: '700', marginTop: '16px',
            transition: 'opacity 0.2s'
          }}>
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}

import React from 'react'
