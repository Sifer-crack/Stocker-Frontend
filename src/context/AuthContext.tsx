import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

interface AuthContextType {
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error
    }
  } catch {
    // Fall through to the generic message below.
  }
  return `Request failed with status ${response.status}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function refresh() {
      try {
        const response = await fetch(`${API_BASE}/api/identity/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!response.ok) {
          return
        }
        const data: unknown = await response.json()
        if (typeof data === 'object' && data !== null && 'accessToken' in data && typeof data.accessToken === 'string') {
          setAccessToken(data.accessToken)
        }
      } catch {
        // No stored session (or backend unreachable) — stay logged out.
      } finally {
        setLoading(false)
      }
    }

    refresh()
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/identity/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }
    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null || !('accessToken' in data) || typeof data.accessToken !== 'string') {
      throw new Error('Login failed: unexpected response from server.')
    }
    // Refresh token is stored by the browser as an HttpOnly cookie.
    setAccessToken(data.accessToken)
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/identity/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Clearing local state matters more than the server call here.
    } finally {
      setAccessToken(null)
    }
  }

  return (
    <AuthContext.Provider value={{ accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
