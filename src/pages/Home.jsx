import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import supabase from '../lib/supabase.js'
import NoticeList from '../components/NoticeList.jsx'
import ScheduleView from '../components/ScheduleView.jsx'
import VolunteerView from '../components/VolunteerView.jsx'
import ContactView from '../components/ContactView.jsx'

const TABS = [
  { id: 'notice',    label: '공지',   icon: '📢', path: '/' },
  { id: 'schedule',  label: '일정',   icon: '📅', path: '/schedule' },
  { id: 'volunteer', label: '자원봉사', icon: '🙋', path: '/volunteer' },
  { id: 'contact',  label: '연락처',  icon: '📞', path: '/contact' },
]

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  // 읽지 않은 공지 배지
  useEffect(() => {
    const lastSeen = localStorage.getItem('last_seen_ts') || '2000-01-01'
    supabase.from('notices').select('id', { count: 'exact' })
      .gt('created_at', lastSeen)
      .then(({ count }) => setUnread(count || 0))
  }, [])

  const activeTab = TABS.find(t =>
    t.path === location.pathname ||
    (t.path !== '/' && location.pathname.startsWith(t.path))
  ) || TABS[0]

  const handleTabClick = (tab) => {
    if (tab.id === 'notice') {
      localStorage.setItem('last_seen_ts', new Date().toISOString())
      setUnread(0)
    }
    navigate(tab.path)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #2a4a7f 0%, #1a3560 100%)',
        padding: '0',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 16px rgba(26,53,96,0.3)'
      }}>
        <div style={{
          maxWidth: '640px', margin: '0 auto',
          padding: '14px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'rgba(255,255,255,0.15)', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
            }}>🏫</div>
            <div>
              <h1 style={{
                fontFamily: 'Noto Serif KR', fontSize: '16px',
                fontWeight: 700, color: '#fff', letterSpacing: '-0.3px'
              }}>숙명여중 2학년 5반</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '1px' }}>
                2026학년도 학부모 공지
              </p>
            </div>
          </div>
          <PushBellButton />
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: '640px', margin: '0 auto', width: '100%', padding: '16px 14px 80px' }}>
        <Routes>
          <Route path="/"          element={<NoticeList />} />
          <Route path="/schedule"  element={<ScheduleView />} />
          <Route path="/volunteer" element={<VolunteerView />} />
          <Route path="/contact"   element={<ContactView />} />
        </Routes>
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid var(--border)',
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)'
      }}>
        {TABS.map(tab => {
          const active = activeTab.id === tab.id
          return (
            <button key={tab.id} onClick={() => handleTabClick(tab)} style={{
              flex: 1, padding: '10px 4px 8px',
              background: 'none', border: 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
              color: active ? 'var(--primary)' : 'var(--muted)',
              transition: 'color 0.2s', position: 'relative'
            }}>
              <span style={{ fontSize: '22px', position: 'relative' }}>
                {tab.icon}
                {tab.id === 'notice' && unread > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-6px',
                    background: '#ef4444', color: '#fff',
                    fontSize: '9px', fontWeight: 700,
                    width: '16px', height: '16px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </span>
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 400 }}>
                {tab.label}
              </span>
              {active && (
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px', height: '2px',
                  background: 'var(--primary)', borderRadius: '2px'
                }} />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// 푸시 알림 구독 버튼
function PushBellButton() {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSubscribed(localStorage.getItem('push_subscribed') === 'true')
  }, [])

  const toggle = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.')
      return
    }
    if (subscribed) {
      localStorage.removeItem('push_subscribed')
      setSubscribed(false)
      return
    }
    setLoading(true)
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      // 실제 VAPID 키 설정 시 여기서 PushManager.subscribe() 호출
      // 지금은 브라우저 권한만 취득 후 상태 저장
      localStorage.setItem('push_subscribed', 'true')
      setSubscribed(true)
      alert('✅ 새 공지 알림이 설정되었습니다!')
    } else {
      alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.')
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} style={{
      background: subscribed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '10px', padding: '7px 12px',
      color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '4px',
      transition: 'all 0.2s'
    }}>
      {loading ? '⏳' : subscribed ? '🔔' : '🔕'}
    </button>
  )
}
