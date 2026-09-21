import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { newId } from '../lib/uuid.ts'
import { PricingApiError } from './api.ts'
import { ChainComparisonTable } from './ChainComparisonTable.tsx'
import { chainLabel, cheapestMatch } from './chains.ts'
import { formatPrice } from './format.ts'
import { matchWithPolling } from './matchPolling.ts'
import type { MatchItemResponse } from './types.ts'

/**
 * Users type a product name, not an id. The backend stores prices under an id, so derive a stable one from
 * the wording: the same search always maps to the same id and reuses the backend's cache instead of piling up
 * a new set of records every time.
 */
function searchItemId(term: string): string {
  const slug = term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `search:${slug || newId()}`
}

export function PriceSearch() {
  const { accessToken } = useAuth()
  const [term, setTerm] = useState('')
  const [searchedTerm, setSearchedTerm] = useState('')
  const [result, setResult] = useState<MatchItemResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await matchWithPolling(
        { term: trimmed, itemId: searchItemId(trimmed) },
        () => accessToken,
        controller.signal,
      )
      if (response === null) return // superseded by a newer search, or the page was left
      setSearchedTerm(trimmed)
      setResult(response)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.')
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }

  const matches = result?.matches ?? []
  const cheapest = cheapestMatch(matches)

  return (
    <div className="pricing-card">
      <h3>Look up a product</h3>
      <p className="pricing-card-lead">
        Type what you are after and see the matching product and its price at New World, PAK&apos;nSAVE and
        Woolworths.
      </p>
      <form className="pricing-form pricing-form-inline" onSubmit={handleSubmit}>
        <label className="pricing-field pricing-field-grow">
          <span>Product</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. full cream milk 2L"
            required
          />
        </label>
        <button type="submit" className="pricing-btn" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && <p className="pricing-empty">Checking each supermarket… this can take up to about 20 seconds.</p>}

      {error && <p className="pricing-error">{error}</p>}

      {result && matches.length === 0 && !loading && (
        <p className="pricing-empty">No matching products found for “{searchedTerm}”. Try different wording.</p>
      )}

      {matches.length > 0 && (
        <>
          {cheapest && (
            <p className="pricing-summary">
              Cheapest at <strong>{chainLabel(cheapest.chainId)}</strong>:{' '}
              <strong>{formatPrice(cheapest.priceAmount, cheapest.currency)}</strong>
            </p>
          )}
          {result?.matchMethod === 'lexical' && (
            <p className="pricing-empty">
              Matched by keyword because the semantic matcher was unavailable, so a match may be less accurate.
            </p>
          )}
          <div className="pricing-table-wrap">
            <ChainComparisonTable matches={matches} />
          </div>
        </>
      )}
    </div>
  )
}

export default PriceSearch
