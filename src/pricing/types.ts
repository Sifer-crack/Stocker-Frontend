export interface PriceRecord {
  id: string
  itemId: string
  storeId: string
  chainId: string
  channel: string
  priceAmount: number
  currency: string
  promoFlag: boolean
  capturedAt: string | null
}

export interface SearchResultResponse {
  priceRecords: PriceRecord[]
}

export interface ShoppingListItemInput {
  itemId: string
  quantity: number
}

export interface StoreTotal {
  chainId: string
  totalAmount: number
  currency: string
  itemsPriced: number
  unavailableItemIds: string[]
  savingsAmount: number
}

export interface CompareShoppingListResult {
  storeTotals: StoreTotal[]
  cheapestChainId: string
  selectedChainId: string
}

/** The one product a chain matched to a requested item (GET /api/pricing/match). */
export interface ChainMatch {
  chainId: string
  storeId: string
  productName: string
  brand: string | null
  priceAmount: number
  currency: string
  promoFlag: boolean
  capturedAt: string | null
  /** 0..1 similarity between the requested term and productName. */
  score: number
  productUrl: string | null
}

/** "lexical" means the backend's embedding provider was unavailable and it fell back to keyword scoring. */
export type MatchMethod = 'semantic' | 'lexical'

export interface MatchItemResponse {
  matchMethod: MatchMethod
  /** At most one per chain. Empty means nothing found (yet). */
  matches: ChainMatch[]
}
