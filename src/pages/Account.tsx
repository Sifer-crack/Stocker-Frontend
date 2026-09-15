import './Account.css'

function Account() {
  return (
    <main className="account-page">
      <header className="account-header">
        <div>
          <h1>Account</h1>
          <p>Manage your Stocker profile and preferences.</p>
        </div>
      </header>

      <div className="account-content">
        <section className="account-card">
          <div className="account-avatar">EM</div>

          <div>
            <h2>Emma Reid</h2>
            <p>emma.reid@email.com</p>
          </div>
        </section>

        <section className="account-card account-details">
          <div>
            <span>Name</span>
            <strong>Emma Reid</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>emma.reid@email.com</strong>
          </div>

          <div>
            <span>Preferred store</span>
            <strong>PAK'nSAVE</strong>
          </div>

          <div>
            <span>Shopping preference</span>
            <strong>Lowest total cost</strong>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Account