import './AppTopBar.css'

interface AppTopBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function AppTopBar({ sidebarOpen, onToggleSidebar }: AppTopBarProps) {
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
    </header>
  )
}

export default AppTopBar
