import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useUser } from './UserContext'
import { API_BASE } from '../lib/apiConfig'
import { runSse } from '../lib/sseStream'
import { PricingApiError } from '../pricing/api.ts'
import { productsWithPolling } from '../pricing/productPolling.ts'
import { selectItemProduct } from '../pricing/productsApi.ts'
import { addShoppingItem, listShoppingItems, parseShoppingItemUpdate } from '../pricing/shoppingApi.ts'
import type { ComparisonStatus, PriceView, ServerShoppingItem } from '../pricing/shoppingApi.ts'
import type { ProductSearchResponse } from '../pricing/types.ts'

export interface ShoppingItem {
  /** The server's item id; also the itemId pricing stores this item's matched prices under. */
  id: string
  name: string
  quantity: number
  /** Local only: the backend has no check-off yet, so this is remembered in this browser. */
  completed: boolean
  createdAt: string
}

/** The server-side price comparison for an item, kept current by the live stream. */
export interface ItemPrices {
  status: ComparisonStatus
  cheapest: PriceView | null
  prices: PriceView[]
  comparedAt: string | null
}

/** The products search for one item (GET /api/pricing/products), loaded on demand (e.g. on the item page). */
export interface ItemDetail {
  /** True while the first answer is awaited or the backend is still loading supermarket pages. */
  loading: boolean
  /** The latest answer; kept visible while a refresh runs. */
  response: ProductSearchResponse | null
  error: string | null
  updatedAt: string | null
  /** The product compare will price: the first match unless the shopper picked another. */
  selectedKey: string | null
  /** The productKey being saved, while the PUT is in flight. */
  selectingKey: string | null
  selectError: string | null
}

interface ShoppingListContextType {
  items: ShoppingItem[]
  prices: Record<string, ItemPrices>
  details: Record<string, ItemDetail>
  /** Sum of the cheapest compared price x quantity; items with no price yet are excluded. */
  estimatedCost: number
  /** Adds the item on the server. No-op for blank/duplicate names or before the user has loaded. */
  addItem: (name: string) => void
  /** Local only: hides the item in this browser (the backend has no delete yet). */
  removeItem: (id: string) => void
  toggleCompleted: (id: string) => void
  /** (Re)loads one item's per-chain match detail. */
  refreshItem: (id: string) => void
  /** Makes compare price exactly this product for the item. */
  chooseProduct: (id: string, productKey: string) => Promise<void>
  /** The last problem talking to the server, or '' when all is well. */
  error: string
  /** True once the list has been fetched at least once (successfully or not), so "empty" can be trusted. */
  loaded: boolean
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined)

/** Local state the backend cannot hold yet: which items are ticked off or hidden. */
interface Overlay {
  completed: string[]
  removed: string[]
}

const EMPTY_OVERLAY: Overlay = { completed: [], removed: [] }

function overlayKey(userId: string): string {
  return `stocker.shoppingList.overlay.${userId}`
}

function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every((entry) => typeof entry === 'string')
}

function readOverlay(userId: string | null): Overlay {
  if (!userId) return EMPTY_OVERLAY
  try {
    const raw = localStorage.getItem(overlayKey(userId))
    if (!raw) return EMPTY_OVERLAY
    const data: unknown = JSON.parse(raw)
    if (typeof data === 'object' && data !== null && 'completed' in data && 'removed' in data) {
      if (isStringArray(data.completed) && isStringArray(data.removed)) {
        return { completed: data.completed, removed: data.removed }
      }
    }
  } catch {
    // Storage unavailable (private mode, blocked) or corrupt JSON: start with no overlay.
  }
  return EMPTY_OVERLAY
}

function writeOverlay(userId: string, overlay: Overlay): void {
  try {
    localStorage.setItem(overlayKey(userId), JSON.stringify(overlay))
  } catch {
    // Persistence is a convenience; the in-memory overlay still works without it.
  }
}

/** A push or refetch must not roll an item back to an older comparison than the one already held. */
function isOlder(incoming: ServerShoppingItem, held: ServerShoppingItem): boolean {
  const incomingAt = incoming.comparedAt ? Date.parse(incoming.comparedAt) : Number.NaN
  const heldAt = held.comparedAt ? Date.parse(held.comparedAt) : Number.NaN
  if (Number.isNaN(heldAt)) return false
  return Number.isNaN(incomingAt) || incomingAt < heldAt
}

