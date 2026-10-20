import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSuggestions } from './productsApi.ts'

afterEach(() => vi.unstubAllGlobals())

describe('fetchSuggestions', () => {
  it('asks /api/pricing/suggest with q and limit and returns the suggestions', async () => {
    const suggestion = { text: 'Cooking wine', canonicalKey: null, chainCount: 3, chains: [], sampleSize: null, productCount: 9 }
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ q: 'wine', suggestions: [suggestion] }))
    vi.stubGlobal('fetch', fetchMock)
    const found = await fetchSuggestions('wine', 't')
    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.pathname).toBe('/api/pricing/suggest')
    expect(url.searchParams.get('q')).toBe('wine')
    expect(url.searchParams.get('limit')).toBe('8')
    expect(found).toEqual([suggestion])
  })

  it('returns an empty list when the answer has none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ q: 'zzz' })))
    expect(await fetchSuggestions('zzz', 't')).toEqual([])
  })
})
