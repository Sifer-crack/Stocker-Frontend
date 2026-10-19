export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
  } catch {
    // Unknown/invalid currency code from the backend: show the raw code rather than failing to render.
    return `${currency} ${amount.toFixed(2)}`
  }
}

/** e.g. "$0.45 / each", "$2.10 / L"; the products endpoint names the unit (each, l or kg). */
export function formatPerUnit(unitPrice: number, unit: 'each' | 'l' | 'kg' | null): string {
  const label = unit === 'l' ? 'L' : unit === 'kg' ? 'kg' : 'each'
  return `${formatPrice(unitPrice, 'NZD')} / ${label}`
}
