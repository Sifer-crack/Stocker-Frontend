import { matchItem, PricingApiError } from './api.ts'
import type { MatchItemParams } from './api.ts'
import type { MatchItemResponse } from './types.ts'

/**
 * An empty match can mean the backend deferred the fetch to its async refresh, so retry a few times
 * (delays in ms between attempts) before settling on "no prices found".
 */
const POLL_DELAYS_MS = [3000, 6000, 12000]

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
 * Calls the match endpoint, retrying while it returns nothing. Resolves with the last response (its
 * `matches` may still be empty after the last retry), or null if `signal` aborted. Network/HTTP errors
 * reject. `getToken` is read on every attempt so a long poll always uses the latest access token.
 */
export async function matchWithPolling(
  params: Omit<MatchItemParams, 'signal'>,
  getToken: () => string | null,
  signal: AbortSignal,
): Promise<MatchItemResponse | null> {
  for (let attempt = 0; ; attempt++) {
    const token = getToken()
    if (token === null) throw new PricingApiError(401, 'Sign in to fetch prices.')

    const result = await matchItem({ ...params, signal }, token)
    if (signal.aborted) return null
    if (result.matches.length > 0 || attempt >= POLL_DELAYS_MS.length) return result
    if (!(await wait(POLL_DELAYS_MS[attempt], signal))) return null
  }
}
