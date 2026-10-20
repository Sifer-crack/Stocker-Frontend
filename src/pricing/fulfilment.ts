import { formatPrice } from './format.ts'
import type { FulfilmentMethod, StoreTotal } from './types.ts'

export const FULFILMENT_METHODS: readonly { id: FulfilmentMethod; label: string }[] = [
  { id: 'click_and_collect', label: 'Click and collect' },
  { id: 'delivery', label: 'Delivery' },
]

export function methodLabel(method: FulfilmentMethod | null): string {
  return FULFILMENT_METHODS.find((candidate) => candidate.id === method)?.label ?? 'No fee data'
}

/** "Free" for 0, otherwise the price; a chain with no fee data shows a dash. */
export function feeText(storeTotal: StoreTotal): string {
  if (storeTotal.bestMethod === null) return '—'
  return storeTotal.fulfilmentCost === 0 ? 'Free' : formatPrice(storeTotal.fulfilmentCost, storeTotal.currency)
}

/** Savings can be negative (the chain is dearer than the baseline): say so rather than clamping. */
export function savingsText(storeTotal: StoreTotal): string {
  const { savingsAmount, currency } = storeTotal
  if (savingsAmount > 0) return `${formatPrice(savingsAmount, currency)} saved`
  if (savingsAmount < 0) return `Costs ${formatPrice(-savingsAmount, currency)} more`
  return '—'
}
