import { describe, expect, it } from 'vitest'
import { parseBlock } from './sseStream.ts'

describe('parseBlock', () => {
  it('reads the event name and data', () => {
    expect(parseBlock('event: shopping-item-updated\ndata: {"a":1}')).toEqual({
      event: 'shopping-item-updated',
      data: '{"a":1}',
    })
  })

  it('joins multiple data lines with a newline', () => {
    expect(parseBlock('data: {"a":1,\ndata: "b":2}')?.data).toBe('{"a":1,\n"b":2}')
  })

  it('defaults the event name to "message"', () => {
    expect(parseBlock('data: hi')?.event).toBe('message')
  })

  it('ignores comment-only blocks such as heartbeats', () => {
    expect(parseBlock(': keep-alive')).toBeNull()
  })

  it('strips only one leading space from a value', () => {
    expect(parseBlock('data:  two')?.data).toBe(' two')
  })
})
