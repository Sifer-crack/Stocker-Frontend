import './Account.css'
import { useUser } from '../context/UserContext'
import { useState } from 'react'

function Account() {
  const { user, loading, error, updateBudget } = useUser()
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [budgetMessage, setBudgetMessage] = useState('')
  const displayName = [user?.firstName, user?.lastName]
  .filter(Boolean)
  .join(' ') || 'Stocker User'

  const handleSaveBudget = async () => {
    setBudgetError('')
    setBudgetMessage('')

    if (budgetInput.trim() === '') {
      setBudgetError('Please enter a grocery budget.')
      return
    }

    const budget = Number(budgetInput)

    if (Number.isNaN(budget) || budget < 0) {
      setBudgetError('Please enter a valid grocery budget.')
      return
    }

    try {
      await updateBudget(budget)
      setBudgetMessage('Budget saved successfully.')
      setBudgetInput('')
    } catch (err) {
      setBudgetError(
        err instanceof Error ? err.message : 'Could not save grocery budget.'
      )
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <p>Loading account...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="account-page">
        <p>{error}</p>
      </main>
    )
  }
  return (
    <main className="account-page">
      <header className="account-header">
        <div>
          <h1>Account</h1>
          <p>Manage your Stocker profile and preferences.</p>
        </div>
      </header>

      <div className="account-content">
        <section className="account-card account-budget">
          <div className="account-avatar">
            {user?.firstName?.charAt(0) ?? 'U'}
            {user?.lastName?.charAt(0) ?? ''}
          </div>

          <div>
            <h2>{displayName}</h2>
            <p>{user?.email ?? 'No email available'}</p>
          </div>
        </section>

        <section className="account-card account-details">
          <div>
            <span>Name</span>
            <strong>{displayName}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email ?? 'No email available'}</strong>
          </div>

        </section>

                <section className="account-card">
          <div>
            <h2>Grocery Budget</h2>
            <p>
              Current budget:{' '}
              <strong>
                {user?.groceryBudget !== null && user?.groceryBudget !== undefined
                  ? `$${user.groceryBudget.toFixed(2)}`
                  : 'Not set'}
              </strong>
            </p>
          </div>

          <div>
            <label htmlFor="grocery-budget">Weekly grocery budget</label>
            <input
              id="grocery-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter budget"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
            />
            <button type="button" onClick={handleSaveBudget}>
              Save Budget
            </button>
            {budgetError && (
              <p className="budget-error">{budgetError}</p>
            )}

            {budgetMessage && (
              <p className="budget-message">{budgetMessage}</p>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}

export default Account