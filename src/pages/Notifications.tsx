import { useState } from 'react'
import { useNotifications } from '../context/NotificationsContext'
import { expiryText } from '../lib/expiryText'
import type { ExpiryNotification } from '../lib/notificationsApi'
import './ShoppingList.css'
import './Notifications.css'

function Notifications() {
  const { notifications, productNames, loading, error, acknowledge } = useNotifications()
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  const ordered = [...notifications].sort(
    (a, b) => Number(a.status === 'ACKNOWLEDGED') - Number(b.status === 'ACKNOWLEDGED') || a.expirationDate.localeCompare(b.expirationDate),
  )

  const handleAcknowledge = async (notification: ExpiryNotification) => {
    try {
      setRowError(null)
      await acknowledge(notification.id)
    } catch (err) {
      setRowError({
        id: notification.id,
        message: err instanceof Error ? err.message : 'Could not acknowledge this notification.',
      })
    }
  }

  return (
    <main className="shopping-page">
      <header className="shopping-header">
        <div>
          <h1>Notifications</h1>
          <p>Pantry items that are close to their expiry date.</p>
        </div>
      </header>

      <div className="notifications-body">
        {error && <p className="pricing-error">{error}</p>}

        <section className="shopping-list-card">
          {loading && notifications.length === 0 ? (
            <p className="empty-list">Loading notifications…</p>
          ) : ordered.length === 0 ? (
            <p className="empty-list">Nothing is about to expire. Add expiry dates to pantry items to be reminded.</p>
          ) : (
            <ul className="shopping-items">
              {ordered.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.status === 'NEW' ? 'shopping-item' : 'shopping-item notification-read'}
                >
                  <div className="shopping-item-info">
                    <div>
                      <strong>{productNames[notification.productId] ?? 'A pantry item'}</strong>
                      <p>
                        {expiryText(notification.expirationDate)} ·{' '}
                        {new Date(`${notification.expirationDate}T00:00:00`).toLocaleDateString()}
                      </p>
                      {rowError?.id === notification.id && <p className="pricing-error">{rowError.message}</p>}
                    </div>
                  </div>

                  <div className="shopping-item-actions">
                    {notification.status === 'NEW' ? (
                      <button type="button" onClick={() => handleAcknowledge(notification)}>
                        Got it
                      </button>
                    ) : (
                      <span className="item-price-status">Acknowledged</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default Notifications
