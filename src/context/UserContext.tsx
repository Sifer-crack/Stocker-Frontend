import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { authFetch, readErrorMessage } from '../lib/authFetch'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  groceryBudget: number | null
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string
  refreshUser: () => Promise<void>
  updateBudget: (value: number | null) => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof data.id === 'string' &&
    'email' in data &&
    typeof data.email === 'string'
  )
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      setUser(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await authFetch(`${API_BASE}/api/identity/me`, accessToken)
      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }
      const data: unknown = await response.json()
      if (!isUser(data)) {
        throw new Error('Unexpected user response from server.')
      }
      setUser(data)
    } catch (err) {
      setUser(null)
      setError(err instanceof Error ? err.message : 'Could not load user.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken === null) {
      setUser(null)
      setError('')
      return
    }
    refreshUser()
  }, [accessToken, refreshUser])

  const updateBudget = async (value: number | null): Promise<void> => {
    if (!accessToken) {
      throw new Error('Not authenticated.')
    }
    if (value !== null && !(value >= 0)) {
      throw new Error('Budget must be zero or more.')
    }
    const response = await authFetch(`${API_BASE}/api/identity/me`, accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groceryBudget: value }),
    })
    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }
    const data: unknown = await response.json()
    if (!isUser(data)) {
      throw new Error('Unexpected user response from server.')
    }
    setUser(data)
  }

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, updateBudget }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used inside UserProvider')
  }
  return context
}
