import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { acknowledgeNotification, fetchProductName, listNotifications } from '../lib/notificationsApi'
import type { ExpiryNotification } from '../lib/notificationsApi'

/** The backend has no push for notifications yet, so poll modestly (and only while the tab is visible). */
const POLL_INTERVAL_MS = 60_000

interface NotificationsContextType {
  notifications: ExpiryNotification[]
  /** Product names by product id, filled in as they resolve. */
  productNames: Record<string, string>
  /** Notifications the user has not acknowledged yet. */
  unreadCount: number
  loading: boolean
  error: string
  acknowledge: (id: string) => Promise<void>
  /** Fetches now instead of waiting for the next poll (e.g. right after a pantry expiry change). */
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const [notifications, setNotifications] = useState<ExpiryNotification[]>([])
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tokenRef = useRef(accessToken)
  const requestedNames = useRef(new Set<string>())
  const loadRef = useRef<(() => Promise<void>) | null>(null)
  const signedIn = accessToken !== null

  useEffect(() => {
    tokenRef.current = accessToken
  })

  useEffect(() => {
    if (!signedIn) {
      setNotifications([])
      setProductNames({})
      requestedNames.current.clear()
      return
    }

    const controller = new AbortController()

    const load = async () => {
      try {
        setLoading(true)
        const loaded = await listNotifications(tokenRef.current, controller.signal)
        if (controller.signal.aborted) return
        setNotifications(loaded)
        setError('')
        for (const { productId } of loaded) {
          if (requestedNames.current.has(productId)) continue
          requestedNames.current.add(productId)
          void fetchProductName(productId, tokenRef.current).then((name) => {
            if (name && !controller.signal.aborted) setProductNames((current) => ({ ...current, [productId]: name }))
            if (!name) requestedNames.current.delete(productId) // try again on a later poll
          })
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Could not load notifications.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadRef.current = load
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, POLL_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      loadRef.current = null
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [signedIn])

  const refresh = useCallback(() => loadRef.current?.() ?? Promise.resolve(), [])

  const acknowledge = useCallback(async (id: string) => {
    const updated = await acknowledgeNotification(id, tokenRef.current)
    setNotifications((current) => current.map((notification) => (notification.id === id ? updated : notification)))
  }, [])

  const value = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      productNames,
      unreadCount: notifications.filter((notification) => notification.status === 'NEW').length,
      loading,
      error,
      acknowledge,
      refresh,
    }),
    [notifications, productNames, loading, error, acknowledge, refresh],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider')
  }
  return context
}
