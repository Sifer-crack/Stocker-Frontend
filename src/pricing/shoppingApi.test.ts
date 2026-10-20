import { describe, expect, it } from 'vitest'
import { parseShoppingItemUpdate } from './shoppingApi.ts'

const item = {
  id: 'a1',
  name: 'milk',
  sku: null,
  category: null,
  region: null,
  quantity: 1,
  comparisonStatus: 'available',
  cheapest: null,
  prices: [],
  comparedAt: null,
  createdAt: '2026-10-19T00:00:00Z',
}

describe('parseShoppingItemUpdate', () => {
  it('accepts a valid push', () => {
    const update = parseShoppingItemUpdate(JSON.stringify({ source: 'backfill', item }))
    expect(update?.source).toBe('backfill')
    expect(update?.item.id).toBe('a1')
  })

  it('treats an unknown source as sync', () => {
    expect(parseShoppingItemUpdate(JSON.stringify({ source: 'x', item }))?.source).toBe('sync')
  })

  it('rejects malformed JSON', () => {
    expect(parseShoppingItemUpdate('{nope')).toBeNull()
  })

  it('rejects an item with an unknown comparison status', () => {
    expect(parseShoppingItemUpdate(JSON.stringify({ source: 'sync', item: { ...item, comparisonStatus: 'weird' } }))).toBeNull()
  })

  it('rejects a push without an item', () => {
    expect(parseShoppingItemUpdate(JSON.stringify({ source: 'sync' }))).toBeNull()
  })
})
