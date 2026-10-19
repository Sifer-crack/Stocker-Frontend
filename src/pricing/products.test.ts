import { describe, expect, it } from 'vitest'
import { cheapestChainFor, cheapestOverall, priceAt } from './products.ts'
import type { ProductView } from './types.ts'

function product(prices: Record<string, number>, name = 'Milk 2L'): ProductView {
  return {
    productKey: name,
    name,
    brand: null,
    category: null,
    packSize: null,
    grade: null,
    unit: 'l',
    unitPrice: null,
    cheapestChainId: null,
    prices: Object.fromEntries(
      Object.entries(prices).map(([chain, price]) => [chain, { price, unitPrice: null, promo: false, storeId: '', capturedAt: null, stale: false }]),
    ),
  }
}

describe('products', () => {
  it('finds the cheapest chain and ignores chains that do not carry the product', () => {
    expect(cheapestChainFor(product({ newworld: 5, paknsave: 4.2 }))).toBe('paknsave')
    expect(cheapestChainFor(product({}))).toBeNull()
  })

  it('looks a chain up regardless of case', () => {
    expect(priceAt(product({ paknsave: 4.2 }), 'PAKNSAVE')?.price).toBe(4.2)
    expect(priceAt(product({ paknsave: 4.2 }), 'woolworths')).toBeNull()
  })

  it('picks the cheapest price across products', () => {
    const best = cheapestOverall([product({ newworld: 5 }, 'A'), product({ woolworths: 3.5, paknsave: 4 }, 'B')])
    expect(best).toMatchObject({ chainId: 'woolworths', price: 3.5 })
    expect(best?.product.name).toBe('B')
    expect(cheapestOverall([])).toBeNull()
  })
})
