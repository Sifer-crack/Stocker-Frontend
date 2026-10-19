import { useState } from 'react'
import './PricingTable.css'
import { chainLabel } from './chains.ts'
import { formatPrice } from './format.ts'
import { PriceDisclaimer } from './PriceDisclaimer.tsx'
import { ProductComparisonTable } from './ProductComparisonTable.tsx'
import { cheapestOverall } from './products.ts'
import type { ProductSearchResponse, ProductView, RefreshState } from './types.ts'
import { CHAINS } from './chains.ts'

const REFRESH_TEXT: Record<RefreshState, string> = {
  pending: 'checking…',
  done: 'done',
  failed: "couldn't load",
  skipped: 'not checked',
}

interface ProductResultsProps {
  response: ProductSearchResponse
  /** True while the search is still being asked for (polling), so progress is shown. */
  searching: boolean
  term: string
  onSelect?: (product: ProductView) => void
  selectedKey?: string | null
  selectingKey?: string | null
}

function RefreshChips({ refresh }: { refresh: ProductSearchResponse['refresh'] }) {
  const entries = CHAINS.filter((chain) => refresh[chain.id.toLowerCase()] !== undefined)
  if (entries.length === 0) return null
  return (
    <ul className="refresh-chips" aria-label="Progress per supermarket">
      {entries.map((chain) => {
        const state = refresh[chain.id.toLowerCase()]
        return (
          <li key={chain.id} className={`refresh-chip refresh-chip-${state}`}>
            {chain.label}: {REFRESH_TEXT[state]}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Renders a /api/pricing/products answer by its status, never by "the lists are empty": found, alternatives only,
 * still refreshing, or finally not found. Alternatives sit in their own, visibly separate section and are opt-in
 * next to a real match; with no match they are the only content and are shown straight away.
 */
export function ProductResults({ response, searching, term, onSelect, selectedKey, selectingKey }: ProductResultsProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const { status, products, alternatives } = response
  const cheapest = cheapestOverall(products)
  const alternativesOnly = status === 'alternatives-only'
  const alternativesVisible = alternatives.length > 0 && (alternativesOnly || showAlternatives)
  const stillPending = status === 'refreshing' || Object.values(response.refresh).includes('pending')
  // Only "waiting" while we are actually still asking; once polling has stopped, say so rather than show a stuck spinner.
  const waiting = searching && stillPending
  const gaveUp = !searching && stillPending

  return (
    <>
      {waiting && <p className="pricing-empty">Checking the supermarkets… prices appear as each one answers.</p>}
      {gaveUp && (
        <p className="pricing-empty">Some supermarkets are taking longer than usual. Search again in a moment to see them.</p>
      )}
      <RefreshChips refresh={response.refresh} />

      {status === 'not-found' && (
        <p className="pricing-empty">Nothing found at any supermarket for “{term}”. Try different wording.</p>
      )}

      {products.length > 0 && (
        <>
          {cheapest && (
            <p className="pricing-summary">
              Cheapest at <strong>{chainLabel(cheapest.chainId)}</strong>:{' '}
              <strong>{formatPrice(cheapest.price, 'NZD')}</strong>
              {products.length > 1 && <> for {cheapest.product.name}</>}
            </p>
          )}
          {response.stale && !waiting && <p className="pricing-empty">Some of these prices may be out of date.</p>}
          <div className="pricing-table-wrap">
            <ProductComparisonTable products={products} onSelect={onSelect} selectedKey={selectedKey} selectingKey={selectingKey} />
          </div>
          <PriceDisclaimer />
        </>
      )}

      {alternatives.length > 0 && !alternativesOnly && (
        <label className="alternatives-toggle">
          <input type="checkbox" checked={showAlternatives} onChange={(event) => setShowAlternatives(event.target.checked)} />
          Include similar alternatives ({alternatives.length})
        </label>
      )}

      {alternativesVisible && (
        <section className="pricing-alternatives" aria-label="Similar alternatives">
          <h4>{alternativesOnly ? 'No exact match. Similar products:' : 'Similar alternatives'}</h4>
          <p className="pricing-muted">
            {response.matchMethod === 'generic-fallback'
              ? 'These are the same type of product, not the exact one you typed.'
              : 'Not the exact product, but close. Compare the unit price if the sizes differ.'}
          </p>
          <div className="pricing-table-wrap">
            <ProductComparisonTable products={alternatives} onSelect={onSelect} selectedKey={selectedKey} selectingKey={selectingKey} />
          </div>
          <PriceDisclaimer />
        </section>
      )}
    </>
  )
}
