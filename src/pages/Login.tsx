import './Login.css'

interface LoginProps {
  onLogin: () => void
}
function Login({ onLogin }: LoginProps) {
    return (
    <main className="login-page">
      <section className="login-card">
        <h1>Stocker</h1>
        <p className="subtitle">Save more on every shop</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault()
            onLogin()
            }} 
        >
           <label>
            Email
            <input type="email" placeholder="you@example.com" />
          </label>

          <label>
            Password
            <input type="password" placeholder="Enter your password" />
          </label>

          <button type="submit">Log In</button>
        </form>

        <p className="create-account">
          Don't have an account? <a href="#">Create Account</a>
        </p>
      </section>
    </main>
  )
}

export default Login