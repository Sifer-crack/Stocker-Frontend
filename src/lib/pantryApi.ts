import { API_BASE } from './apiConfig.ts'
import { authFetch, readErrorMessage } from './authFetch.ts'

/**
 * Pantry and catalog calls, all through the gateway (`/api/pantry-items`, `/api/products`).
 *
 * Backend limitation: inventory takes `userId` as a request parameter and ignores the verified identity, and
 * PUT/DELETE by item id are not ownership-checked. Only ever send the current user's id (`useUser().user.id`).
 */

/** Mixed casing is the backend's: the three ids are snake_case, the rest camelCase. */
export interface PantryApiItem {
  pantry_item_id: string
  user_id: string
  /** Null for a free-text item that has no catalog entry. */
  product_id: string | null
  /** Set for free-text items (and best-effort for catalog ones); the catalog name is the source otherwise. */
  name?: string | null
  category?: string | null
  unit?: string | null
  quantity: number
  /** yyyy-mm-dd; null or absent when not set. */
  expirationDate?: string | null
  /** Null or absent = the backend's default of 3 days. */
  notifyDaysBefore?: number | null
}

export interface ProductApiItem {
  productId: string
  productName: string
  groceryType: string | null
  sellingWeightKg: number | null
  sellingVolumeL: number | null
}

async function ok(response: Response): Promise<Response> {
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return response
}

async function json<T>(url: string, accessToken: string | null, init?: RequestInit): Promise<T> {
  const response = await ok(await authFetch(url, accessToken, init))
  return (await response.json()) as T
}

export function listPantry(userId: string, accessToken: string | null): Promise<PantryApiItem[]> {
  const query = new URLSearchParams({ userId })
  return json(`${API_BASE}/api/pantry-items?${query.toString()}`, accessToken)
}

export interface AddPantryItemParams {
  userId: string
  /** A catalog product. Without one, `name` is required and the item is free text (e.g. Tim Tams). */
  productId?: string
  name?: string
  category?: string
  unit?: string
  quantity: number
  /** yyyy-mm-dd. Without a date no reminder is possible, so the threshold is then not sent. */
  expirationDate?: string
  notifyDaysBefore?: number
}

/** Adding a product already in the pantry adds to its quantity; a new date replaces the old one. */
export function addPantryItem(params: AddPantryItemParams, accessToken: string | null): Promise<PantryApiItem> {
  if (!params.productId || params.name) {
    // Free text goes in a JSON body; the query-parameter form below only knows catalog products.
    if (!params.name?.trim()) return Promise.reject(new Error('A pantry item needs a catalog product or a name.'))
    const hasDate = !!params.expirationDate
    return json(`${API_BASE}/api/pantry-items`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        ...(params.productId ? { productId: params.productId } : {}),
        name: params.name.trim(),
        ...(params.category ? { category: params.category } : {}),
        ...(params.unit ? { unit: params.unit } : {}),
        quantity: params.quantity,
        ...(hasDate ? { expirationDate: params.expirationDate } : {}),
        ...(hasDate && params.notifyDaysBefore != null ? { notifyDaysBefore: params.notifyDaysBefore } : {}),
      }),
    })
  }
  const query = new URLSearchParams({
    userId: params.userId,
    productId: params.productId,
    quantity: String(params.quantity),
  })
  if (params.expirationDate) {
    query.set('expirationDate', params.expirationDate)
    if (params.notifyDaysBefore != null) query.set('notifyDaysBefore', String(params.notifyDaysBefore))
  }
  return json(`${API_BASE}/api/pantry-items?${query.toString()}`, accessToken, { method: 'POST' })
}

export function updatePantryQuantity(id: string, quantity: number, accessToken: string | null): Promise<PantryApiItem> {
  const query = new URLSearchParams({ quantity: String(quantity) })
  return json(`${API_BASE}/api/pantry-items/${encodeURIComponent(id)}?${query.toString()}`, accessToken, {
    method: 'PUT',
  })
}

/** Passing null for the date clears the expiry (and the threshold with it). */
export function setPantryExpiry(
  id: string,
  expirationDate: string | null,
  notifyDaysBefore: number | null,
  accessToken: string | null,
): Promise<PantryApiItem> {
  const query = new URLSearchParams()
  if (expirationDate) {
    query.set('expirationDate', expirationDate)
    if (notifyDaysBefore != null) query.set('notifyDaysBefore', String(notifyDaysBefore))
  }
  return json(`${API_BASE}/api/pantry-items/${encodeURIComponent(id)}/expiry?${query.toString()}`, accessToken, {
    method: 'PUT',
  })
}

/** The backend answers 200 with an empty body, so there is nothing to parse. */
export async function deletePantryItem(id: string, accessToken: string | null): Promise<void> {
  await ok(await authFetch(`${API_BASE}/api/pantry-items/${encodeURIComponent(id)}`, accessToken, { method: 'DELETE' }))
}

export function searchProducts(query: string, accessToken: string | null, signal?: AbortSignal): Promise<ProductApiItem[]> {
  const params = new URLSearchParams({ query })
  return json(`${API_BASE}/api/products/search?${params.toString()}`, accessToken, { signal })
}

export function getProduct(productId: string, accessToken: string | null): Promise<ProductApiItem> {
  return json(`${API_BASE}/api/products/${encodeURIComponent(productId)}`, accessToken)
}
