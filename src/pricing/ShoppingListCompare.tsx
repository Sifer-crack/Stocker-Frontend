import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import { useShoppingList } from '../context/ShoppingListContext.tsx'
import { compareShoppingList, PricingApiError } from './api.ts'
import { CHAINS, chainLabel, normChain } from './chains.ts'
import { feeText, FULFILMENT_METHODS, methodLabel, savingsText } from './fulfilment.ts'
import { formatPrice } from './format.ts'
import type { CompareShoppingListResult, FulfilmentMethod } from './types.ts'

// Suggestions only: the backend's supported-region list is configuration and may differ, and it rejects
// an unsupported region with a clear message that is shown below.
const REGION_SUGGESTIONS = ['Auckland', 'Wellington', 'Christchurch']

/** What the results were computed for, kept so they stay readable if the shopping list changes afterwards. */
interface CompareOutcome {
  data: CompareShoppingListResult
  pickedChainId: string
  /** The methods that were sent; empty means all were allowed. */
  allowedMethods: FulfilmentMethod[]
  requestedCount: number
  itemNames: Record<string, string>
}

export function ShoppingListCompare() {
  const { accessToken } = useAuth()
  const { items, prices } = useShoppingList()
  const [region, setRegion] = useState('')
  const [preferredChainId, setPreferredChainId] = useState('')
  const [methods, setMethods] = useState<FulfilmentMethod[]>(FULFILMENT_METHODS.map((method) => method.id))
  const [outcome, setOutcome] = useState<CompareOutcome | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stillPricing = items.filter((item) => prices[item.id]?.status === 'pending').length

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (items.length === 0 || !region.trim() || methods.length === 0) return
    // Every method ticked means "no restriction", which the backend expresses by omitting the list.
    const allowedMethods = methods.length === FULFILMENT_METHODS.length ? [] : methods

    setLoading(true)
    setError(null)
    try {
      const data = await compareShoppingList(
        {
          items: items.map((item) => ({ itemId: item.id, quantity: item.quantity })),
          region: region.trim(),
          selectedChainId: preferredChainId || undefined,
          allowedMethods,
        },
        accessToken,
      )
      setOutcome({
        data,
        pickedChainId: preferredChainId,
        allowedMethods,
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

          <fieldset className="pricing-field pricing-methods">
            <legend>How would you get your shopping?</legend>
            {FULFILMENT_METHODS.map((method) => (
              <label key={method.id}>
                <input
                  type="checkbox"
                  checked={methods.includes(method.id)}
                  onChange={(e) =>
                    setMethods((current) =>
                      e.target.checked ? [...current, method.id] : current.filter((id) => id !== method.id),
                    )
                  }
                />
                {method.label}
              </label>
            ))}
            {methods.length === 0 && <span className="pricing-muted">Pick at least one option.</span>}
          </fieldset>

          <button type="submit" className="pricing-btn" disabled={loading || methods.length === 0}>
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </form>
      )}

      {error && <p className="pricing-error">{error}</p>}

      {outcome && <CompareResults outcome={outcome} />}
    </div>
  )
}

