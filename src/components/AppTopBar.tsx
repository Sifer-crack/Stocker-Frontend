import './AppTopBar.css'
import { useTheme } from '../context/ThemeContext'
import UserMenu from './UserMenu'

interface AppTopBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function AppTopBar({ sidebarOpen, onToggleSidebar }: AppTopBarProps) {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <header className="app-topbar">
      <button
        type="button"
        className="app-topbar-logo"
        onClick={onToggleSidebar}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="logo-icon" aria-hidden="true"></span>
        <span className="app-topbar-wordmark" aria-hidden="true">
          STOCKER
        </span>
      </button>
      <div className="app-topbar-actions">
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
          {!isDark ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}

export default AppTopBar
