import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { expiryText } from '../lib/expiryText'
import type { ExpiryNotification } from '../lib/notificationsApi'
import './NotificationToasts.css'

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 9_000
const DISMISSED_KEY = 'stocker.toasts.dismissed'

/** Ids already popped up in this tab session, so a reload or a later poll doesn't repeat them. */
function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch {
    // Private mode or blocked storage: toasts may repeat after a reload, nothing worse.
  }
}

function Toast({
  notification,
  name,
  onDismiss,
}: {
  notification: ExpiryNotification
  name: string
  onDismiss: (id: string) => void
}) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [paused, notification.id, onDismiss])

  return (
    <div
      className="toast"
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="toast-body">
        <strong>{name}</strong>
        <span>{expiryText(notification.expirationDate)}</span>
        <Link to="/notifications" className="toast-link" onClick={() => onDismiss(notification.id)}>
          View notifications
        </Link>
      </div>
      <button type="button" className="toast-close" aria-label={`Dismiss notification for ${name}`} onClick={() => onDismiss(notification.id)}>
        ×
      </button>
    </div>
  )
}

/** Pops each new expiry notification up in the top right corner, a few at a time, until dismissed or timed out. */
function NotificationToasts() {
  const { notifications, productNames } = useNotifications()
  const dismissedRef = useRef<Set<string> | null>(null)
  const [, setVersion] = useState(0)
  if (dismissedRef.current === null) dismissedRef.current = loadDismissed()
  const dismissed = dismissedRef.current

  const dismiss = (id: string) => {
    if (dismissed.has(id)) return
    dismissed.add(id)
    saveDismissed(dismissed)
    setVersion((version) => version + 1)
  }

  const pending = notifications
    .filter((notification) => notification.status === 'NEW' && !dismissed.has(notification.id))
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
  const visible = pending.slice(0, MAX_VISIBLE)
  const waiting = pending.length - visible.length

  if (visible.length === 0) return null

  return (
    <div className="toast-region" role="region" aria-label="New notifications">
      {visible.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          name={productNames[notification.productId] ?? 'An item in your pantry'}
          onDismiss={dismiss}
        />
      ))}
      {waiting > 0 && <p className="toast-more">and {waiting} more</p>}
    </div>
  )
}

export default NotificationToasts
