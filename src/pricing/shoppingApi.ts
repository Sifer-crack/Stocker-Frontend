import { API_BASE } from '../lib/apiConfig.ts'
import { requestJson } from './api.ts'

/** One observed price for a shopping item at a (chain, store). */
export interface PriceView {
  chainId: string
  storeId: string
  priceAmount: number
  currency: string
  promoFlag: boolean
  capturedAt: string | null
}

/**
 * "pending" = not compared yet (or pricing was slow; a later push may still arrive), "available" = comparison
 * stored, "unavailable" = pricing rejected the request (e.g. outside the service area).
 */
export type ComparisonStatus = 'pending' | 'available' | 'unavailable'

/** The complete client-facing state of a server-side shopping item; the REST API and the live push share it. */
export interface ServerShoppingItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  region: string | null
  quantity: number
  comparisonStatus: ComparisonStatus
  /** Null unless comparisonStatus is "available". */
  cheapest: PriceView | null
  /** Every compared (chain, store) price, ascending. */
  prices: PriceView[]
  comparedAt: string | null
  createdAt: string
}

/** Data of the `shopping-item-updated` event on GET /api/updates/shopping. */
export interface ShoppingItemUpdate {
  source: 'sync' | 'backfill'
  item: ServerShoppingItem
}

export interface AddShoppingItemParams {
  name: string
  quantity?: number
  category?: string
  /** Optional; when given it must be a region pricing serves, otherwise the item ends up "unavailable". */
  region?: string
}

/** Returns immediately with comparisonStatus "pending"; the comparison arrives later through the live stream. */
export function addShoppingItem(params: AddShoppingItemParams, accessToken: string | null): Promise<ServerShoppingItem> {
  return requestJson<ServerShoppingItem>(`${API_BASE}/api/shopping/items`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export function listShoppingItems(accessToken: string | null, signal?: AbortSignal): Promise<ServerShoppingItem[]> {
  return requestJson<ServerShoppingItem[]>(`${API_BASE}/api/shopping/items`, accessToken, { signal })
}

const COMPARISON_STATUSES: readonly string[] = ['pending', 'available', 'unavailable']

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null
}

export function isServerShoppingItem(data: unknown): data is ServerShoppingItem {
  return (
    isRecord(data) &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.quantity === 'number' &&
    typeof data.comparisonStatus === 'string' &&
    COMPARISON_STATUSES.includes(data.comparisonStatus) &&
    Array.isArray(data.prices)
  )
}

/** Parses the data of a `shopping-item-updated` event; null for anything that is not a valid item update. */
export function parseShoppingItemUpdate(raw: string): ShoppingItemUpdate | null {
  try {
    const data: unknown = JSON.parse(raw)
    if (isRecord(data) && isServerShoppingItem(data.item)) {
      return { source: data.source === 'backfill' ? 'backfill' : 'sync', item: data.item }
    }
  } catch {
    // Malformed JSON: ignore the event.
  }
  return null
}
