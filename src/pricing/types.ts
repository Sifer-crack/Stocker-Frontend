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

export type MatchMethod = 'canonical' | 'lexical'

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

/** GET /api/pricing/products: one product, with a price per chain (chain ids are lower case here). */
export interface ChainPrice {
  price: number
  unitPrice: number | null
  promo: boolean
  /** Prices are tracked per chain, so the UI ignores this. */
  storeId: string
  capturedAt: string | null
  stale: boolean
}

export interface ProductView {
  /** Stable id of the product; what PUT /api/pricing/items/{itemId}/product takes. */
  productKey: string
  name: string
  brand: string | null
  category: string | null
  packSize: string | null
  grade: string | null
  unit: 'each' | 'l' | 'kg' | null
  /** The cheapest chain's price per unit. */
  unitPrice: number | null
  cheapestChainId: string | null
  /** Keyed by lower-case chain id; a chain that is missing does not carry the product (or has no data yet). */
  prices: Record<string, ChainPrice>
}

/** `refreshing` is the only non-terminal state; `not-found` is final. */
export type ProductSearchStatus = 'found' | 'alternatives-only' | 'refreshing' | 'not-found'

export type RefreshState = 'pending' | 'done' | 'failed' | 'skipped'

export interface ProductSearchResponse {
  matchMethod: MatchMethod | 'generic-fallback'
  status: ProductSearchStatus
  stale: boolean
  /** Per-chain page-load progress, keyed by lower-case chain id; empty when unknown. */
  refresh: Record<string, RefreshState>
  products: ProductView[]
  /** Genuinely different products of the same category, at most 5. */
  alternatives: ProductView[]
}
