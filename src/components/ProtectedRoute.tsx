import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken, loading } = useAuth()

  if (loading) {
    return <Loading message="Checking your session..." />
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}
