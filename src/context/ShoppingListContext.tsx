import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useUser } from './UserContext'
import { newId } from '../lib/uuid.ts'
import { PricingApiError } from '../pricing/api.ts'
import { cheapestMatch } from '../pricing/chains.ts'
import { matchWithPolling } from '../pricing/matchPolling.ts'
import type { ChainMatch, MatchMethod } from '../pricing/types.ts'

export type PriceStatus = 'pending' | 'ready' | 'empty' | 'error'

export interface ShoppingItem {
  /** Also the itemId the backend stores this item's matched prices under. */
  id: string
  name: string
  quantity: number
  completed: boolean
}

export interface ItemPrices {
  status: PriceStatus
  matches: ChainMatch[]
  matchMethod: MatchMethod | null
  error: string | null
  updatedAt: string | null
}

interface StoredList {
  items: ShoppingItem[]
  prices: Record<string, ItemPrices>
}

interface ShoppingListContextType {
  items: ShoppingItem[]
  prices: Record<string, ItemPrices>
  /** Sum of the cheapest matched price x quantity; items with no price yet are excluded. */
  estimatedCost: number
  /** Adds the item and immediately starts fetching its prices. No-op for blank/duplicate names or before the user has loaded. */
  addItem: (name: string) => void
  removeItem: (id: string) => void
  toggleCompleted: (id: string) => void
  /** Re-runs the price match for one item. */
  refreshItem: (id: string) => void
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined)

const EMPTY_LIST: StoredList = { items: [], prices: {} }
const PENDING_PRICES: ItemPrices = { status: 'pending', matches: [], matchMethod: null, error: null, updatedAt: null }

const PRICE_STATUSES: readonly string[] = ['pending', 'ready', 'empty', 'error']

function storageKey(userId: string): string {
  return `stocker.shoppingList.${userId}`
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null
}

function isShoppingItem(data: unknown): data is ShoppingItem {
  return (
    isRecord(data) &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.quantity === 'number' &&
    typeof data.completed === 'boolean'
  )
}

function isItemPrices(data: unknown): data is ItemPrices {
  return (
    isRecord(data) &&
    typeof data.status === 'string' &&
    PRICE_STATUSES.includes(data.status) &&
    Array.isArray(data.matches)
  )
}

function isStoredList(data: unknown): data is StoredList {
  return (
    isRecord(data) &&
    Array.isArray(data.items) &&
    data.items.every(isShoppingItem) &&
    isRecord(data.prices) &&
    Object.values(data.prices).every(isItemPrices)
  )
}

function readStored(userId: string | null): StoredList {
  if (!userId) return EMPTY_LIST
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return EMPTY_LIST
    const data: unknown = JSON.parse(raw)
    return isStoredList(data) ? data : EMPTY_LIST
  } catch {
    // Storage unavailable (private mode, blocked) or corrupt JSON: start with an empty list.
    return EMPTY_LIST
  }
}

function writeStored(userId: string, list: StoredList): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list))
  } catch {
    // Persistence is a convenience; the in-memory list still works without it.
  }
}

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const { user } = useUser()
  const userId = user?.id ?? null

  const [state, setState] = useState(() => ({ userId, list: readStored(userId) }))
  if (state.userId !== userId) {
    // Different user (login, logout, or the profile finishing loading): swap in that user's stored list.
    setState({ userId, list: readStored(userId) })
  }
  const list = state.list

  const listRef = useRef(list)
  const userIdRef = useRef(userId)
  const tokenRef = useRef(accessToken)
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    listRef.current = list
    userIdRef.current = userId
    tokenRef.current = accessToken
  })

  const setPrices = useCallback((itemId: string, next: ItemPrices) => {
    setState((prev) =>
      // The item may have been removed while its request was in flight.
      prev.list.items.some((item) => item.id === itemId)
        ? { ...prev, list: { ...prev.list, prices: { ...prev.list.prices, [itemId]: next } } }
        : prev,
    )
  }, [])

  const runMatch = useCallback(
    async (item: ShoppingItem) => {
      controllers.current.get(item.id)?.abort()
      const controller = new AbortController()
      controllers.current.set(item.id, controller)
      const { signal } = controller

      // Keep the last known prices visible while a refresh is in flight.
      const previous = listRef.current.prices[item.id] ?? PENDING_PRICES
      setPrices(item.id, { ...previous, status: 'pending', error: null })

      try {
        const result = await matchWithPolling({ term: item.name, itemId: item.id }, () => tokenRef.current, signal)
        if (result === null) return // aborted: the item was removed, refreshed, or the user changed
        setPrices(item.id, {
          status: result.matches.length > 0 ? 'ready' : 'empty',
          matches: result.matches,
          matchMethod: result.matches.length > 0 ? result.matchMethod : null,
          error: null,
          updatedAt: new Date().toISOString(),
        })
      } catch (err) {
        if (signal.aborted) return
        const message = err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.'
        setPrices(item.id, { ...previous, status: 'error', error: message })
      } finally {
        if (controllers.current.get(item.id) === controller) {
          controllers.current.delete(item.id)
        }
      }
    },
    [setPrices],
  )

  // Requests interrupted by a reload or a user switch are still 'pending' in storage: resume them.
  useEffect(() => {
    const running = controllers.current
    for (const item of listRef.current.items) {
      if (listRef.current.prices[item.id]?.status === 'pending') {
        void runMatch(item)
      }
    }
    return () => {
      for (const controller of running.values()) controller.abort()
      running.clear()
    }
  }, [userId, runMatch])

  useEffect(() => {
    if (userId) writeStored(userId, list)
  }, [userId, list])

  const addItem = useCallback(
    (rawName: string) => {
      const name = rawName.trim()
      // Without a user there is no list to add to: it would be swapped out when the profile loads.
      if (name === '' || userIdRef.current === null) return
      if (listRef.current.items.some((existing) => existing.name.toLowerCase() === name.toLowerCase())) return

      const item: ShoppingItem = { id: newId(), name, quantity: 1, completed: false }
      setState((prev) => ({
        ...prev,
        list: {
          items: [...prev.list.items, item],
          prices: { ...prev.list.prices, [item.id]: PENDING_PRICES },
        },
      }))
      void runMatch(item)
    },
    [runMatch],
  )

  const removeItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setState((prev) => {
      const { [id]: _removed, ...prices } = prev.list.prices
      return { ...prev, list: { items: prev.list.items.filter((item) => item.id !== id), prices } }
    })
  }, [])

  const toggleCompleted = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      list: {
        ...prev.list,
        items: prev.list.items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
      },
    }))
  }, [])

  const refreshItem = useCallback(
    (id: string) => {
      const item = listRef.current.items.find((candidate) => candidate.id === id)
      if (item) void runMatch(item)
    },
    [runMatch],
  )

  const estimatedCost = useMemo(
    () =>
      list.items.reduce((total, item) => {
        const cheapest = cheapestMatch(list.prices[item.id]?.matches ?? [])
        return cheapest ? total + cheapest.priceAmount * item.quantity : total
      }, 0),
    [list],
  )

  const value = useMemo<ShoppingListContextType>(
    () => ({
      items: list.items,
      prices: list.prices,
      estimatedCost,
      addItem,
      removeItem,
      toggleCompleted,
      refreshItem,
    }),
    [list, estimatedCost, addItem, removeItem, toggleCompleted, refreshItem],
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
