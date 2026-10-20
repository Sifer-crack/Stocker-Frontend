import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import './UserMenu.css'

function UserMenu() {
  const { user } = useUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'Stocker User'
  const initials = `${user?.firstName?.charAt(0) ?? 'U'}${user?.lastName?.charAt(0) ?? ''}`

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open ])

  const handleAccountSettings = () => {
    setOpen(false)
    navigate('/account')
  }

  const handleLogout = () => {
    setOpen(false)
    void logout()
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-avatar"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Close account menu' : 'Open account menu'}
        title={displayName}
      >
        {initials}
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-identity">
            <strong>{displayName}</strong>
            {user?.email && <p>{user.email}</p>}
          </div>

          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={handleAccountSettings}
          >
            Account settings
          </button>

          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
