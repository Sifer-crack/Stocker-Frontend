import { normChain } from './chains.ts'
import type { ProductView } from './types.ts'

/** The chain with the lowest shelf price for a product, or null when no chain carries it. */
export function cheapestChainFor(product: ProductView): string | null {
  let best: string | null = null
  let bestPrice = Infinity
  for (const [chainId, entry] of Object.entries(product.prices)) {
    if (entry.price < bestPrice) {
      best = normChain(chainId)
      bestPrice = entry.price
    }
  }
  return best
}

/** The price at one chain; chain ids are lower case in this endpoint but go through normChain to be safe. */
export function priceAt(product: ProductView, chainId: string) {
  const wanted = normChain(chainId)
  const key = Object.keys(product.prices).find((candidate) => normChain(candidate) === wanted)
  return key === undefined ? null : product.prices[key]
}

/** The overall cheapest price across products and chains, for the "Cheapest at ..." summary. */
export function cheapestOverall(products: readonly ProductView[]): { product: ProductView; chainId: string; price: number } | null {
  let best: { product: ProductView; chainId: string; price: number } | null = null
  for (const product of products) {
    const chainId = cheapestChainFor(product)
    const entry = chainId === null ? null : priceAt(product, chainId)
    if (chainId !== null && entry !== null && (best === null || entry.price < best.price)) {
      best = { product, chainId, price: entry.price }
    }
  }
  return best
}
