import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useShoppingList } from '../context/ShoppingListContext'
import type { ItemPrices, ShoppingItem } from '../context/ShoppingListContext'
import { useUser } from '../context/UserContext'
import { addPantryItem, searchProducts } from '../lib/pantryApi'
import {
  fetchSpendingReport,
  formatReportDateKey,
  mergePurchaseIntoReport,
  saveSpendingReport,
} from '../lib/spendingReport'
import { chainLabel } from '../pricing/chains.ts'
import { formatPrice } from '../pricing/format.ts'
import { fetchSuggestions } from '../pricing/productsApi.ts'
import type { ProductSuggestion } from '../pricing/types.ts'
import '../pricing/PricingTable.css'
import './ShoppingList.css'

/** After this long without a comparison, "Fetching prices…" would be misleading: the backend may be waiting for a later push. */
const STILL_LOOKING_AFTER_MS = 2 * 60 * 1000

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

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
  const { accessToken } = useAuth()
  const { items, prices, estimatedCost, addItem, removeItem, toggleCompleted, renameItem, error, loaded } = useShoppingList()
  const weeklyBudget = user?.groceryBudget ?? 0
  const [itemName, setItemName] = useState('')
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [completionMessage, setCompletionMessage] = useState('')
  const [completing, setCompleting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const productSearchRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef(accessToken)
  useLayoutEffect(() => {
    tokenRef.current = accessToken
  })

  useEffect(() => {
    if (!menuOpen) return
    const controller = new AbortController()
    // A short pause so each keystroke doesn't hit the gateway; the previous request is aborted.
    const timer = window.setTimeout(() => {
      fetchSuggestions(itemName.trim(), tokenRef.current, controller.signal)
        .then((found) => {
          if (!controller.signal.aborted) setSuggestions(found)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([])
        })
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [itemName, menuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddItem = () => {
    const text = itemName.trim()
    if (text === '') {
      return
    }
    addItem(text)
    setItemName('')
    setSuggestions([])
    setMenuOpen(false)
  }

  /** The catalog product behind a list item, so buying it can update the pantry. Most items have none and go in by name. */
  const findProductId = async (name: string): Promise<string | null> => {
    const matches = await searchProducts(name, tokenRef.current)
    const exact = matches.find((p) => sameName(p.productName, name))
    return exact?.productId ?? null
  }

  const completeShopping = async () => {
    const purchased = items.filter((item) => item.completed)
    if (purchased.length === 0) {
      setCompletionMessage('Select the items you have purchased first.')
      return
    }
    if (!user) {
      setCompletionMessage('Unable to update pantry because no user is signed in.')
      return
    }

    setCompleting(true)
    setCompletionMessage('')
    try {
      for (const item of purchased) {
        const productId = await findProductId(item.name)
        // Items typed freely have no catalog product; they go into the pantry by name.
        await addPantryItem(
          { userId: user.id, ...(productId ? { productId } : { name: item.name }), quantity: item.quantity },
          tokenRef.current,
        )
      }

      // The report records what the list actually priced; items without a price are left out rather than guessed.
      const reportItems = purchased.flatMap((item) => {
        const cheapest = prices[item.id]?.cheapest
        return cheapest
          ? [{ name: item.name, quantity: item.quantity, price: cheapest.priceAmount * item.quantity }]
          : []
      })
      let reportSaved = true
      if (reportItems.length > 0) {
        try {
          const total = reportItems.reduce((sum, entry) => sum + entry.price, 0)
          const latest = await fetchSpendingReport(tokenRef.current)
          const updated = mergePurchaseIntoReport(latest, formatReportDateKey(new Date()), reportItems, total)
          await saveSpendingReport(tokenRef.current, updated)
        } catch (reportError) {
          console.error('Unable to save spending report:', reportError)
          reportSaved = false
        }
      }

      purchased.forEach((item) => removeItem(item.id))

      const unpriced = purchased.length - reportItems.length
      setCompletionMessage(
        [
          `${purchased.length} purchased ${purchased.length === 1 ? 'item' : 'items'} completed.`,
          'Pantry updated.',
          unpriced > 0 ? `${unpriced} without a price ${unpriced === 1 ? 'was' : 'were'} left out of the spending report.` : '',
          reportSaved ? '' : 'Spending report could not be saved.',
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch (completeError) {
      console.error('Unable to complete shopping:', completeError)
      setCompletionMessage('Unable to complete shopping. Your shopping list has not been changed.')
    } finally {
      setCompleting(false)
    }
  }

  const completedCount = items.filter((item) => item.completed).length
  const unpricedCount = items.filter((item) => !prices[item.id]?.cheapest).length
  const remainingBudget = weeklyBudget - estimatedCost
  const progressPercentage =
    items.length === 0
      ? 0
      : (completedCount / items.length) * 100

  const categoryOf = (item: ShoppingItem) => item.category?.trim() || 'Uncategorised'
  const availableCategories = Array.from(new Set(items.map(categoryOf))).sort((a, b) => a.localeCompare(b))
  const filteredItems =
    selectedCategories.length === 0
      ? items
      : items.filter((item) => selectedCategories.includes(categoryOf(item)))
  const groupedItems = filteredItems.reduce<Record<string, ShoppingItem[]>>((groups, item) => {
    const category = categoryOf(item)
    groups[category] = [...(groups[category] ?? []), item]
    return groups
  }, {})
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => a.localeCompare(b))
  Object.values(groupedItems).forEach((categoryItems) => {
    categoryItems.sort((a, b) => a.name.localeCompare(b.name))
  })
  const sortedItems = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name))

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
      previous.includes(category)
        ? previous.filter((selected) => selected !== category)
        : [...previous, category],
    )
  }

  const renderItem = (item: ShoppingItem) => (
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
          {editingId === item.id ? (
            <input
              className="item-rename-input"
              value={editName}
              autoFocus
              aria-label={`New name for ${item.name}`}
              onChange={(event) => setEditName(event.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  renameItem(item.id, editName)
                  setEditingId(null)
                } else if (event.key === 'Escape') {
                  setEditingId(null)
                }
              }}
            />
          ) : (
            <strong>
              <Link to={`/shopping-list/${item.id}`} className="item-name-link">
                {item.name}
              </Link>
            </strong>
          )}
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
          // Keeps the input focused, so its blur doesn't cancel the edit before this click saves it.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (editingId === item.id) {
              renameItem(item.id, editName)
              setEditingId(null)
            } else {
              setEditName(item.name)
              setEditingId(item.id)
            }
          }}
        >
          {editingId === item.id ? 'Save' : 'Rename'}
        </button>

        <button type="button" onClick={() => removeItem(item.id)}>
          Remove
        </button>
      </div>
    </li>
  )

  return (
    <main className="shopping-page">
      <header className="shopping-header">
        <div>
          <h1>Shopping List</h1>
          <p>What you need to buy, and what it should cost.</p>
        </div>

        <div className="shopping-header-actions">
          <div className="shopping-product-search" ref={productSearchRef}>
            <input
              type="text"
              placeholder="Search products, or type any item..."
              value={itemName}
              onChange={(event) => {
                setItemName(event.target.value)
                setMenuOpen(true)
              }}
              onFocus={() => setMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddItem()
              }}
              autoComplete="off"
              aria-label="Add an item to the shopping list"
            />

            {menuOpen && (suggestions.length > 0 || itemName.trim() !== '') && (
              <div className="product-dropdown">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.canonicalKey ?? suggestion.text}
                    className="product-dropdown-item"
                    onClick={() => {
                      setItemName(suggestion.text)
                      setSuggestions([])
                      setMenuOpen(false)
                    }}
                  >
                    <span>{suggestion.text}</span>
                    <span>
                      {suggestion.sampleSize ? `${suggestion.sampleSize} · ` : ''}
                      {suggestion.chainCount === 1 ? 'at 1 store' : `at ${suggestion.chainCount} stores`}
                    </span>
                  </button>
                ))}
                {itemName.trim() !== '' && (
                  <button type="button" className="product-dropdown-item" onClick={handleAddItem}>
                    <span>Add &quot;{itemName.trim()}&quot; as a new item</span>
                  </button>
                )}
              </div>
            )}
          </div>

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
            <>
              <div className="shopping-list-toolbar">
                <button
                  type="button"
                  className="shopping-view-toggle-button"
                  onClick={() => setGroupByCategory(!groupByCategory)}
                >
                  {groupByCategory ? 'Sort Alphabetically' : 'Group by Category'}
                </button>

                <button
                  type="button"
                  className="shopping-view-toggle-button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  Apply Filters
                  {selectedCategories.length > 0 && ` (${selectedCategories.length})`}
                </button>
              </div>

              {filtersOpen && (
                <div className="shopping-category-filter">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`shopping-view-toggle-button ${
                        selectedCategories.includes(category) ? 'active' : ''
                      }`}
                      aria-pressed={selectedCategories.includes(category)}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </button>
                  ))}

                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      className="shopping-view-toggle-button"
                      onClick={() => setSelectedCategories([])}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {filteredItems.length === 0 ? (
                <p className="empty-list">No shopping items match your selected filters.</p>
              ) : groupByCategory ? (
                <div className="shopping-grouped-list">
                  {sortedCategories.map((category) => (
                    <div key={category} className="shopping-category-group">
                      <h3 className="shopping-category-heading">{category}</h3>
                      <ul className="shopping-items">{groupedItems[category].map(renderItem)}</ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="shopping-items">{sortedItems.map(renderItem)}</ul>
              )}
            </>
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
            className="complete-shopping-button"
            onClick={completeShopping}
            disabled={items.length === 0 || completing}
          >
            {completing ? 'Completing…' : 'Complete Shopping'}
          </button>

          {completionMessage && <p className="completion-message">{completionMessage}</p>}

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