function CompareResults({ outcome }: { outcome: CompareOutcome }) {
  const { data } = outcome
  const picked = normChain(outcome.pickedChainId)

  if (data.storeTotals.length === 0) {
    return (
      <p className="pricing-empty">
        No supermarket offers the chosen method(s) for your region. Try ticking both options.
      </p>
    )
  }

  const cheapest = data.storeTotals.find((storeTotal) => normChain(storeTotal.chainId) === normChain(data.cheapestChainId))
  // The backend measures savings against 0 when the picked chain is not in the results (e.g. filtered out by
  // the method), which would show every chain as costing its whole total more. Show no savings then.
  const baselineMissing =
    picked !== '' && !data.storeTotals.some((storeTotal) => normChain(storeTotal.chainId) === picked)
  // Only chains with the best coverage can be compared on items: a chain with nothing priced has a total of 0.
  const bestCoverage = Math.max(...data.storeTotals.map((storeTotal) => storeTotal.itemsPriced))
  const comparable = data.storeTotals.filter((storeTotal) => storeTotal.itemsPriced === bestCoverage && bestCoverage > 0)
  const shelfCheapest =
    comparable.length > 1
      ? comparable.reduce((best, current) => (current.totalAmount < best.totalAmount ? current : best))
      : null
  const leftOut = outcome.allowedMethods.length > 0
    ? CHAINS.filter((chain) => !data.storeTotals.some((storeTotal) => normChain(storeTotal.chainId) === normChain(chain.id)))
    : []

  return (
    <>
      <div className="pricing-table-wrap">
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Supermarket</th>
              <th>Items</th>
              <th>Best option</th>
              <th>Fee</th>
              <th>Total</th>
              <th>Items priced</th>
              <th>Not available</th>
              <th>Savings</th>
            </tr>
          </thead>
          <tbody>
            {data.storeTotals.map((storeTotal) => {
              const isCheapest = normChain(storeTotal.chainId) === normChain(data.cheapestChainId)
              const unavailable = storeTotal.unavailableItemIds.map((id) => outcome.itemNames[id] ?? 'Unknown item')
              return (
                <tr key={storeTotal.chainId} className={isCheapest ? 'pricing-row-best' : ''}>
                  <td>
                    {chainLabel(storeTotal.chainId)}
                    {isCheapest && <span className="pricing-tag">Cheapest</span>}
                    {normChain(storeTotal.chainId) === picked && (
                      <span className="pricing-tag pricing-tag-muted">Your pick</span>
                    )}
                  </td>
                  <td>{formatPrice(storeTotal.totalAmount, storeTotal.currency)}</td>
                  <td>
                    {methodLabel(storeTotal.bestMethod)}
                    {storeTotal.fulfilmentOptions.length > 1 && (
                      <details className="pricing-options">
                        <summary>All options</summary>
                        <ul>
                          {storeTotal.fulfilmentOptions.map((option) => (
                            <li key={option.method}>
                              {methodLabel(option.method)}: {option.cost === 0 ? 'free' : formatPrice(option.cost, storeTotal.currency)}{' '}
                              ({formatPrice(option.totalAmount, storeTotal.currency)})
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td>{feeText(storeTotal)}</td>
                  <td>
                    <strong>{formatPrice(storeTotal.totalWithFulfilment, storeTotal.currency)}</strong>
                  </td>
                  <td>
                    {storeTotal.itemsPriced} of {outcome.requestedCount}
                  </td>
                  <td>{unavailable.length > 0 ? unavailable.join(', ') : '—'}</td>
                  <td>{baselineMissing ? '—' : savingsText(storeTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {cheapest && (
        <p className="pricing-empty">
          Cheapest including delivery/collection: <strong>{chainLabel(cheapest.chainId)}</strong>
          {cheapest.bestMethod && <> via {methodLabel(cheapest.bestMethod).toLowerCase()}</>} (
          {formatPrice(cheapest.totalWithFulfilment, cheapest.currency)}).
          {shelfCheapest !== null && normChain(shelfCheapest.chainId) !== normChain(cheapest.chainId) && (
            <>
              {' '}
              {chainLabel(shelfCheapest.chainId)} has the cheapest items, but fees make {chainLabel(cheapest.chainId)}{' '}
              the cheapest basket.
            </>
          )}
          {cheapest.itemsPriced < outcome.requestedCount && (
            <> It has prices for only {cheapest.itemsPriced} of your {outcome.requestedCount} items.</>
          )}
        </p>
      )}
      <p className="pricing-empty">
        {baselineMissing
          ? `Savings are not shown: ${chainLabel(outcome.pickedChainId)} doesn't offer the method(s) you chose.`
          : `Savings are measured against ${chainLabel(data.selectedChainId)} ${outcome.pickedChainId ? '(your pick)' : '(the cheapest supermarket)'}.`}
      </p>
      {leftOut.length > 0 && (
        <p className="pricing-empty">
          {leftOut.map((chain) => chain.label).join(', ')} {leftOut.length === 1 ? 'is' : 'are'} not shown: no
          option matches the method(s) you chose.
        </p>
      )}
      <p className="pricing-empty">
        Fees are estimates for planning. Not included: travel cost, express delivery, Sunday or public-holiday
        surcharges, store-specific fees and promotions.
      </p>
    </>
  )
}

export default ShoppingListCompare
