import './PricingTable.css'
import { chainLabel } from './chains.ts'
import { formatPrice, formatUnitPrice, storeLabel } from './format.ts'
import type { MatchView } from './types.ts'

interface AlternativesTableProps {
  alternatives: readonly MatchView[]
}

/** Similar products that are not the exact thing asked for, kept apart from the per-chain exact matches. */
export function AlternativesTable({ alternatives }: AlternativesTableProps) {
  if (alternatives.length === 0) return null

  return (
    <section className="pricing-alternatives">
      <h4>Similar alternatives</h4>
      <p className="pricing-muted">Not the exact product, but close. Compare the unit price if the sizes differ.</p>
      <div className="pricing-table-wrap">
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Chain</th>
              <th>Product</th>
              <th>Price</th>
              <th>Store</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((alternative) => (
              <tr key={`${alternative.chainId}-${alternative.storeId}-${alternative.productName}`}>
                <td>{chainLabel(alternative.chainId)}</td>
                <td>
                  {alternative.productName}
                  {alternative.brand && <div className="pricing-muted">{alternative.brand}</div>}
                  {alternative.packSize && <div className="pricing-muted">{alternative.packSize}</div>}
                </td>
                <td>
                  <strong>{formatPrice(alternative.priceAmount, alternative.currency)}</strong>
                  {alternative.unitPrice != null && (
                    <div className="pricing-muted">
                      {formatUnitPrice(alternative.unitPrice, alternative.currency, alternative.packSize)}
                    </div>
                  )}
                </td>
                <td>{storeLabel(alternative.storeId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
