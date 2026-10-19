import { afterEach, describe, expect, it, vi } from 'vitest'
import { addPantryItem, deletePantryItem, setPantryExpiry } from './pantryApi.ts'

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const urlOf = (fetchMock: ReturnType<typeof vi.fn>) => new URL(fetchMock.mock.calls[0][0] as string)

afterEach(() => vi.unstubAllGlobals())

describe('pantryApi', () => {
  it('sends the reminder threshold only together with a date', async () => {
    const withDate = stubFetch(Response.json({}))
    await addPantryItem({ userId: 'u', productId: 'p', quantity: 1, expirationDate: '2026-10-26', notifyDaysBefore: 3 }, 't')
    expect(urlOf(withDate).searchParams.get('notifyDaysBefore')).toBe('3')

    const withoutDate = stubFetch(Response.json({}))
    await addPantryItem({ userId: 'u', productId: 'p', quantity: 1, notifyDaysBefore: 3 }, 't')
    expect(urlOf(withoutDate).searchParams.has('notifyDaysBefore')).toBe(false)
    expect(urlOf(withoutDate).searchParams.has('expirationDate')).toBe(false)
  })

  it('clears an expiry by sending neither field', async () => {
    const fetchMock = stubFetch(Response.json({}))
    await setPantryExpiry('item-1', null, 3, 't')
    expect(urlOf(fetchMock).search).toBe('')
    expect(urlOf(fetchMock).pathname).toBe('/api/pantry-items/item-1/expiry')
  })

  it('treats an empty 200 as a successful delete', async () => {
    stubFetch(new Response('', { status: 200 }))
    await expect(deletePantryItem('item-1', 't')).resolves.toBeUndefined()
  })

  it('surfaces a {message} error body', async () => {
    stubFetch(Response.json({ message: 'Quantity must be at least 1' }, { status: 400 }))
    await expect(deletePantryItem('item-1', 't')).rejects.toThrow('Quantity must be at least 1')
  })
})
