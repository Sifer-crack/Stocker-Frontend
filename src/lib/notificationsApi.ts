import { API_BASE } from './apiConfig.ts'
import { authFetch, readErrorMessage } from './authFetch.ts'

/** An expiring pantry item (GET /api/notifications). The gateway sets the user from the JWT; never send a user id. */
export interface ExpiryNotification {
  id: string
  pantryItemId: string
  productId: string
  /** ISO date (yyyy-mm-dd), a calendar day with no time zone. */
  expirationDate: string
  status: 'NEW' | 'ACKNOWLEDGED'
  createdAt: string
  acknowledgedAt: string | null
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(await readErrorMessage(response))
  return (await response.json()) as T
}

export async function listNotifications(accessToken: string | null, signal?: AbortSignal): Promise<ExpiryNotification[]> {
  return readJson(await authFetch(`${API_BASE}/api/notifications`, accessToken, { signal }))
}

export async function acknowledgeNotification(id: string, accessToken: string | null): Promise<ExpiryNotification> {
  return readJson(
    await authFetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/acknowledge`, accessToken, {
      method: 'POST',
    }),
  )
}

/** Notifications only carry a product id, but users should see names, so look the name up via the gateway. */
export async function fetchProductName(productId: string, accessToken: string | null): Promise<string | null> {
  try {
    const data: unknown = await readJson(
      await authFetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}`, accessToken),
    )
    if (typeof data === 'object' && data !== null && 'productName' in data && typeof data.productName === 'string') {
      return data.productName
    }
  } catch {
    // Fall through: the caller shows a generic label instead.
  }
  return null
}
