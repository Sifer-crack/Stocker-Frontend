import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import { newId } from '../lib/uuid.ts'
import { PricingApiError } from './api.ts'
import { productsWithPolling } from './productPolling.ts'
import { ProductResults } from './ProductResults.tsx'
import type { ProductSearchResponse } from './types.ts'

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
  const [result, setResult] = useState<ProductSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const tokenRef = useRef(accessToken)

  useEffect(() => {
    tokenRef.current = accessToken
  })
  useEffect(() => () => controllerRef.current?.abort(), [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setCancelled(false)
    setError(null)
    setResult(null)
    setSearchedTerm(trimmed)
    try {
      await productsWithPolling(
        { term: trimmed, itemId: searchItemId(trimmed) },
        () => tokenRef.current,
        controller.signal,
        (response) => setResult(response), // show each answer straight away, stale or partial
      )
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.')
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }

  function abortSearch() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setLoading(false)
    setResult(null)
    setError(null)
  }

  function handleCancel() {
    abortSearch()
    setCancelled(true)
  }

  return (
    <div className="pricing-card">
      <h3>Look up a product</h3>
      <p className="pricing-card-lead">
        Type what you are after and see each matching product with its price at New World, PAK&apos;nSAVE and
        Woolworths.
      </p>
      <form className="pricing-form pricing-form-inline" onSubmit={handleSubmit}>
        <label className="pricing-field pricing-field-grow">
          <span>Product</span>
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value)
              // Typing again drops the search still running for the old wording.
              if (loading) abortSearch()
            }}
            placeholder="e.g. full cream milk 2L"
            required
          />
        </label>
        <button type="submit" className="pricing-btn" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        {loading && (
          <button type="button" className="pricing-btn pricing-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </form>

      {loading && result === null && <p className="pricing-empty">Looking for “{searchedTerm}”…</p>}

      {error && <p className="pricing-error">{error}</p>}

      {cancelled && !loading && <p className="pricing-empty">Search cancelled.</p>}

      {result && <ProductResults key={searchedTerm} response={result} searching={loading} term={searchedTerm} />}
    </div>
  )
}

export default PriceSearch
