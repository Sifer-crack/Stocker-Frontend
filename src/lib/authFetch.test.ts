import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tokens = (accessToken: string) => Response.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 })
const authHeader = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get('Authorization')

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  // Session state is module-level, so load a fresh copy for every test.
  vi.resetModules()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('authFetch', () => {
  it('refreshes once on a 401 and retries with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(tokens('new'))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const { authFetch } = await import('./authFetch.ts')

    const response = await authFetch('http://x/api/y', 'old')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(authHeader(fetchMock.mock.calls[2])).toBe('Bearer new')
  })

  it('ends the session when the refresh is denied', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
    const { authFetch } = await import('./authFetch.ts')
    const { onSessionExpired } = await import('./session.ts')
    const expired = vi.fn()
    onSessionExpired(expired)

    const response = await authFetch('http://x/api/y', 'old')

    expect(response.status).toBe(401)
    expect(expired).toHaveBeenCalledOnce()
  })

  it('keeps the session when the refresh fails on the network', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 })).mockRejectedValueOnce(new TypeError('offline'))
    const { authFetch } = await import('./authFetch.ts')
    const { onSessionExpired } = await import('./session.ts')
    const expired = vi.fn()
    onSessionExpired(expired)

    const response = await authFetch('http://x/api/y', 'old')

    expect(response.status).toBe(401)
    expect(expired).not.toHaveBeenCalled()
  })

  it('shares one refresh between parallel 401s', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/refresh') ? tokens('new') : new Response('', { status: authHeaderOld(url) })),
    )
    // First call per URL gets 401; the retry (after the refresh) succeeds.
    const seen = new Set<string>()
    function authHeaderOld(url: string) {
      if (seen.has(url)) return 200
      seen.add(url)
      return 401
    }
    const { authFetch } = await import('./authFetch.ts')

    await Promise.all([authFetch('http://x/a', 'old'), authFetch('http://x/b', 'old')])

    const refreshes = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/refresh'))
    expect(refreshes).toHaveLength(1)
  })

  it('does not refresh when the request had no token', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    const { authFetch } = await import('./authFetch.ts')

    await authFetch('http://x/api/identity/login', null)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
