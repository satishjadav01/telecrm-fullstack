import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'
import { clearTokens, getAccessToken, setAccessToken } from '../../../services/auth/token'
import { setUnauthorizedHandler } from '../../../services/http/client'
import { useToast } from '../../../components/common/ToastProvider'

const AuthContext = createContext(null)

const normalizeAuthError = (error) => {
  const message = error?.message || 'Login failed'
  const details = error?.details || error?.data?.details || null
  return { message, details }
}

export function AuthProvider({ children }) {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastError, setLastError] = useState(null)

  const logout = () => {
    clearTokens()
    setUser(null)
    setLastError(null)
    toast.info('Logged out')
  }

  useEffect(() => {
    // If any request yields 401, clear tokens and force a clean login.
    setUnauthorizedHandler(() => {
      logout()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      const token = getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const me = await authApi.me()
        setUser(me)
      } catch (error) {
        // Token invalid/expired (no refresh endpoint yet).
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async ({ identifier, password }) => {
    setLastError(null)
    const data = await authApi.login(identifier, password)

    const accessToken = data?.tokens?.accessToken || null
    const nextUser = data?.user || null

    if (!accessToken || !nextUser) {
      throw new Error('Invalid login response from server')
    }

    setAccessToken(accessToken)
    setUser(nextUser)
    return { user: nextUser, tokens: { accessToken } }
  }

  const value = useMemo(() => {
    const accessToken = getAccessToken()

    return {
      user,
      isLoading,
      isAuthenticated: Boolean(user && accessToken),
      roleCode: user?.role?.code || null,
      permissions: user?.permissions || [],
      tokens: { accessToken },
      lastError,
      setLastError,
      login: async (payload) => {
        try {
          return await login(payload)
        } catch (error) {
          const normalized = normalizeAuthError(error)
          setLastError(normalized)
          throw error
        }
      },
      logout,
    }
  }, [user, isLoading, lastError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
