import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShoppingList } from '../context/ShoppingListContext'
import { useUser } from '../context/UserContext'
import { AlternativesTable } from '../pricing/AlternativesTable.tsx'
import { ChainComparisonTable } from '../pricing/ChainComparisonTable.tsx'
import { chainLabel, cheapestMatch } from '../pricing/chains.ts'
import { formatPrice } from '../pricing/format.ts'
import './ShoppingList.css'
import './ShoppingItemPage.css'

function ShoppingItemPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { loading: userLoading } = useUser()
  const { items, prices, details, removeItem, refreshItem } = useShoppingList()

  const item = items.find((candidate) => candidate.id === itemId)
  const hasItem = item !== undefined
  const hasDetail = itemId !== undefined && details[itemId] !== undefined

  // Load the per-chain detail the first time an item's page is opened.
  useEffect(() => {
    if (hasItem && !hasDetail && itemId !== undefined) refreshItem(itemId)
  }, [hasItem, hasDetail, itemId, refreshItem])

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

  const serverPrices = prices[item.id]
  const detail = details[item.id]
  const status = detail?.status ?? 'loading'
  const matches = detail?.matches ?? []
  const alternatives = detail?.alternatives ?? []
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
          <p>Qty {item.quantity} · the same product at each supermarket.</p>
        </div>

        <div className="shopping-header-actions">
          <Link to="/shopping-list" className="item-compare-link">
            ← Back
          </Link>
          <button type="button" onClick={() => refreshItem(item.id)} disabled={status === 'loading'}>
            {status === 'loading' ? 'Fetching…' : 'Refresh prices'}
          </button>
          <button type="button" className="item-remove-btn" onClick={handleRemove}>
            Remove
          </button>
        </div>
      </header>

      <div className="item-page-body">
        {serverPrices?.status === 'unavailable' && (
          <p className="pricing-error">
            We can&apos;t price this item. It may be outside our service area, or the name may be too vague. Try
            re-adding it with a more specific name.
          </p>
        )}

        {status === 'loading' && matches.length === 0 && (
          <p className="item-status">
            Fetching prices from New World, PAK&apos;nSAVE and Woolworths… this can take a few seconds.
          </p>
        )}

        {status === 'loading' && matches.length > 0 && <p className="item-note">Updating prices…</p>}

        {status === 'error' && (
          <p className="pricing-error">{detail?.error ?? 'Could not fetch prices for this item.'}</p>
        )}

        {status === 'empty' && serverPrices?.status !== 'unavailable' && (
          <p className="item-status">
            No prices yet, we&apos;ll keep looking. Try Refresh in a little while, or re-add the item with a more
            specific name.
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

            {detail?.matchMethod === 'lexical' && (
              <p className="item-note">
                Matched by keyword because the product matcher was unavailable, so a match may be less accurate.
              </p>
            )}

            <div className="item-table-wrap">
              <ChainComparisonTable matches={matches} />
            </div>

            {detail?.stale && status !== 'loading' && (
              <p className="item-note">Some of these prices may be out of date.</p>
            )}

            {detail?.updatedAt && (
              <p className="item-note">Checked {new Date(detail.updatedAt).toLocaleString()}</p>
            )}
          </>
        )}

        <AlternativesTable alternatives={alternatives} />
      </div>
    </main>
  )
}

export default ShoppingItemPage
