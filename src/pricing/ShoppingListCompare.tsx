import { useState } from 'react'
import type { FormEvent } from 'react'
import { compareShoppingList, PricingApiError } from './api.ts'
import type { CompareShoppingListResult } from './types.ts'

interface ItemRow {
  key: string
  itemId: string
  quantity: number
}

function newRow(): ItemRow {
  return { key: crypto.randomUUID(), itemId: '', quantity: 1 }
}

export function ShoppingListCompare() {
  const [rows, setRows] = useState<ItemRow[]>([newRow()])
  const [region, setRegion] = useState('')
  const [selectedChainId, setSelectedChainId] = useState('')
  const [result, setResult] = useState<CompareShoppingListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const items = rows
      .filter((row) => row.itemId.trim().length > 0)
      .map((row) => ({ itemId: row.itemId.trim(), quantity: row.quantity }))
    if (items.length === 0 || !region.trim()) return

    setLoading(true)
    setError(null)
    try {
      const compareResult = await compareShoppingList({
        items,
        region: region.trim(),
        selectedChainId: selectedChainId.trim() || undefined,
      })
      setResult(compareResult)
    } catch (err) {
      setResult(null)
      setError(err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pricing-card">
      <h3>Compare Shopping List Across Chains</h3>
      <p className="pricing-card-lead">
        Add the items on your list and see which supermarket chain comes out cheapest overall.
      </p>
      <form className="pricing-form" onSubmit={handleSubmit}>
        <div className="pricing-item-rows">
          {rows.map((row) => (
            <div className="pricing-item-row" key={row.key}>
              <input
                value={row.itemId}
                onChange={(e) => updateRow(row.key, { itemId: e.target.value })}
                placeholder="item id"
                aria-label="Item ID"
              />
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                aria-label="Quantity"
              />
              <button
                type="button"
                className="pricing-remove-row"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="cta-btn secondary-btn sm" onClick={() => setRows((prev) => [...prev, newRow()])}>
          + Add item
        </button>

        <label className="pricing-field">
          <span>Region</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Auckland" required />
        </label>
        <label className="pricing-field">
          <span>Preferred chain (optional)</span>
          <input
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(e.target.value)}
            placeholder="defaults to cheapest chain"
          />
        </label>

        <button type="submit" className="cta-btn primary-btn" disabled={loading}>
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </form>

      {error && <p className="pricing-error">{error}</p>}

      {result && (
        <>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Chain</th>
                <th>Total</th>
                <th>Items priced</th>
                <th>Unavailable</th>
                <th>Savings</th>
              </tr>
            </thead>
            <tbody>
              {result.storeTotals.map((storeTotal) => (
                <tr
                  key={storeTotal.chainId}
                  className={storeTotal.chainId === result.cheapestChainId ? 'pricing-row-best' : ''}
                >
                  <td>
                    {storeTotal.chainId}
                    {storeTotal.chainId === result.cheapestChainId && ' 🏆'}
                    {storeTotal.chainId === result.selectedChainId && ' (selected)'}
                  </td>
                  <td>
                    {storeTotal.currency} {storeTotal.totalAmount.toFixed(2)}
                  </td>
                  <td>{storeTotal.itemsPriced}</td>
                  <td>{storeTotal.unavailableItemIds.length > 0 ? storeTotal.unavailableItemIds.join(', ') : '—'}</td>
                  <td>
                    {storeTotal.savingsAmount > 0
                      ? `${storeTotal.currency} ${storeTotal.savingsAmount.toFixed(2)} saved`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pricing-card-lead">
            Cheapest overall: <strong>{result.cheapestChainId || 'n/a'}</strong>
          </p>
        </>
      )}
    </div>
  )
}

export default ShoppingListCompare
