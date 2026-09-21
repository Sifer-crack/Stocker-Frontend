import { API_BASE } from '../lib/apiConfig.ts'
import { authFetch, readErrorMessage } from '../lib/authFetch.ts'
import type {
  CompareShoppingListResult,
  MatchItemResponse,
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
async function requestJson<T>(url: string, accessToken: string | null, init?: RequestInit): Promise<T> {
  const response = await authFetch(url, accessToken, init)
  if (!response.ok) {
    throw new PricingApiError(response.status, await readErrorMessage(response))
  }
  return (await response.json()) as T
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
  selectedChainId?: string
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
      selectedChainId: params.selectedChainId || null,
    }),
  })
}

export interface MatchItemParams {
  /** What the user typed, e.g. "full cream milk 2L"; matched semantically per chain. */
  term: string
  /** The shopping-list item's id; the backend stores the matched prices under it. */
  itemId: string
  category?: string
  signal?: AbortSignal
}

export function matchItem(params: MatchItemParams, accessToken: string | null): Promise<MatchItemResponse> {
  const query = new URLSearchParams({ term: params.term, itemId: params.itemId })
  if (params.category) query.set('category', params.category)
  return requestJson<MatchItemResponse>(`${API_BASE}/api/pricing/match?${query.toString()}`, accessToken, {
    signal: params.signal,
  })
}
