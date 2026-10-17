import { authFetch } from './authFetch'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const REPORT_PATH = `${API_BASE}/api/identity/me/spending-report`

export interface SpendingReportItem {
  name: string
  quantity: number
  price: number
}

export interface SpendingReportDay {
  total: number
  items: Record<string, SpendingReportItem>
}

export type SpendingReport = Record<string, SpendingReportDay>

export interface SpendingReportPayload {
  'spending-report': SpendingReport
}

export function formatReportDateKey(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}_${month}_${year}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function fetchSpendingReport(
  accessToken: string | null,
): Promise<SpendingReport> {
  const response = await authFetch(REPORT_PATH, accessToken)

  if (!response.ok) {
    if (response.status === 404) {
      return {}
    }
    throw new Error(`Could not load spending report (status ${response.status})`)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    return {}
  }

  if (!isRecord(data)) {
    return {}
  }

  const report = 'spending-report' in data ? data['spending-report'] : data
  return isRecord(report) ? (report as SpendingReport) : {}
}

export async function saveSpendingReport(
  accessToken: string | null,
  report: SpendingReport,
): Promise<void> {
  const payload: SpendingReportPayload = { 'spending-report': report }
  const response = await authFetch(REPORT_PATH, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Could not save spending report (status ${response.status})`)
  }
}

function flattenItems(
  items: Record<string, SpendingReportItem>,
): SpendingReportItem[] {
  return Object.keys(items)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => items[key])
}

export function mergePurchaseIntoReport(
  report: SpendingReport,
  dateKey: string,
  newItems: SpendingReportItem[],
  total: number,
): SpendingReport {
  const existingDay = report[dateKey]
  const combinedItems = existingDay
    ? [...flattenItems(existingDay.items), ...newItems]
    : [...newItems]

  const items: Record<string, SpendingReportItem> = {}
  combinedItems.forEach((item, index) => {
    items[String(index)] = item
  })

  return {
    ...report,
    [dateKey]: {
      total: (existingDay?.total ?? 0) + total,
      items,
    },
  }
}
