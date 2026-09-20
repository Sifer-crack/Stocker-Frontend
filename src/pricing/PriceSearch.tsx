import { useState } from 'react'
import type { FormEvent } from 'react'
import { PricingApiError, searchPrices } from './api.ts'
import type { PriceRecord } from './types.ts'

export function PriceSearch() {
  const [term, setTerm] = useState('')
  const [itemId, setItemId] = useState('')
  const [category, setCategory] = useState('')
  const [records, setRecords] = useState<PriceRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!term.trim() || !itemId.trim()) return

    setLoading(true)
    setError(null)
    try {
      const result = await searchPrices({ term: term.trim(), itemId: itemId.trim(), category: category.trim() || undefined })
      setRecords(result.priceRecords)
    } catch (err) {
      setRecords(null)
      setError(err instanceof PricingApiError ? err.message : 'Could not reach the pricing service.')
    } finally {
      setLoading(false)
    }
  }

  const cheapestId = records && records.length > 0 ? records[0].id : null

  return (
    <div className="pricing-card">
      <h3>Search Item Prices</h3>
      <p className="pricing-card-lead">
        Look up live prices for an item across supermarket chains, cheapest first.
      </p>
      <form className="pricing-form" onSubmit={handleSubmit}>
        <label className="pricing-field">
          <span>Search term</span>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. full cream milk 2L" required />
        </label>
        <label className="pricing-field">
          <span>Item ID</span>
          <input value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="cross-chain item id" required />
        </label>
        <label className="pricing-field">
          <span>Category (optional)</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. dairy" />
        </label>
        <button type="submit" className="cta-btn primary-btn" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="pricing-error">{error}</p>}

      {records && records.length === 0 && !error && (
        <p className="pricing-empty">No prices found for that item.</p>
      )}

      {records && records.length > 0 && (
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Chain</th>
              <th>Store</th>
              <th>Channel</th>
              <th>Price</th>
              <th>Promo</th>
              <th>Captured</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className={record.id === cheapestId ? 'pricing-row-best' : ''}>
                <td>{record.chainId}</td>
                <td>{record.storeId}</td>
                <td>{record.channel}</td>
                <td>
                  {record.currency} {record.priceAmount.toFixed(2)}
                </td>
                <td>{record.promoFlag ? 'Yes' : '—'}</td>
                <td>{record.capturedAt ? new Date(record.capturedAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PriceSearch
