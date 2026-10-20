import { NavLink } from 'react-router-dom'
import './Sidebar.css'
import { useNotifications } from '../context/NotificationsContext'
import { useUser } from '../context/UserContext'
import { useWeeklySpending } from '../hooks/useWeeklySpending'
import ExportSpendingReportButton from './ExportSpendingReportButton'

interface SidebarProps {
  isHidden?: boolean
  isPeek?: boolean
  isClosing?: boolean
  onMouseLeave?: () => void
  onMouseEnter?: () => void
}

function Sidebar({
  isHidden = false,
  isPeek = false,
  isClosing = false,
  onMouseLeave,
  onMouseEnter,
}: SidebarProps) {
  const { user } = useUser()
  const { unreadCount } = useNotifications()
  const { spent } = useWeeklySpending()

  const weeklyBudget = user?.groceryBudget ?? 0
  const remainingBudget = weeklyBudget - spent
  const budgetRemainingPercentage =
    weeklyBudget > 0
      ? Math.min(Math.max((remainingBudget / weeklyBudget) * 100, 0), 100)
      : 0
  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Pantry', path: '/pantry' },
    { label: 'Shopping List', path: '/shopping-list' },
    { label: 'Price Search', path: '/pricing' },
    { label: 'Favorite Stores', path: '/favorite-stores' },
    { label: 'Notifications', path: '/notifications' },
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
            {item.path === '/notifications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
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
              style={{ width: `${budgetRemainingPercentage}%` }}
            ></div>
          </div>

          <span>${remainingBudget.toFixed(2)} remaining</span>

          <ExportSpendingReportButton />
        </section>
      </div>
    </aside>
  )
}

export default Sidebar
