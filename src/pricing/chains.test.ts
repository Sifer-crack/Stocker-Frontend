import { describe, expect, it } from 'vitest'
import { chainLabel, cheapestMatch, normChain } from './chains.ts'
import type { MatchView } from './types.ts'

describe('chain ids', () => {
  it('normalises case and whitespace', () => {
    expect(normChain(' PAKNSAVE ')).toBe('paknsave')
  })

  it('labels a chain whatever the case of its id', () => {
    expect(chainLabel('newworld')).toBe('New World')
    expect(chainLabel('NEWWORLD')).toBe('New World')
  })

  it('falls back to the raw id for an unknown chain', () => {
    expect(chainLabel('countdown')).toBe('countdown')
  })
})

describe('cheapestMatch', () => {
  const view = (priceAmount: number) => ({ priceAmount }) as MatchView

  it('returns the lowest price', () => {
    expect(cheapestMatch([view(3), view(2), view(5)])?.priceAmount).toBe(2)
  })

  it('returns null for no matches', () => {
    expect(cheapestMatch([])).toBeNull()
  })
})
