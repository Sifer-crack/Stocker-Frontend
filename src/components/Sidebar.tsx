import './Sidebar.css'

interface SidebarProps {
  currentPage: string
  weeklyBudget: number
  estimatedCost: number
  onNavigate: (page: string) => void
}

function Sidebar({ currentPage, weeklyBudget, estimatedCost, onNavigate }: SidebarProps) {
  const remainingBudget = weeklyBudget - estimatedCost
  const budgetUsedPercentage =
    weeklyBudget > 0
      ? Math.min((estimatedCost / weeklyBudget) * 100, 100)
      : 0
  const navItems = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'My Pantry', page: 'pantry' },
    { label: 'Shopping List', page: 'shopping-list' },
    { label: 'Shopping Options', page: 'store-recommendations' },
    { label: 'Shopping Route', page: 'shopping-route' },
    { label: 'Grocery Budget', page: 'grocery-budget' },
    { label: 'Account', page: 'account' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"></div>
        <span>STOCKER</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className={
              currentPage === item.page
                ? 'sidebar-nav-item active'
                : 'sidebar-nav-item'
            }
            onClick={() => onNavigate(item.page)}
          >
            <span className="nav-dot"></span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <section className="budget-card">
          <p>Weekly budget</p>
          <strong>${weeklyBudget.toFixed(2)}</strong>

          <div className="budget-progress">
            <div
              className="budget-progress-fill"
              style={{ width: `${budgetUsedPercentage}%` }}
            ></div>
          </div>

          <span>${remainingBudget.toFixed(2)} remaining</span>
        </section>

        <section className="user-card">
          <div className="user-avatar">EM</div>

          <div>
            <strong>Emma Reid</strong>
            <p>emma.reid@email.com</p>
          </div>
        </section>
      </div>
    </aside>
  )
}

export default Sidebar