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

export type FulfilmentMethod = 'delivery' | 'click_and_collect'

export interface FulfilmentOption {
  method: FulfilmentMethod
  /** The delivery or click-and-collect fee. */
  cost: number
  /** Items total + cost. */
  totalAmount: number
}

export interface StoreTotal {
  /** Lower case here, unlike the upper-case chain ids in /match results. */
  chainId: string
  /** Items only, without any fulfilment fee. */
  totalAmount: number
  currency: string
  itemsPriced: number
  unavailableItemIds: string[]
  /** Relative to the selected chain's totalWithFulfilment; negative when this chain is dearer. */
  savingsAmount: number
  /** Equals totalAmount when no fee applies. */
  totalWithFulfilment: number
  /** Null = the chain has no fee data (no fee applied). */
  bestMethod: FulfilmentMethod | null
  /** The fee of bestMethod (0 when null). */
  fulfilmentCost: number
  /** Every allowed option the chain offers; empty when bestMethod is null. */
  fulfilmentOptions: FulfilmentOption[]
}

export interface CompareShoppingListResult {
  /** May be empty: chains that offer methods but none of the allowed ones are left out. */
  storeTotals: StoreTotal[]
  /** Includes fulfilment fees; "" when storeTotals is empty. */
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

/** A saved supermarket chain, optionally narrowed to one store (GET /api/shopping/favorite-stores). */
export interface FavoriteStore {
  id: string
  /** Lower-case here (e.g. "paknsave"), unlike the upper-case chain ids in price results. */
  chainId: string
  storeId: string | null
  createdAt: string
}

/** One product stored for a chain (GET /api/pricing/stores/{chainId}/products). Database only; never a live supermarket request. */
export interface StoreProduct {
  /** An ingest id like "newworld:P123". Never show it; add products to the list by name. */
  itemId: string
  name: string
  brand: string | null
  priceAmount: number
  currency: string
  promoFlag: boolean
  packSize: string | null
  capturedAt: string | null
}

export interface StoreProductsResponse {
  products: StoreProduct[]
}
