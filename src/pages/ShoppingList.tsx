import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShoppingList } from '../context/ShoppingListContext'
import type { ItemPrices, ShoppingItem } from '../context/ShoppingListContext'
import { useUser } from '../context/UserContext'
import { chainLabel } from '../pricing/chains.ts'
import { formatPrice } from '../pricing/format.ts'
import '../pricing/PricingTable.css'
import './ShoppingList.css'

/** After this long without a comparison, "Fetching prices…" would be misleading: the backend may be waiting for a later push. */
const STILL_LOOKING_AFTER_MS = 2 * 60 * 1000

function ItemPriceCell({ item, prices }: { item: ShoppingItem; prices: ItemPrices | undefined }) {
  const cheapest = prices?.cheapest
  if (cheapest) {
    return (
      <span className="item-price-cell">
        {formatPrice(cheapest.priceAmount * item.quantity, cheapest.currency)}
        <small>at {chainLabel(cheapest.chainId)}</small>
      </span>
    )
  }
  if (prices?.status === 'unavailable') {
    return <span className="item-price-status">Can&apos;t price this item</span>
  }
  if (!prices || prices.status === 'pending') {
    const waitedLong = Date.now() - Date.parse(item.createdAt) > STILL_LOOKING_AFTER_MS
    return (
      <span className="item-price-status">
        {waitedLong ? 'Still looking for prices…' : 'Fetching prices…'}
      </span>
    )
  }
  return <span className="item-price-status">No prices found</span>
}

function ShoppingList() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { items, prices, estimatedCost, addItem, removeItem, toggleCompleted, error, loaded } = useShoppingList()
  const weeklyBudget = user?.groceryBudget ?? 0
  const [itemName, setItemName] = useState('')

  const handleAddItem = () => {
    if (itemName.trim() === '') {
      return
    }
    addItem(itemName)
    setItemName('')
  }

  const completedCount = items.filter((item) => item.completed).length
  const unpricedCount = items.filter((item) => !prices[item.id]?.cheapest).length
  const remainingBudget = weeklyBudget - estimatedCost
  const progressPercentage =
    items.length === 0
      ? 0
      : (completedCount / items.length) * 100

  return (
    <main className="shopping-page">
      <header className="shopping-header">
        <div>
          <h1>Shopping List</h1>
          <p>What you need to buy, and what it should cost.</p>
        </div>

        <div className="shopping-header-actions">
          <input
            type="text"
            placeholder="Search products"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
          />

          <button type="button" onClick={handleAddItem} disabled={!user}>
            Add Item
          </button>
        </div>
      </header>

      {error && <p className="pricing-error shopping-error">{error}</p>}

      <div className="shopping-content">
        <section className="shopping-list-card">
          {!user || !loaded ? (
            <p className="empty-list">Loading your list…</p>
          ) : items.length === 0 ? (
            <p className="empty-list">No items added yet.</p>
          ) : (
            <ul className="shopping-items">
              {items.map((item) => (
                <li key={item.id} className="shopping-item">
                  <div className="shopping-item-info">
                    <button
                      type="button"
                      className={`item-checkbox ${item.completed ? 'completed' : ''}`}
                      onClick={() => toggleCompleted(item.id)}
                      aria-label={`Mark ${item.name} as ${
                        item.completed ? 'not completed' : 'completed'
                      }`}
                    />

                    <div>
                      <strong>
                        <Link to={`/shopping-list/${item.id}`} className="item-name-link">
                          {item.name}
                        </Link>
                      </strong>
                      <p>Qty {item.quantity}</p>
                    </div>
                  </div>

                  <div className="shopping-item-actions">
                    <ItemPriceCell item={item} prices={prices[item.id]} />

                    <Link to={`/shopping-list/${item.id}`} className="item-compare-link">
                      Compare
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="shopping-summary">
          <section className="shopping-progress-card">
            <h2>Shopping Progress</h2>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <strong>
              {completedCount} / {items.length} items
            </strong>

            <hr />

            <div className="summary-row">
              <span>Estimated cost</span>
              <strong>${estimatedCost.toFixed(2)}</strong>
            </div>

            {unpricedCount > 0 && (
              <p className="price-note">
                {unpricedCount} {unpricedCount === 1 ? 'item has' : 'items have'} no price yet and{' '}
                {unpricedCount === 1 ? 'is' : 'are'} left out of this total.
              </p>
            )}

            <div className="summary-row">
              <span>Weekly budget</span>
              <strong>${weeklyBudget.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Remaining</span>
              <strong>${remainingBudget.toFixed(2)}</strong>
            </div>
          </section>

          <button
            type="button"
            className="compare-stores-button"
            onClick={() => navigate('/store-recommendations')}
            disabled={items.length === 0}
          >
            Compare Stores
          </button>

          <p className="compare-help">
            Find the cheapest way to buy your shopping list.
          </p>


        </aside>
      </div>
    </main>
  )
}

export default ShoppingList
