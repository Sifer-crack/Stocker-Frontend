import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

function SignUp() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Stocker</h1>
        <p className="subtitle">Create your account</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()

            if (password !== confirmPassword) {
              setError('Passwords do not match.')
              return
            }
            setError('')
          }}
        >
          <label>
            Name
            <input
              type="text"
              placeholder="Enter your name"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button type="submit">
            Create Account
          </button>
        </form>

        <p className="create-account">
          Already have an account?{' '}
          <Link to="/login">
            Log In
          </Link>
        </p>
      </section>
    </main>
  )
}

export default SignUp