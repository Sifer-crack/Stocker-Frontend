import { API_BASE } from '../lib/apiConfig.ts'
import { requestJson } from './api.ts'
import type { ProductSearchResponse } from './types.ts'

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
