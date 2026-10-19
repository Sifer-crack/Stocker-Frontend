import { matchItem, PricingApiError } from './api.ts'
import type { MatchItemParams } from './api.ts'
import type { MatchItemResponse } from './types.ts'

/**
 * An empty match can mean the backend deferred the fetch to its async refresh, so retry a few times
 * (delays in ms between attempts) before settling on "no prices found".
 */
const EMPTY_DELAYS_MS = [3000, 6000, 12000]

/**
 * `stale` prices are already shown; a refresh may be running behind them, so ask again once or twice.
 * Kept short on purpose: the backend rate-limits its supermarket refreshes, and every re-ask is a request to it.
 */
const STALE_DELAYS_MS = [8000, 16000]

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
 * Calls the match endpoint, retrying while it returns nothing (up to 3 times) or only stale prices (up to 2
 * times). Resolves with the last response, which may still be empty or `stale` after the last retry, or null
 * if `signal` aborted. Network/HTTP errors reject. `getToken` is read on every attempt so a long poll always
 * uses the latest access token. `onInterim` receives each response that is about to be retried, so stale
 * prices can be shown while the refresh runs.
 */
export async function matchWithPolling(
  params: Omit<MatchItemParams, 'signal'>,
  getToken: () => string | null,
  signal: AbortSignal,
  onInterim?: (interim: MatchItemResponse) => void,
): Promise<MatchItemResponse | null> {
  let emptyRetries = 0
  let staleRetries = 0
  for (;;) {
    const token = getToken()
    if (token === null) throw new PricingApiError(401, 'Sign in to fetch prices.')

    const result = await matchItem({ ...params, signal }, token)
    if (signal.aborted) return null

    const empty = result.matches.length === 0 && result.alternatives.length === 0
    let delay: number
    if (empty && emptyRetries < EMPTY_DELAYS_MS.length) {
      delay = EMPTY_DELAYS_MS[emptyRetries++]
    } else if (!empty && result.stale && staleRetries < STALE_DELAYS_MS.length) {
      delay = STALE_DELAYS_MS[staleRetries++]
    } else {
      return result
    }
    onInterim?.(result)
    if (!(await wait(delay, signal))) return null
  }
}
