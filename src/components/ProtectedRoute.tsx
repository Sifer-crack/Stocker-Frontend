import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}
