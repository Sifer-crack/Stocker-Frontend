import { describe, expect, it } from 'vitest'
import { chainLabel, normChain } from './chains.ts'

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
