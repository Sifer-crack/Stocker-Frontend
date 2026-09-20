import type {
  ApiErrorBody,
  CompareShoppingListResult,
  SearchResultResponse,
  ShoppingListItemInput,
} from './types.ts'

const API_BASE_URL = (import.meta.env.VITE_GATEWAY_BASE_URL as string | undefined) ?? 'http://localhost:8080'

export class PricingApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (body.error) return body.error
  } catch {
    // response body wasn't JSON (or was empty) - fall through to the status text below.
  }
  return response.statusText || `Request failed with status ${response.status}`
}

export interface SearchPricesParams {
  term: string
  itemId: string
  storeUrls?: string[]
  category?: string
}

export async function searchPrices(params: SearchPricesParams): Promise<SearchResultResponse> {
  const query = new URLSearchParams({ term: params.term, itemId: params.itemId })
  if (params.category) query.set('category', params.category)
  for (const storeUrl of params.storeUrls ?? []) {
    query.append('storeUrls', storeUrl)
  }

  const response = await fetch(`${API_BASE_URL}/api/pricing/search?${query.toString()}`)
  if (!response.ok) {
    throw new PricingApiError(response.status, await parseErrorMessage(response))
  }
  return (await response.json()) as SearchResultResponse
}

export interface CompareShoppingListParams {
  items: ShoppingListItemInput[]
  region: string
  selectedChainId?: string
}

export async function compareShoppingList(
  params: CompareShoppingListParams,
): Promise<CompareShoppingListResult> {
  const response = await fetch(`${API_BASE_URL}/api/pricing/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: params.items,
      region: params.region,
      selectedChainId: params.selectedChainId || null,
    }),
  })
  if (!response.ok) {
    throw new PricingApiError(response.status, await parseErrorMessage(response))
  }
  return (await response.json()) as CompareShoppingListResult
}
