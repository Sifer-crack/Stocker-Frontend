import './PricingTable.css'
import { CHAINS, cheapestMatch } from './chains.ts'
import { formatPrice, storeLabel } from './format.ts'
import type { ChainMatch } from './types.ts'

interface ChainComparisonTableProps {
  matches: readonly ChainMatch[]
}

/** One fixed row per supported chain, so a chain with no match reads "Not found" instead of vanishing. */
export function ChainComparisonTable({ matches }: ChainComparisonTableProps) {
  const cheapest = cheapestMatch(matches)

  return (
    <table className="pricing-table">
      <thead>
        <tr>
          <th>Chain</th>
          <th>Matched product</th>
          <th>Price</th>
          <th>Promo</th>
          <th>Store</th>
          <th>Match</th>
          <th>Captured</th>
        </tr>
      </thead>
      <tbody>
        {CHAINS.map((chain) => {
          const match = matches.find((candidate) => candidate.chainId === chain.id)
          if (!match) {
            return (
              <tr key={chain.id}>
                <td>{chain.label}</td>
                <td colSpan={6} className="pricing-muted">
                  Not found at this chain
                </td>
              </tr>
            )
          }
          return (
            <tr key={chain.id} className={match === cheapest ? 'pricing-row-best' : ''}>
              <td>{chain.label}</td>
              <td>
                {match.productUrl ? (
                  <a href={match.productUrl} target="_blank" rel="noopener noreferrer">
                    {match.productName}
                  </a>
                ) : (
                  match.productName
                )}
                {match.brand && <div className="pricing-muted">{match.brand}</div>}
              </td>
              <td>
                <strong>{formatPrice(match.priceAmount, match.currency)}</strong>
                {match === cheapest && <div className="pricing-muted">Cheapest</div>}
              </td>
              <td>{match.promoFlag ? 'Yes' : '—'}</td>
              <td>{storeLabel(match.storeId)}</td>
              <td>{Math.round(match.score * 100)}%</td>
              <td>{match.capturedAt ? new Date(match.capturedAt).toLocaleString() : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
