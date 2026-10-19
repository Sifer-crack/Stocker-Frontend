import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function OAuthCallback() {
  const { accessToken } = useAuth()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (accessToken && !error) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Stocker</h1>
        <p className="subtitle">Sign in with GitHub</p>

        <p className="login-error">
          {errorDescription
            ? errorDescription
            : error
              ? 'Sign-in failed. Please try again.'
              : 'We could not complete your sign-in. Please try again.'}
        </p>

        <Link to="/login" className="login-retry">
          Back to login
        </Link>
      </section>
    </main>
  )
}

export default OAuthCallback
