import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState({ id: '1', name: 'System Admin', email: 'admin@company.com', is_active: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Keep active session in client headers
    api.defaults.headers.common['Authorization'] = `Bearer mock_token`
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/v1/auth/login', { email, password })
    const { access_token, admin: adminData } = res.data
    localStorage.setItem('token', access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setAdmin(adminData)
    return adminData
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
