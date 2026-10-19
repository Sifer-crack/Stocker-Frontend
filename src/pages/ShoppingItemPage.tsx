import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useShoppingList } from '../context/ShoppingListContext'
import { useUser } from '../context/UserContext'
import { ProductResults } from '../pricing/ProductResults.tsx'
import './ShoppingList.css'
import './ShoppingItemPage.css'

function ShoppingItemPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { loading: userLoading } = useUser()
  const { items, prices, details, removeItem, refreshItem, chooseProduct, loaded } = useShoppingList()

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
            <h1>{userLoading || !loaded ? 'Loading…' : 'Item not found'}</h1>
            {!userLoading && loaded && <p>This item is not on your shopping list any more.</p>}
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
  const response = detail?.response ?? null
  const loading = detail === undefined || detail.loading

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
          <button type="button" onClick={() => refreshItem(item.id)} disabled={loading}>
            {loading ? 'Fetching…' : 'Refresh prices'}
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

        {loading && response === null && (
          <p className="item-status">
            Fetching prices from New World, PAK&apos;nSAVE and Woolworths… this can take a few seconds.
          </p>
        )}

        {detail?.error && <p className="pricing-error">{detail.error}</p>}

        {detail?.selectError && <p className="pricing-error">{detail.selectError}</p>}

        {response && (
          <ProductResults
            response={response}
            searching={loading}
            term={item.name}
            onSelect={(product) => void chooseProduct(item.id, product.productKey)}
            selectedKey={detail?.selectedKey}
            selectingKey={detail?.selectingKey}
          />
        )}

        {detail?.updatedAt && !loading && <p className="item-note">Checked {new Date(detail.updatedAt).toLocaleString()}</p>}
      </div>
    </main>
  )
}

export default ShoppingItemPage
