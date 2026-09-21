import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShoppingList } from '../context/ShoppingListContext'
import { useUser } from '../context/UserContext'
import { ChainComparisonTable } from '../pricing/ChainComparisonTable.tsx'
import { chainLabel, cheapestMatch } from '../pricing/chains.ts'
import { formatPrice } from '../pricing/format.ts'
import './ShoppingList.css'
import './ShoppingItemPage.css'

function ShoppingItemPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { loading: userLoading } = useUser()
  const { items, prices, removeItem, refreshItem } = useShoppingList()

  const item = items.find((candidate) => candidate.id === itemId)

  if (!item) {
    return (
      <main className="shopping-page">
        <header className="shopping-header">
          <div>
            <h1>{userLoading ? 'Loading…' : 'Item not found'}</h1>
            {!userLoading && <p>This item is not on your shopping list any more.</p>}
          </div>
          <div className="shopping-header-actions">
            <Link to="/shopping-list" className="item-compare-link">
              ← Back to Shopping List
            </Link>
          </div>
        </header>
      </main>
    )
  }

  const itemPrices = prices[item.id]
  const status = itemPrices?.status ?? 'pending'
  const matches = itemPrices?.matches ?? []
  const cheapest = cheapestMatch(matches)
  const priciest = matches.reduce((max, match) => Math.max(max, match.priceAmount), 0)
  const saving = cheapest && matches.length > 1 ? priciest - cheapest.priceAmount : 0

  const handleRemove = () => {
    removeItem(item.id)
    navigate('/shopping-list')
  }

  return (
    <main className="shopping-page">
      <header className="shopping-header">
        <div>
          <h1>{item.name}</h1>
          <p>Qty {item.quantity} · the same product at each supermarket, matched by meaning.</p>
        </div>

        <div className="shopping-header-actions">
          <Link to="/shopping-list" className="item-compare-link">
            ← Back
          </Link>
          <button type="button" onClick={() => refreshItem(item.id)} disabled={status === 'pending'}>
            {status === 'pending' ? 'Fetching…' : 'Refresh prices'}
          </button>
          <button type="button" className="item-remove-btn" onClick={handleRemove}>
            Remove
          </button>
        </div>
      </header>

      <div className="item-page-body">
        {status === 'pending' && (
          <p className="item-status">
            Fetching prices from New World, PAK&apos;nSAVE and Woolworths… this can take a few seconds.
          </p>
        )}

        {status === 'error' && (
          <p className="pricing-error">{itemPrices?.error ?? 'Could not fetch prices for this item.'}</p>
        )}

        {status === 'empty' && (
          <p className="item-status">
            No matching products were found at any chain. Try Refresh, or re-add the item with a more specific
            name.
          </p>
        )}

        {matches.length > 0 && (
          <>
            {cheapest && (
              <p className="item-summary">
                Cheapest at <strong>{chainLabel(cheapest.chainId)}</strong>:{' '}
                <strong>{formatPrice(cheapest.priceAmount, cheapest.currency)}</strong>
                {saving > 0 && <> — {formatPrice(saving, cheapest.currency)} less than the priciest chain</>}
              </p>
            )}

            {itemPrices?.matchMethod === 'lexical' && (
              <p className="item-note">
                Matched by keyword because the semantic matcher was unavailable, so a match may be less accurate.
              </p>
            )}

            <div className="item-table-wrap">
              <ChainComparisonTable matches={matches} />
            </div>

            {itemPrices?.updatedAt && (
              <p className="item-note">Checked {new Date(itemPrices.updatedAt).toLocaleString()}</p>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default ShoppingItemPage
