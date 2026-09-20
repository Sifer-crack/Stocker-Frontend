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

export interface ApiErrorBody {
  error: string
}
