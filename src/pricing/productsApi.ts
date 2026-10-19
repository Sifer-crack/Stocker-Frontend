import { API_BASE } from '../lib/apiConfig.ts'
import { requestJson } from './api.ts'
import type { ProductSearchResponse, ProductSuggestion, ProductSuggestResponse } from './types.ts'

export interface ProductSearchParams {
  /** What the user typed, e.g. "eggs size 7"; size and grade qualifiers are read from it. */
  term: string
  /** The shopping-list item (or search) the backend stores the first product's prices under. */
  itemId: string
  category?: string
  signal?: AbortSignal
}

export function fetchProducts(params: ProductSearchParams, accessToken: string | null): Promise<ProductSearchResponse> {
  const query = new URLSearchParams({ term: params.term, itemId: params.itemId })
  if (params.category) query.set('category', params.category)
  return requestJson<ProductSearchResponse>(`${API_BASE}/api/pricing/products?${query.toString()}`, accessToken, {
    signal: params.signal,
  })
}

/** After this, compare prices exactly this product for the item. 404 when the key is not currently known. */
export function selectItemProduct(itemId: string, productKey: string, accessToken: string | null): Promise<{ chains: string[] }> {
  return requestJson<{ chains: string[] }>(
    `${API_BASE}/api/pricing/items/${encodeURIComponent(itemId)}/product`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productKey }),
    },
  )
}

/** Search-bar suggestions; an empty or 1-char query returns the most widely stocked products, unknown text an empty list. */
export async function fetchSuggestions(
  q: string,
  accessToken: string | null,
  signal?: AbortSignal,
  limit = 8,
): Promise<ProductSuggestion[]> {
  const query = new URLSearchParams({ q, limit: String(limit) })
  const response = await requestJson<ProductSuggestResponse>(
    `${API_BASE}/api/pricing/suggest?${query.toString()}`,
    accessToken,
    { signal },
  )
  return response.suggestions ?? []
}
