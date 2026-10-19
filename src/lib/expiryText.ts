const DAY_MS = 24 * 60 * 60 * 1000

/** "Expires today", "Expires in 3 days" or "Expired 2 days ago", comparing calendar days in the local zone. */
export function expiryText(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const today = new Date()
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY_MS)
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days > 1) return `Expires in ${days} days`
  return days === -1 ? 'Expired yesterday' : `Expired ${-days} days ago`
}
