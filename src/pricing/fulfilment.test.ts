import { describe, expect, it } from 'vitest'
import { feeText, methodLabel, savingsText } from './fulfilment.ts'
import type { StoreTotal } from './types.ts'

const total = (overrides: Partial<StoreTotal>): StoreTotal => ({
  chainId: 'woolworths',
  totalAmount: 17.7,
  currency: 'NZD',
  itemsPriced: 3,
  unavailableItemIds: [],
  savingsAmount: 0,
  totalWithFulfilment: 21.2,
  bestMethod: 'click_and_collect',
  fulfilmentCost: 3.5,
  fulfilmentOptions: [],
  ...overrides,
})

describe('fulfilment text', () => {
  it('labels methods, and a missing method as no fee data', () => {
    expect(methodLabel('delivery')).toBe('Delivery')
    expect(methodLabel('click_and_collect')).toBe('Click and collect')
    expect(methodLabel(null)).toBe('No fee data')
  })

  it('shows Free for a zero fee, a dash with no fee data, otherwise the price', () => {
    expect(feeText(total({ fulfilmentCost: 0 }))).toBe('Free')
    expect(feeText(total({ bestMethod: null, fulfilmentCost: 0 }))).toBe('—')
    expect(feeText(total({}))).toContain('3.50')
  })

  it('shows negative savings as a cost instead of clamping them', () => {
    expect(savingsText(total({ savingsAmount: 1.6 }))).toContain('1.60')
    expect(savingsText(total({ savingsAmount: 1.6 }))).toContain('saved')
    expect(savingsText(total({ savingsAmount: -2 }))).toMatch(/^Costs .*2\.00 more$/)
    expect(savingsText(total({ savingsAmount: 0 }))).toBe('—')
  })
})
