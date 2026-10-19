/**
 * A fetch-based Server-Sent Events reader. The browser's EventSource cannot send an Authorization header,
 * and the gateway's streams need the JWT, so this reads the response body itself.
 */

const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 30_000
/** The server sends a comment heartbeat every 25 s; silence for this long means the connection is dead. */
const SILENCE_LIMIT_MS = 60_000
const TOKEN_POLL_MS = 1000

export interface SseOptions {
  url: string
  /** Read on every (re)connect so a reconnect always uses the latest access token. */
  getToken: () => string | null
  /** Called each time a connection is established (response headers received), before any event. */
  onOpen: () => void
  onEvent: (event: string, data: string) => void
  signal: AbortSignal
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Splits one raw event block into its name and data; comment-only blocks (heartbeats) yield null. */
function parseBlock(block: string): { event: string; data: string } | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line === '' || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null
}

/** Runs until `signal` aborts: connects, reads events, and reconnects with capped exponential backoff. */
export async function runSse({ url, getToken, onOpen, onEvent, signal }: SseOptions): Promise<void> {
  let failures = 0

  while (!signal.aborted) {
    const token = getToken()
    if (token === null) {
      await wait(TOKEN_POLL_MS, signal)
      continue
    }

    const connection = new AbortController()
    const abortConnection = () => connection.abort()
    signal.addEventListener('abort', abortConnection, { once: true })
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const resetWatchdog = () => {
      clearTimeout(watchdog)
      watchdog = setTimeout(abortConnection, SILENCE_LIMIT_MS)
    }

    try {
      resetWatchdog()
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        credentials: 'include',
        signal: connection.signal,
      })

      if (response.status === 401) {
        // The token is no longer accepted: retrying with it would loop, so wait until a new one arrives.
        while (!signal.aborted && getToken() === token) await wait(TOKEN_POLL_MS, signal)
        continue
      }
      if (!response.ok || response.body === null) {
        throw new Error(`Stream failed with status ${response.status}`)
      }

      failures = 0
      resetWatchdog()
      onOpen()

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        resetWatchdog()
        // Servers may end lines with CRLF; normalise on the whole buffer so a CR/LF split across chunks still joins.
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const parsed = parseBlock(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          if (parsed) onEvent(parsed.event, parsed.data)
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch {
      // Network error, silence timeout or a stream error: fall through to the backoff below.
    } finally {
      clearTimeout(watchdog)
      signal.removeEventListener('abort', abortConnection)
    }

    if (signal.aborted) return
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** failures) * (0.5 + Math.random() / 2)
    failures++
    await wait(delay, signal)
  }
}
