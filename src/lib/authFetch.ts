export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error
    }
  } catch {
    // Fall through to the generic message below.
  }
  return `Request failed with status ${response.status}`
}

export function authFetch(
  url: string,
  accessToken: string | null,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })
}
