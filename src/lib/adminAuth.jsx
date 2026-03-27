import React, { createContext, useContext, useState } from 'react'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true'
  })

  const login = (password) => {
    // .env에 VITE_ADMIN_PASSWORD 설정. 없으면 기본값 'admin1234'
    const correct = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234'
    if (password === correct) {
      sessionStorage.setItem('admin_auth', 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem('admin_auth')
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
