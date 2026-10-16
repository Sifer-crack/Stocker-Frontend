import { NavLink } from 'react-router-dom'
import './Sidebar.css'
import { useUser } from '../context/UserContext'

interface SidebarProps {
  estimatedCost: number
  isHidden?: boolean
  isPeek?: boolean
  isClosing?: boolean
  onMouseLeave?: () => void
  onMouseEnter?: () => void
}

function Sidebar({
  estimatedCost,
  isHidden = false,
  isPeek = false,
  isClosing = false,
  onMouseLeave,
  onMouseEnter,
}: SidebarProps) {
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
  ]

  const className = isPeek
    ? `sidebar sidebar--peek${isClosing ? ' sidebar--peek-closing' : ''}`
    : isHidden
      ? 'sidebar sidebar--hidden'
      : 'sidebar'
  const hidden = isHidden && !isPeek

  return (
    <aside
      className={className}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
    >
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
            <span className="nav-label">{item.label}</span>
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
      </div>
    </aside>
  )
}

export default Sidebar
