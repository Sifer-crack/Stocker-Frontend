import { API_BASE } from '../lib/apiConfig.ts'
import { authFetch, readErrorMessage } from '../lib/authFetch.ts'
import { normChain } from './chains.ts'
import type {
  CompareShoppingListResult,
  FulfilmentMethod,
  SearchResultResponse,
  ShoppingListItemInput,
} from './types.ts'

export class PricingApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Every /api/pricing/** call needs the gateway JWT, so all requests go through authFetch. */
export async function requestJson<T>(url: string, accessToken: string | null, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, accessToken, init)
  if (!response.ok) {
    throw new PricingApiError(response.status, await readErrorMessage(response))
  }
  return (await response.json()) as T
}

/** For endpoints that answer 204 with no body (e.g. a DELETE), where parsing JSON would throw. */
export async function requestNoContent(url: string, accessToken: string | null, init?: RequestInit): Promise<void> {
  const response = await authFetch(url, accessToken, init)
  if (!response.ok) {
    throw new PricingApiError(response.status, await readErrorMessage(response))
  }
}

export interface SearchPricesParams {
  term: string
  itemId: string
  storeUrls?: string[]
  category?: string
}

export function searchPrices(params: SearchPricesParams, accessToken: string | null): Promise<SearchResultResponse> {
  const query = new URLSearchParams({ term: params.term, itemId: params.itemId })
  if (params.category) query.set('category', params.category)
  for (const storeUrl of params.storeUrls ?? []) {
    query.append('storeUrls', storeUrl)
  }
  return requestJson<SearchResultResponse>(`${API_BASE}/api/pricing/search?${query.toString()}`, accessToken)
}

export interface CompareShoppingListParams {
  items: ShoppingListItemInput[]
  region: string
  /** Any case; sent lower case, because the backend matches it case-sensitively. */
  selectedChainId?: string
  /** Omit or leave empty for all methods. */
  allowedMethods?: FulfilmentMethod[]
}

export function compareShoppingList(
  params: CompareShoppingListParams,
  accessToken: string | null,
): Promise<CompareShoppingListResult> {
  return requestJson<CompareShoppingListResult>(`${API_BASE}/api/pricing/compare`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: params.items,
      region: params.region,
      selectedChainId: params.selectedChainId ? normChain(params.selectedChainId) : null,
      ...(params.allowedMethods && params.allowedMethods.length > 0 ? { allowedMethods: params.allowedMethods } : {}),
    }),
  })
}
