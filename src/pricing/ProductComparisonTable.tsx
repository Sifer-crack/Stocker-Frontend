import './PricingTable.css'
import { CHAINS } from './chains.ts'
import { formatPerUnit, formatPrice } from './format.ts'
import { cheapestChainFor, priceAt } from './products.ts'
import type { ProductView } from './types.ts'

interface ProductComparisonTableProps {
  products: readonly ProductView[]
  /** When given, each row gets a button to pick that product (e.g. for the shopping list item). */
  onSelect?: (product: ProductView) => void
  selectedKey?: string | null
  /** The productKey being saved right now, so its button can show progress. */
  selectingKey?: string | null
}

/** Rows are products, columns are chains, and each cell is the price at that chain ("—" where it isn't carried). */
export function ProductComparisonTable({ products, onSelect, selectedKey, selectingKey }: ProductComparisonTableProps) {
  return (
    <table className="pricing-table product-table">
      <thead>
        <tr>
          <th>Product</th>
          {CHAINS.map((chain) => (
            <th key={chain.id}>{chain.label}</th>
          ))}
          {onSelect && <th>Use for this item</th>}
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const cheapest = cheapestChainFor(product)
          return (
            <tr key={product.productKey} className={selectedKey === product.productKey ? 'pricing-row-best' : ''}>
              <td>
                {product.name}
                {product.brand && <div className="pricing-muted">{product.brand}</div>}
                {product.packSize && <div className="pricing-muted">{product.packSize}</div>}
              </td>
              {CHAINS.map((chain) => {
                const entry = priceAt(product, chain.id)
                if (!entry) {
                  return (
                    <td key={chain.id} className="pricing-muted" aria-label={`Not carried at ${chain.label}`}>
                      —
                    </td>
                  )
                }
                const isCheapest = cheapest === chain.id.toLowerCase() && Object.keys(product.prices).length > 1
                return (
                  <td key={chain.id} className={isCheapest ? 'product-cell-best' : undefined}>
                    <strong>{formatPrice(entry.price, 'NZD')}</strong>
                    {entry.promo && <span className="pricing-tag">Promo</span>}
                    {entry.unitPrice != null && <div className="pricing-muted">{formatPerUnit(entry.unitPrice, product.unit)}</div>}
                    {isCheapest && <div className="pricing-muted">Cheapest</div>}
                  </td>
                )
              })}
              {onSelect && (
                <td>
                  {selectedKey === product.productKey ? (
                    <span className="pricing-muted">Selected</span>
                  ) : (
                    <button type="button" className="pricing-btn pricing-btn-small" onClick={() => onSelect(product)} disabled={selectingKey != null}>
                      {selectingKey === product.productKey ? 'Saving…' : 'Use this one'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
