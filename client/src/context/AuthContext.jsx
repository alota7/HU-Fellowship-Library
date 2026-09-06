import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import authService from '../services/authService'
import { getToken, setToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      if (!getToken()) {
        if (active) setLoading(false)
        return
      }
      try {
        const current = await authService.me()
        if (active) setUser(current)
      } catch {
        setToken(null)
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const current = await authService.login(credentials)
    setUser(current)
    return current
  }, [])

  const register = useCallback((data) => authService.register(data), [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const updateUser = useCallback((next) => setUser(next), [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateUser,
    }),
    [user, loading, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
