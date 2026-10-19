import { fetchProducts } from './productsApi.ts'
import type { ProductSearchParams } from './productsApi.ts'
import type { ProductSearchResponse } from './types.ts'

/** Re-asking is cheap and starts no supermarket request while a page load is pending, so poll briskly but not forever. */
export const REASK_DELAY_MS = 2500
export const MAX_REASKS = 10

/** True while the backend is still loading a supermarket page for this search. */
export function shouldReask(response: ProductSearchResponse): boolean {
  return response.status === 'refreshing' || Object.values(response.refresh).includes('pending')
}

/** Resolves true after `ms`, or false as soon as the signal aborts. */
function wait(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      resolve(false)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Asks for the products and keeps asking while the backend reports a page load in progress, passing every answer to
 * `onUpdate` so the UI can show prices and per-chain progress as they arrive. Resolves with the last answer, or null if
 * `signal` aborted. Network/HTTP errors reject. `getToken` is read on every attempt so a long poll survives a refresh.
 */
export async function productsWithPolling(
  params: Omit<ProductSearchParams, 'signal'>,
  getToken: () => string | null,
  signal: AbortSignal,
  onUpdate: (response: ProductSearchResponse) => void,
  delayMs = REASK_DELAY_MS,
): Promise<ProductSearchResponse | null> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetchProducts({ ...params, signal }, getToken())
    if (signal.aborted) return null
    onUpdate(response)
    if (!shouldReask(response) || attempt >= MAX_REASKS) return response
    if (!(await wait(delayMs, signal))) return null
  }
}
