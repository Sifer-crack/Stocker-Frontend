import { afterEach, describe, expect, it, vi } from 'vitest'
import { productsWithPolling, shouldReask, MAX_REASKS } from './productPolling.ts'
import type { ProductSearchResponse } from './types.ts'

function answer(overrides: Partial<ProductSearchResponse>): ProductSearchResponse {
  return { matchMethod: 'canonical', status: 'found', stale: false, refresh: {}, products: [], alternatives: [], ...overrides }
}

function stubAnswers(...responses: ProductSearchResponse[]) {
  let call = 0
  // A fresh Response per call: a body can be read only once. The last answer repeats.
  const fetchMock = vi.fn(async () => Response.json(responses[Math.min(call++, responses.length - 1)]))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('shouldReask', () => {
  it('asks again only while a page load is in progress', () => {
    expect(shouldReask(answer({ status: 'refreshing' }))).toBe(true)
    expect(shouldReask(answer({ status: 'found', refresh: { newworld: 'pending' } }))).toBe(true)
    expect(shouldReask(answer({ status: 'not-found', refresh: { newworld: 'done', paknsave: 'failed' } }))).toBe(false)
    expect(shouldReask(answer({ status: 'alternatives-only' }))).toBe(false)
  })
})

describe('productsWithPolling', () => {
  it('re-asks until the search leaves refreshing, reporting every answer', async () => {
    const fetchMock = stubAnswers(answer({ status: 'refreshing' }), answer({ status: 'refreshing' }), answer({ status: 'not-found' }))
    const seen: string[] = []
    const result = await productsWithPolling({ term: 'quinoa', itemId: 'i' }, () => 't', new AbortController().signal, (r) => seen.push(r.status), 0)
    expect(result?.status).toBe('not-found')
    expect(seen).toEqual(['refreshing', 'refreshing', 'not-found'])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('gives up after the re-ask cap even if the backend keeps saying refreshing', async () => {
    const fetchMock = stubAnswers(answer({ status: 'refreshing' }))
    const result = await productsWithPolling({ term: 'x', itemId: 'i' }, () => 't', new AbortController().signal, () => {}, 0)
    expect(result?.status).toBe('refreshing')
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REASKS + 1)
  })

  it('returns null when aborted', async () => {
    stubAnswers(answer({ status: 'refreshing' }))
    const controller = new AbortController()
    const result = await productsWithPolling({ term: 'x', itemId: 'i' }, () => 't', controller.signal, () => controller.abort(), 0)
    expect(result).toBeNull()
  })

  it('does not re-ask a final answer', async () => {
    const fetchMock = stubAnswers(answer({ status: 'found' }))
    await productsWithPolling({ term: 'x', itemId: 'i' }, () => 't', new AbortController().signal, () => {}, 0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
