import { API_BASE } from '../lib/apiConfig.ts'
import { requestJson, requestNoContent } from './api.ts'
import type { FavoriteStore, StoreProduct, StoreProductsResponse } from './types.ts'

export function listFavoriteStores(accessToken: string | null, signal?: AbortSignal): Promise<FavoriteStore[]> {
  return requestJson<FavoriteStore[]>(`${API_BASE}/api/shopping/favorite-stores`, accessToken, { signal })
}

/** Saving the same chain/store again returns the existing favorite rather than failing. */
export function addFavoriteStore(
  chainId: string,
  storeId: string | null,
  accessToken: string | null,
): Promise<FavoriteStore> {
  return requestJson<FavoriteStore>(`${API_BASE}/api/shopping/favorite-stores`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainId, storeId }),
  })
}

export function removeFavoriteStore(id: string, accessToken: string | null): Promise<void> {
  return requestNoContent(`${API_BASE}/api/shopping/favorite-stores/${encodeURIComponent(id)}`, accessToken, {
    method: 'DELETE',
  })
}

/** `query` keeps only matching products, best first; `limit` defaults to 50 on the server (max 200). */
export async function listStoreProducts(
  chainId: string,
  query: string,
  accessToken: string | null,
  signal?: AbortSignal,
): Promise<StoreProduct[]> {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  const response = await requestJson<StoreProductsResponse>(
    `${API_BASE}/api/pricing/stores/${encodeURIComponent(chainId)}/products${suffix}`,
    accessToken,
    { signal },
  )
  return response.products
}
