import { NavLink } from 'react-router-dom'
import './Sidebar.css'
import { useUser } from '../context/UserContext'

interface SidebarProps {
  estimatedCost: number
}

function Sidebar({ estimatedCost }: SidebarProps) {
  const { user } = useUser()

  const weeklyBudget = user?.groceryBudget ?? 0
  const remainingBudget = weeklyBudget - estimatedCost
  const budgetUsedPercentage =
    weeklyBudget > 0
      ? Math.min((estimatedCost / weeklyBudget) * 100, 100)
      : 0
  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Pantry', path: '/pantry' },
    { label: 'Shopping List', path: '/shopping-list' },
    { label: 'Shopping Options', path: '/store-recommendations' },
    { label: 'Shopping Route', path: '/shopping-route' },
    { label: 'Account', path: '/account' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"></div>
        <span>STOCKER</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'
            }
          >
            <span className="nav-dot"></span>
            {item.label}
          </NavLink>
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
          <div className="user-avatar">
            {user?.firstName?.charAt(0) ?? 'U'}
            {user?.lastName?.charAt(0) ?? ''}
          </div>

          <div>
            <strong>
              {[user?.firstName, user?.lastName]
                .filter(Boolean)
                .join(' ') || 'Stocker User'}
            </strong>
            <p>{user?.email ?? ''}</p>
          </div>
        </section>
      </div>
    </aside>
  )
}

export default Sidebar