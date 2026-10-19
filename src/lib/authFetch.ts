import { getLatestToken, notifySessionExpired, refreshSession } from './session.ts'

/** The backend answers `{ "error": "..." }`; inventory and notifications answer `{ "message": "..." }`. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null) {
      if ('error' in data && typeof data.error === 'string') return data.error
      if ('message' in data && typeof data.message === 'string') return data.message
    }
  } catch {
    // Fall through to the generic message below.
  }
  return `Request failed with status ${response.status}`
}

/**
 * fetch with the gateway JWT. On a 401 the access token has probably expired: refresh once (or pick up the
 * token another call already refreshed) and retry the request once. If that fails the session is over and
 * the original 401 is returned. Bodies must be strings or other re-sendable values, never streams.
 */
export async function authFetch(
  url: string,
  accessToken: string | null,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...init, headers, credentials: 'include' })
  }

  const response = await send(accessToken)
  if (response.status !== 401 || accessToken === null) return response

  const latest = getLatestToken()
  let next: string | null = null
  if (latest !== null && latest !== accessToken) {
    next = latest
  } else {
    const refreshed = await refreshSession()
    if (refreshed.status === 'denied') {
      notifySessionExpired()
      return response
    }
    // A network error says nothing about the session: give the caller the original 401 and keep the user signed in.
    if (refreshed.status === 'error') return response
    next = refreshed.tokens.accessToken
  }
  return send(next)
}
