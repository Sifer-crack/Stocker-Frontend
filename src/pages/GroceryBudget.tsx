import { useState } from 'react'
import './GroceryBudget.css'

interface GroceryBudgetProps {
  weeklyBudget: number
  setWeeklyBudget: React.Dispatch<React.SetStateAction<number>>
}

function GroceryBudget({
  weeklyBudget,
  setWeeklyBudget,
}: GroceryBudgetProps) {
  const [budget, setBudget] = useState(weeklyBudget.toString())
  const [message, setMessage] = useState('')

  const saveBudget = () => {
    const value = Number(budget)

    if (budget.trim() === '' || value <= 0) {
      setMessage('Please enter a valid grocery budget.')
      return
    }

    setWeeklyBudget(value)
    setMessage('Budget saved successfully.')
  }

  return (
    <main className="budget-page">
      <header className="budget-header">
        <div>
          <h1>Grocery Budget</h1>
          <p>Set and manage your weekly grocery spending.</p>
        </div>
      </header>

      <div className="budget-content">
        <section className="grocery-budget-card">
          <span className="budget-label">WEEKLY BUDGET</span>

          <h2>${weeklyBudget.toFixed(2)}</h2>

          <p>
            Set the amount you want to spend on groceries each week.
          </p>

          <label htmlFor="budget">Weekly budget</label>

          <div className="budget-input-row">
            <span>$</span>

            <input
              id="budget"
              type="number"
              min="1"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
            />
          </div>

          <button type="button" onClick={saveBudget}>
            Save Budget
          </button>

          {message && (
            <p className="budget-message">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

export default GroceryBudget