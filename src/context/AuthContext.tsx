import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { API_BASE } from '../lib/apiConfig'
import { readErrorMessage } from '../lib/authFetch'
import {
  onSessionExpired,
  onTokensRefreshed,
  parseSessionTokens,
  refreshSession,
  setLatestToken,
} from '../lib/session'

/** Refresh this long before the access token expires. */
const REFRESH_MARGIN_SECONDS = 60
const MIN_REFRESH_DELAY_SECONDS = 10

interface AuthContextType {
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState(0)
  const [loading, setLoading] = useState(true)

  // Pick up refreshes (scheduled below, or triggered by a 401 in authFetch) and sessions that ended.
  useEffect(() => {
    const offRefreshed = onTokensRefreshed((tokens) => {
      setAccessToken(tokens.accessToken)
      setExpiresIn(tokens.expiresIn)
    })
    const offExpired = onSessionExpired(() => setAccessToken(null))
    return () => {
      offRefreshed()
      offExpired()
    }
  }, [])

  useEffect(() => {
    // Restore the session from the refresh cookie; the listener above stores the token.
    refreshSession().finally(() => setLoading(false))
  }, [])

  // Refresh a little before the 15 minute access token runs out, so calls, polling and the live stream keep working.
  useEffect(() => {
    if (accessToken === null) return
    const delaySeconds = Math.max(expiresIn - REFRESH_MARGIN_SECONDS, MIN_REFRESH_DELAY_SECONDS)
    const timer = setTimeout(() => {
      void refreshSession().then((tokens) => {
        if (tokens === null) setAccessToken(null)
      })
    }, delaySeconds * 1000)
    return () => clearTimeout(timer)
  }, [accessToken, expiresIn])

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
    const tokens = parseSessionTokens(await response.json())
    if (tokens === null) {
      throw new Error('Login failed: unexpected response from server.')
    }
    // Refresh token is stored by the browser as an HttpOnly cookie.
    setLatestToken(tokens.accessToken)
    setAccessToken(tokens.accessToken)
    setExpiresIn(tokens.expiresIn)
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
      setLatestToken(null)
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
