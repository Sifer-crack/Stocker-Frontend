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

/** One product the price engine matched to a requested item (GET /api/pricing/match). */
export interface MatchView {
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
  /** Always null today: there is nothing to link to, so don't render a link. */
  productUrl: string | null
  /** "exact" for `matches`, "alternative" for `alternatives`. */
  matchType: 'exact' | 'alternative'
  /** Price per kg, L or item; null when the pack size is unknown. */
  unitPrice: number | null
  /** The pack size as the backend parsed it, e.g. "2l" or "500g". */
  packSize: string | null
}

/** "lexical" means the backend fell back to keyword scoring instead of its canonical product match. */
export type MatchMethod = 'canonical' | 'lexical'

export interface MatchItemResponse {
  matchMethod: MatchMethod
  /** At most one per chain, cheapest first. Empty (with empty `alternatives`) means nothing stored yet, not an error. */
  matches: MatchView[]
  /** Similar products that are not the exact thing asked for; show them apart from `matches`. */
  alternatives: MatchView[]
  /** Some prices are older than 12 h and a refresh may be running, so asking again shortly can return newer ones. */
  stale: boolean
}
