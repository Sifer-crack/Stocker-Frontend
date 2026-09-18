import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

interface DashboardProps {
  items: string[]
  weeklyBudget: number
  estimatedCost: number
}

function Dashboard({
  items,
  weeklyBudget,
  estimatedCost,
}: DashboardProps) {
  const navigate = useNavigate()
  const handleCreateShoppingList = () => navigate('/shopping-list')
  const handleViewPantry = () => navigate('/pantry')
  const remainingBudget = weeklyBudget - estimatedCost
  const budgetUsedPercentage =
  weeklyBudget > 0
    ? Math.min((estimatedCost / weeklyBudget) * 100, 100)
    : 0
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your grocery overview.</p>
        </div>

        <div className="dashboard-header-actions">
          <input
            type="text"
            placeholder="Search products"
          />

          <button type="button" onClick={handleCreateShoppingList}>
            Compare Stores
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-budget">
          <div>
            <p>Weekly Grocery Budget</p>
            <h2>${weeklyBudget.toFixed(2)}</h2>
          </div>

          <div className="dashboard-budget-progress">
            <div className="dashboard-budget-bar">
              <div
                className="dashboard-budget-fill"
                style={{ width: `${budgetUsedPercentage}%` }}
              ></div>
            </div>

            <div className="dashboard-budget-values">
              <strong>${estimatedCost.toFixed(2)} estimated</strong>
              <strong>${remainingBudget.toFixed(2)} remaining</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <h2>My Pantry</h2>
              <p>6 pantry items tracked, 3 items running low.</p>
            </div>
            <strong>6 items</strong>
          </div>

          <div className="dashboard-card-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleViewPantry}
            >
              View Pantry
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleViewPantry}
            >
              + Add
            </button>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <h2>Shopping List</h2>

              {items.length === 0 ? (
                <p>Your shopping list is currently empty.</p>
              ) : (
                <p>{items.length} items ready to shop.</p>
              )}
            </div>

            <strong>{items.length} items</strong>
          </div>

          <button
            type="button"
            className="primary-button full-width"
            onClick={handleCreateShoppingList}
          >
            {items.length === 0
              ? 'Create Shopping List'
              : 'View Shopping List'}
          </button>
        </section>

        <section className="compare-card">
          <div>
            <h2>Save on your next shop</h2>
            <p>
              Compare supermarkets to find the cheapest way to buy your
              shopping list.
            </p>
          </div>

          <button type="button" onClick={handleCreateShoppingList}>
            Compare Stores
          </button>
        </section>
      </div>
    </main>
  )
}

export default Dashboard