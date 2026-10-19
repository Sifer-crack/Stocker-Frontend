import { API_BASE } from './apiConfig.ts'

/** What login and refresh both answer: a short-lived access token (the refresh cookie is httpOnly, never seen here). */
export interface SessionTokens {
  accessToken: string
  /** Lifetime in seconds. */
  expiresIn: number
}

const DEFAULT_LIFETIME_SECONDS = 900

export function parseSessionTokens(data: unknown): SessionTokens | null {
  if (typeof data !== 'object' || data === null || !('accessToken' in data) || typeof data.accessToken !== 'string') {
    return null
  }
  const expiresIn = 'expiresIn' in data && typeof data.expiresIn === 'number' ? data.expiresIn : DEFAULT_LIFETIME_SECONDS
  return { accessToken: data.accessToken, expiresIn }
}

let latestToken: string | null = null
const tokenListeners = new Set<(tokens: SessionTokens) => void>()
const expiredListeners = new Set<() => void>()

/** The newest access token known anywhere in the app (set by login and every refresh). */
export function getLatestToken(): string | null {
  return latestToken
}

export function setLatestToken(token: string | null): void {
  latestToken = token
}

/** Called with the new tokens whenever a refresh succeeds, so AuthContext can update its state. */
export function onTokensRefreshed(listener: (tokens: SessionTokens) => void): () => void {
  tokenListeners.add(listener)
  return () => tokenListeners.delete(listener)
}

/** Called when a request got 401 and the refresh failed too: the session is over. */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

export function notifySessionExpired(): void {
  latestToken = null
  for (const listener of expiredListeners) listener()
}

/**
 * "ok": new tokens. "denied": the refresh call answered 401 or similar, so there is no valid session.
 * "error": the call itself failed (network, gateway restarting), which says nothing about the session.
 */
export type RefreshResult = { status: 'ok'; tokens: SessionTokens } | { status: 'denied' } | { status: 'error' }

let inflightRefresh: Promise<RefreshResult> | null = null

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Refresh tokens rotate, so two parallel calls
 * would invalidate each other: all callers share the one in-flight request. Never throws.
 */
export function refreshSession(): Promise<RefreshResult> {
  inflightRefresh ??= (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${API_BASE}/api/identity/refresh`, { method: 'POST', credentials: 'include' })
      if (!response.ok) return response.status >= 500 ? { status: 'error' } : { status: 'denied' }
      const tokens = parseSessionTokens(await response.json())
      if (!tokens) return { status: 'error' }
      latestToken = tokens.accessToken
      for (const listener of tokenListeners) listener(tokens)
      return { status: 'ok', tokens }
    } catch {
      return { status: 'error' }
    } finally {
      inflightRefresh = null
    }
  })()
  return inflightRefresh
}
