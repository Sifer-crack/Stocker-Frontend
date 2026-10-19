import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { matchWithPolling } from './matchPolling.ts'
import type { MatchItemResponse } from './types.ts'

vi.mock('./api.ts', () => ({
  matchItem: vi.fn(),
  PricingApiError: class extends Error {},
}))
const { matchItem } = await import('./api.ts')
const matchItemMock = vi.mocked(matchItem)

const view = { chainId: 'NEWWORLD' } as MatchItemResponse['matches'][number]
const response = (overrides: Partial<MatchItemResponse>): MatchItemResponse => ({
  matchMethod: 'canonical',
  matches: [],
  alternatives: [],
  stale: false,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  matchItemMock.mockReset()
})
afterEach(() => vi.useRealTimers())

async function run() {
  const promise = matchWithPolling({ term: 'milk', itemId: 'i' }, () => 't', new AbortController().signal)
  await vi.runAllTimersAsync()
  return promise
}

describe('matchWithPolling', () => {
  it('retries an empty result at most 3 times, then gives up with it', async () => {
    matchItemMock.mockResolvedValue(response({}))
    const result = await run()
    expect(matchItemMock).toHaveBeenCalledTimes(4)
    expect(result?.matches).toEqual([])
  })

  it('retries stale prices at most 2 times and returns the last answer', async () => {
    matchItemMock.mockResolvedValue(response({ matches: [view], stale: true }))
    const result = await run()
    expect(matchItemMock).toHaveBeenCalledTimes(3)
    expect(result?.stale).toBe(true)
  })

  it('stops as soon as fresh prices arrive', async () => {
    matchItemMock
      .mockResolvedValueOnce(response({ matches: [view], stale: true }))
      .mockResolvedValueOnce(response({ matches: [view], stale: false }))
    await run()
    expect(matchItemMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry when only alternatives were found', async () => {
    matchItemMock.mockResolvedValue(response({ alternatives: [view] }))
    await run()
    expect(matchItemMock).toHaveBeenCalledTimes(1)
  })
})
