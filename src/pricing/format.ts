export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
  } catch {
    // Unknown/invalid currency code from the backend: show the raw code rather than failing to render.
    return `${currency} ${amount.toFixed(2)}`
  }
}

/** The backend may use a store URL as the store id; show just the host in that case. */
export function storeLabel(storeId: string): string {
  if (!/^https?:\/\//i.test(storeId)) return storeId
  try {
    return new URL(storeId).hostname
  } catch {
    return storeId
  }
}