function mergeItem(
  current: Record<string, ServerShoppingItem>,
  incoming: ServerShoppingItem,
): Record<string, ServerShoppingItem> {
  const held = current[incoming.id]
  if (held && isOlder(incoming, held)) return current
  // The payload is the item's full state, so replace it rather than patch it.
  return { ...current, [incoming.id]: incoming }
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof PricingApiError ? err.message : fallback
}

const EMPTY_SERVER_ITEMS: Record<string, ServerShoppingItem> = {}

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const { user } = useUser()
  const userId = user?.id ?? null

  const [serverItems, setServerItems] = useState(EMPTY_SERVER_ITEMS)
  const [details, setDetails] = useState<Record<string, ItemDetail>>({})
  const [overlayState, setOverlayState] = useState(() => ({ userId, overlay: readOverlay(userId) }))
  const [error, setError] = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  if (overlayState.userId !== userId) {
    // Different user (login, logout, or the profile finishing loading): swap in that user's overlay.
    setOverlayState({ userId, overlay: readOverlay(userId) })
    setServerItems(EMPTY_SERVER_ITEMS)
    setDetails({})
  }
  const overlay = overlayState.overlay

  const tokenRef = useRef(accessToken)
  const itemsRef = useRef(serverItems)
  const userIdRef = useRef(userId)
  const controllers = useRef(new Map<string, AbortController>())
  const adding = useRef(new Set<string>())

  // A layout effect runs before every passive effect, including a child page's (e.g. the item page asking for
  // its detail right after the list arrives), so refs are never stale when those effects read them.
  useLayoutEffect(() => {
    tokenRef.current = accessToken
    itemsRef.current = serverItems
    userIdRef.current = userId
  })

  useEffect(() => {
    if (userId) writeOverlay(userId, overlay)
  }, [userId, overlay])

  // Load the list and keep it live. On every (re)connect the list is fetched again, which covers any push
  // that was missed while disconnected.
  const signedIn = accessToken !== null
  useEffect(() => {
    if (!signedIn || userId === null) return
    const controller = new AbortController()

    const refetch = async () => {
      try {
        const loaded = await listShoppingItems(tokenRef.current, controller.signal)
        if (controller.signal.aborted) return
        // Items are never deleted server-side, so keep any held item the list did not include yet (e.g. one just added).
        setServerItems((current) => loaded.reduce(mergeItem, current))
        setError('')
      } catch (err) {
        if (!controller.signal.aborted) setError(toMessage(err, 'Could not load your shopping list.'))
      } finally {
        if (!controller.signal.aborted) setLoadedFor(userId)
      }
    }

    // Fetch straight away as well as on every stream open: the list must load even if the stream never does.
    void refetch()

    void runSse({
      url: `${API_BASE}/api/updates/shopping`,
      getToken: () => tokenRef.current,
      onOpen: () => void refetch(),
      onFailure: (failures) => {
        if (failures >= 3) setError('Live price updates are unavailable right now. Reconnecting…')
      },
      onEvent: (event, data) => {
        if (event !== 'shopping-item-updated') return
        const update = parseShoppingItemUpdate(data)
        if (update) setServerItems((current) => mergeItem(current, update.item))
      },
      signal: controller.signal,
    })

    return () => controller.abort()
  }, [signedIn, userId])

  useEffect(() => {
    const running = controllers.current
    return () => {
      for (const controller of running.values()) controller.abort()
      running.clear()
    }
  }, [userId])

  const items = useMemo<ShoppingItem[]>(() => {
    const removed = new Set(overlay.removed)
    const completed = new Set(overlay.completed)
    return Object.values(serverItems)
      .filter((item) => !removed.has(item.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        completed: completed.has(item.id),
        createdAt: item.createdAt,
      }))
  }, [serverItems, overlay])

  const prices = useMemo(
    () =>
      Object.fromEntries(
        Object.values(serverItems).map((item): [string, ItemPrices] => [
          item.id,
          { status: item.comparisonStatus, cheapest: item.cheapest, prices: item.prices, comparedAt: item.comparedAt },
        ]),
      ),
    [serverItems],
  )

  const addItem = useCallback((rawName: string) => {
    const name = rawName.trim()
    // Without a user there is no list to add to: it would be swapped out when the profile loads.
    if (name === '' || userIdRef.current === null) return
    // The backend cannot delete, so a double click must not create a second server item.
    const key = name.toLowerCase()
    if (adding.current.has(key)) return
    const existing = Object.values(itemsRef.current).find((item) => item.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      // Re-adding something hidden locally brings it back rather than creating a duplicate on the server.
      setOverlayState((prev) => ({
        ...prev,
        overlay: { ...prev.overlay, removed: prev.overlay.removed.filter((id) => id !== existing.id) },
      }))
      return
    }

    adding.current.add(key)
    addShoppingItem({ name, quantity: 1 }, tokenRef.current)
      .then((created) => {
        setServerItems((current) => mergeItem(current, created))
        setError('')
      })
      .catch((err: unknown) => setError(toMessage(err, 'Could not add that item.')))
      .finally(() => adding.current.delete(key))
  }, [])

  const removeItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setOverlayState((prev) =>
      prev.overlay.removed.includes(id)
        ? prev
        : { ...prev, overlay: { ...prev.overlay, removed: [...prev.overlay.removed, id] } },
    )
  }, [])

  const toggleCompleted = useCallback((id: string) => {
    setOverlayState((prev) => {
      const { completed } = prev.overlay
      return {
        ...prev,
        overlay: {
          ...prev.overlay,
          completed: completed.includes(id) ? completed.filter((candidate) => candidate !== id) : [...completed, id],
        },
      }
    })
  }, [])

  const refreshItem = useCallback((id: string) => {
    const item = itemsRef.current[id]
    if (!item) return

    controllers.current.get(id)?.abort()
    const controller = new AbortController()
    controllers.current.set(id, controller)
    const { signal } = controller

    const blank: ItemDetail = {
      loading: true,
      response: null,
      error: null,
      updatedAt: null,
      selectedKey: null,
      selectingKey: null,
      selectError: null,
    }

    // Keep the last known answer visible while a refresh is in flight.
    setDetails((current) => ({ ...current, [id]: { ...(current[id] ?? blank), loading: true, error: null } }))

    productsWithPolling({ term: item.name, itemId: id }, () => tokenRef.current, signal, (response) => {
      setDetails((current) => {
        const previous = current[id] ?? blank
        return {
          ...current,
          [id]: {
            ...previous,
            response,
            updatedAt: new Date().toISOString(),
            // The backend stores the first match under the item; remember a pick only while it is still offered.
            selectedKey:
              previous.selectedKey !== null && [...response.products, ...response.alternatives].some((p) => p.productKey === previous.selectedKey)
                ? previous.selectedKey
                : (response.products[0]?.productKey ?? null),
          },
        }
      })
    })
      .then((result) => {
        if (result === null) return // aborted: the item was hidden, refreshed, or the user changed
        setDetails((current) => (current[id] ? { ...current, [id]: { ...current[id], loading: false } } : current))
      })
      .catch((err: unknown) => {
        if (signal.aborted) return
        setDetails((current) => ({
          ...current,
          [id]: { ...(current[id] ?? blank), loading: false, error: toMessage(err, 'Could not reach the pricing service.') },
        }))
      })
      .finally(() => {
        if (controllers.current.get(id) === controller) controllers.current.delete(id)
      })
  }, [])

  const chooseProduct = useCallback(async (id: string, productKey: string) => {
    const patch = (change: Partial<ItemDetail>) =>
      setDetails((current) => (current[id] ? { ...current, [id]: { ...current[id], ...change } } : current))
    patch({ selectingKey: productKey, selectError: null })
    try {
      await selectItemProduct(id, productKey, tokenRef.current)
      patch({ selectedKey: productKey, selectingKey: null })
    } catch (err) {
      patch({ selectingKey: null, selectError: toMessage(err, 'Could not select this product.') })
    }
  }, [])

  const estimatedCost = useMemo(
    () =>
      items.reduce((total, item) => {
        const cheapest = prices[item.id]?.cheapest
        return cheapest ? total + cheapest.priceAmount * item.quantity : total
      }, 0),
    [items, prices],
  )

  const value = useMemo<ShoppingListContextType>(
    () => ({
      items,
      prices,
      details,
      estimatedCost,
      addItem,
      removeItem,
      toggleCompleted,
      refreshItem,
      chooseProduct,
      error,
      loaded: loadedFor !== null && loadedFor === userId,
    }),
    [items, prices, details, estimatedCost, addItem, removeItem, toggleCompleted, refreshItem, chooseProduct, error, loadedFor, userId],
  )

  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>
}

export function useShoppingList(): ShoppingListContextType {
  const context = useContext(ShoppingListContext)
  if (!context) {
    throw new Error('useShoppingList must be used inside ShoppingListProvider')
  }
  return context
}
