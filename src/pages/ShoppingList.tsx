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
  const productSearchRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef(accessToken)
  useLayoutEffect(() => {
    tokenRef.current = accessToken
  })
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const productSearchRef = useRef<HTMLDivElement>(null)
  const [selectedProduct, setSelectedProduct] =
      useState<ProductApiItem | null>(null)

  const[productSuggestions, setProductSuggestions] =
      useState<ProductApiItem[]>([])

  const[isAddingItem, setIsAddingItem] = useState(false)

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
useEffect(() => {
  if (!user?.id) {
    setItems([])
    setIsLoading(false)
    return
  }

  const controller = new AbortController()

  const loadShoppingList = async () => {
    setIsLoading(true)
    setApiError('')

    try {
      const loadedItems = await fetchShoppingList(user.id, controller.signal)

      const itemsWithCategories = await Promise.all(
          loadedItems.map(async (item) => {
            try {
              const response = await fetch(
                  `http://localhost:8082/products/${item.productId}`,
                  { signal: controller.signal }
              )

              if (!response.ok) {
                return { ...item, category: null }
              }

              const product: ProductApiItem = await response.json()

              return {
                ...item,
                category: product.groceryType,
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw error
              }

              console.error(`Unable to load category for ${item.name}:`, error)

              return { ...item, category: null }
            }
          })
      )

      if (!controller.signal.aborted) {
        setItems(itemsWithCategories)
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        return
      }

      console.error('Unable to load shopping list:', error)

      if (!controller.signal.aborted) {
        setApiError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while loading your shopping list.',
        )
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
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
    let reportSaved = true
    try {
      const reportItems = purchasedItems.map((item) => ({
        name: item.name,
        quantity: 1,
        price: getItemPrice(item),
      }))
      const total = reportItems.reduce((sum, item) => sum + item.price, 0)

      const latestReport = await fetchSpendingReport(accessToken)
      const updatedReport = mergePurchaseIntoReport(
        latestReport,
        formatReportDateKey(new Date()),
        reportItems,
        total
      )
      await saveSpendingReport(accessToken, updatedReport)
    } catch (reportError) {
      console.error('Unable to save spending report:', reportError)
      reportSaved = false
    }

    for (const item of purchasedItems) {
      if (!item.shoppingListItemId) {
        continue
      }

      await deleteShoppingListItem(
          user.id,
          item.shoppingListItemId,
          )
    }

    setItems(
      items.filter((_, index) => !completedSet.has(index))
    )

    const completedCount = purchasedItems.length
    setCompletedItems([])

    setCompletionMessage(
      `${completedCount} purchased ${
        completedCount === 1 ? 'item' : 'items'
      } completed and pantry updated.${
        reportSaved ? '' : ' Spending report could not be saved.'
      }`
    )
  } catch (error) {
    console.error('Unable to complete shopping:', error)
    setCompletionMessage(
      'Unable to complete shopping. Your shopping list has not been changed.'
    )
  }
}

  const addItem = async () => {
    if (!user?.id) {
      setApiError('You must be signed in to add items.')
      return
    }

    if (!selectedProduct) {
      setApiError('Please select a product from the suggestions.')
      return
    }

    setIsAddingItem(true)
    setApiError('')

    try {
      await addShoppingListItem(
          user.id,
          selectedProduct.productId,
          1,
      )

      const updatedItems = await fetchShoppingList(user.id)

      const itemsWithCategories = await Promise.all(
          updatedItems.map(async (item) => {
            try {
              const response = await fetch(
                  `http://localhost:8082/products/${item.productId}`,
              )

              if (!response.ok) {
                return { ...item, category: null }
              }

              const product: ProductApiItem = await response.json()

              return {
                ...item,
                category: product.groceryType,
              }
            } catch (error) {
              console.error(`Unable to load category for ${item.name}:`, error)

              return { ...item, category: null }
            }
          }),
      )

      setItems(itemsWithCategories)
      setItemName('')
      setSelectedProduct(null)
      setProductSuggestions([])
    } catch (error) {
      console.error('Unable to add shopping list item:', error)

      setApiError(
          error instanceof Error
              ? error.message
              : 'Unable to add the item. Please try again.',
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
  const itemPrices: Record<string, number> = {
    milk: 4.80,
    bread: 3.50,
    egg: 6.20,
    eggs: 6.20,
    cheese: 8.90,
    butter: 6.50,
    chicken: 12.40,
    rice: 4.30,
    pasta: 3.20,
    apples: 5.60,
  }

  const getItemPrice = (item: ShoppingItem) => {
    return itemPrices[item.name.toLowerCase()] ?? 5.00
  }

  const availableCategories = Array.from(
      new Set(
          items.map((item) => item.category?.trim() || 'Uncategorised'),
      ),
  ).sort((a, b) => a.localeCompare(b))

  const filteredShoppingItems =
      selectedCategories.length === 0
          ? items
          : items.filter((item) =>
              selectedCategories.includes(
                  item.category?.trim() || 'Uncategorised',
              ),
          )

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
        previous.includes(category)
            ? previous.filter((selected) => selected !== category)
            : [...previous, category],
    )
  }

  const groupedShoppingItems = filteredShoppingItems.reduce<
      Record<string, ShoppingItem[]>
  >((groups, item) => {
    const category = item.category?.trim() || 'Uncategorised'

    if (!groups[category]) {
      groups[category] = []
    }

    groups[category].push(item)

    return groups
  }, {})

  const sortedShoppingCategories = Object.keys(groupedShoppingItems).sort(
      (a, b) => a.localeCompare(b),
  )

  Object.values(groupedShoppingItems).forEach((categoryItems) => {
    categoryItems.sort((a, b) => a.name.localeCompare(b.name))
  })

  const sortedShoppingItems = [...filteredShoppingItems].sort((a, b) =>
      a.name.localeCompare(b.name),
  )

  const estimatedCost = items.reduce(
    (total, item) => total + getItemPrice(item) * (item.quantity ?? 1),
    0
  )
  const remainingBudget = weeklyBudget - estimatedCost
  const progressPercentage =
  filteredShoppingItems.length === 0
    ? 0
    : (completedItems.length / items.length) * 100

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

              <button
                  type="button"
                  onClick={addItem}
                  disabled={isAddingItem || !selectedProduct}
              >
                {isAddingItem ? 'Adding...' : 'Add Item'}
              </button>
            </div>
        </header>
        <div className="shopping-content">
          <section className="shopping-list-card">
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
                  onClick={() => setFiltersOpen(true)}
              >
                Apply Filters
                {selectedCategories.length > 0 &&
                    ` (${selectedCategories.length})`}
              </button>
            </div>

            {filtersOpen && (
                <div
                    className="pantry-filter-overlay"
                    onClick={() => setFiltersOpen(false)}
                >
                  <div
                      className="pantry-filter-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="shopping-filter-title"
                      onClick={(event) => event.stopPropagation()}
                  >
                    <div className="pantry-filter-modal-header">
                      <h2 id="shopping-filter-title">Filter Shopping List</h2>

                      <button
                          type="button"
                          className="pantry-filter-close"
                          onClick={() => setFiltersOpen(false)}
                          aria-label="Close filters"
                      >
                        ×
                      </button>
                    </div>

                    <div className="pantry-filter-modal-field">
        <span className="pantry-filter-modal-label">
          Item categories
        </span>

                      <div className="pantry-category-filter-options">
                        {availableCategories.map((category) => (
                            <button
                                key={category}
                                type="button"
                                className={`pantry-filter-button ${
                                    selectedCategories.includes(category) ? 'active' : ''
                                }`}
                                aria-pressed={selectedCategories.includes(category)}
                                onClick={() => toggleCategory(category)}
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                      </div>
                    </div>

                    <div className="pantry-filter-modal-footer">
                      <button
                          type="button"
                          className="pantry-clear-filters"
                          onClick={() => setSelectedCategories([])}
                      >
                        Clear filters
                      </button>

                      <button
                          type="button"
                          className="pantry-filter-done"
                          onClick={() => setFiltersOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
            )}

            {isLoading ? (
                <p className="empty-list">Loading shopping list...</p>
            ) : apiError ? (
                <p className="completion-message" role="alert">
                  {apiError}
                </p>
            ) : items.length === 0 ? (
                <p className="empty-list">No items added yet.</p>
            ) : filteredShoppingItems.length === 0 ? (
                <p className="empty-list">
                  No shopping items match your selected filters.
                </p>
            ) : groupByCategory ? (
                <div className="shopping-grouped-list">
                  {sortedShoppingCategories.map((category) => (
                      <div key={category} className="shopping-category-group">
                        <h3 className="shopping-category-heading">
                          {category}
                        </h3>

                        <ul className="shopping-items">
                          {groupedShoppingItems[category].map((item) => {
                            const index = items.indexOf(item)
                            const isCompleted = completedItems.includes(index)

                            return (
                                <li
                                    key={item.shoppingListItemId ?? `${item.productId}-${index}`}
                                    className="shopping-item"
                                >
                                  <div className="shopping-item-info">
                                    <button
                                        type="button"
                                        className={`item-checkbox ${isCompleted ? 'completed' : ''}`}
                                        onClick={() => toggleCompleted(index)}
                                        aria-label={`Mark ${item.name} as ${isCompleted ? 'not completed' : 'completed'}`}
                                    />

                                    <div>
                                      <strong>{item.name}</strong>
                                      <p>Qty {item.quantity ?? 1}</p>
                                    </div>
                                  </div>

                                  <div className="shopping-item-actions">
                  <span>
                    Est. ${(getItemPrice(item) * (item.quantity ?? 1)).toFixed(2)}
                  </span>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                            )
                          })}
                        </ul>
                      </div>
                  ))}
                </div>
            ) : (
                <ul className="shopping-items">
                  {sortedShoppingItems.map((item) => {
                    const index = items.indexOf(item)
                    const isCompleted = completedItems.includes(index)

                    return (
                        <li
                            key={item.shoppingListItemId ?? `${item.productId}-${index}`}
                            className="shopping-item"
                        >
                          <div className="shopping-item-info">
                            <button
                                type="button"
                                className={`item-checkbox ${isCompleted ? 'completed' : ''}`}
                                onClick={() => toggleCompleted(index)}
                                aria-label={`Mark ${item.name} as ${isCompleted ? 'not completed' : 'completed'}`}
                            />

                            <div>
                              <strong>{item.name}</strong>
                              <p>Qty {item.quantity ?? 1}</p>
                            </div>
                          </div>

                          <div className="shopping-item-actions">
            <span>
              Est. ${(getItemPrice(item) * (item.quantity ?? 1)).toFixed(2)}
            </span>

                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                    )
                  })}
                </ul>
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
