import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import { useShoppingList } from '../context/ShoppingListContext.tsx'
import { compareShoppingList, PricingApiError } from './api.ts'
import { CHAINS, chainLabel } from './chains.ts'
import { formatPrice } from './format.ts'
import type { CompareShoppingListResult } from './types.ts'

// Suggestions only: the backend's supported-region list is configuration and may differ, and it rejects
// an unsupported region with a clear message that is shown below.
const REGION_SUGGESTIONS = ['Auckland', 'Wellington', 'Christchurch']

/** What the results were computed for, kept so they stay readable if the shopping list changes afterwards. */
interface CompareOutcome {
  data: CompareShoppingListResult
  pickedChainId: string
  requestedCount: number
  itemNames: Record<string, string>
}

export function ShoppingListCompare() {
  const { accessToken } = useAuth()
  const { items, prices } = useShoppingList()
  const [region, setRegion] = useState('')
  const [preferredChainId, setPreferredChainId] = useState('')
  const [outcome, setOutcome] = useState<CompareOutcome | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stillPricing = items.filter((item) => prices[item.id]?.status === 'pending').length

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (items.length === 0 || !region.trim()) return

    setLoading(true)
    setError(null)
    try {
      const data = await compareShoppingList(
        {
          items: items.map((item) => ({ itemId: item.id, quantity: item.quantity })),
          region: region.trim(),
          selectedChainId: preferredChainId || undefined,
        },
        accessToken,
      )
      setOutcome({
        data,
        pickedChainId: preferredChainId,
        requestedCount: items.length,
        itemNames: Object.fromEntries(items.map((item) => [item.id, item.name])),
      })
    } catch (err) {
      setOutcome(null)
      setError(err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pricing-card">
      <h3>Compare my shopping list</h3>
      <p className="pricing-card-lead">
        See which supermarket is cheapest for everything on your shopping list, and how much you would save.
      </p>

      {items.length === 0 ? (
        <p className="pricing-empty">
          Your shopping list is empty. <Link to="/shopping-list">Add some items</Link> first, then compare them here.
        </p>
      ) : (
        <form className="pricing-form" onSubmit={handleSubmit}>
          <ul className="pricing-item-summary" aria-label="Items being compared">
            {items.map((item) => (
              <li key={item.id}>
                {item.name} × {item.quantity}
              </li>
            ))}
          </ul>

          {stillPricing > 0 && (
            <p className="pricing-empty">
              {stillPricing} {stillPricing === 1 ? 'item is' : 'items are'} still being priced, so the totals may be
              incomplete. Try again in a moment.
            </p>
          )}

          <label className="pricing-field">
            <span>Your region</span>
            <input
              list="pricing-region-suggestions"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Auckland"
              required
            />
            <datalist id="pricing-region-suggestions">
              {REGION_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </label>

          <label className="pricing-field">
            <span>Compare savings against</span>
            <select value={preferredChainId} onChange={(e) => setPreferredChainId(e.target.value)}>
              <option value="">The cheapest supermarket (recommended)</option>
              {CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="pricing-btn" disabled={loading}>
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </form>
      )}

      {error && <p className="pricing-error">{error}</p>}

      {outcome && (
        <>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Supermarket</th>
                  <th>Total</th>
                  <th>Items priced</th>
                  <th>Not available</th>
                  <th>Savings</th>
                </tr>
              </thead>
              <tbody>
                {outcome.data.storeTotals.map((storeTotal) => {
                  const isCheapest = storeTotal.chainId === outcome.data.cheapestChainId
                  const unavailable = storeTotal.unavailableItemIds.map(
                    (id) => outcome.itemNames[id] ?? 'Unknown item',
                  )
                  return (
                    <tr key={storeTotal.chainId} className={isCheapest ? 'pricing-row-best' : ''}>
                      <td>
                        {chainLabel(storeTotal.chainId)}
                        {isCheapest && <span className="pricing-tag">Cheapest</span>}
                        {storeTotal.chainId === outcome.pickedChainId && (
                          <span className="pricing-tag pricing-tag-muted">Your pick</span>
                        )}
                      </td>
                      <td>
                        <strong>{formatPrice(storeTotal.totalAmount, storeTotal.currency)}</strong>
                      </td>
                      <td>
                        {storeTotal.itemsPriced} of {outcome.requestedCount}
                      </td>
                      <td>{unavailable.length > 0 ? unavailable.join(', ') : '—'}</td>
                      <td>
                        {storeTotal.savingsAmount > 0
                          ? `${formatPrice(storeTotal.savingsAmount, storeTotal.currency)} saved`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="pricing-empty">
            Cheapest overall:{' '}
            <strong>{outcome.data.cheapestChainId ? chainLabel(outcome.data.cheapestChainId) : 'n/a'}</strong>.
            Savings are measured against {chainLabel(outcome.data.selectedChainId)}{' '}
            {outcome.pickedChainId ? '(your pick)' : '(the cheapest supermarket)'}.
          </p>
        </>
      )}
    </div>
  )
}

export default ShoppingListCompare
