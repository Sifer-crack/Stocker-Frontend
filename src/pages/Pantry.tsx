import { useEffect, useRef, useState } from 'react'
import { fetchNutritionForFood } from '../lib/nutrition'
import type { NutritionResult } from '../lib/nutrition'
import './Pantry.css'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { useUser } from '../context/UserContext'
import type { ShoppingItem } from '../context/ShoppingListContext'
import {
  addPantryItem,
  deletePantryItem,
  getProduct,
  listPantry,
  searchProducts,
  setPantryExpiry,
  updatePantryQuantity,
} from '../lib/pantryApi'
import type { ProductApiItem } from '../lib/pantryApi'

interface PantryProps {
  onAddToShoppingList: (name: string, productId?: string) => void
  shoppingListItems: ShoppingItem[]
}

interface PantryDisplayItem {
  id: string
  productId: string
  name: string
  quantity: number
  unit: string
  lowStock: boolean
  category: string | null
  expirationDate: string | null
  notifyDaysBefore: number | null
}

/** The optional expiry inputs as the API wants them; a reminder without a date is not allowed, so it is dropped. */
const parseExpiry = (expirationDate: string, notifyDaysBefore: string) => ({
  expirationDate: expirationDate === '' ? null : expirationDate,
  notifyDaysBefore: expirationDate === '' || notifyDaysBefore === '' ? null : Number(notifyDaysBefore),
})

const getProductSize = (product: ProductApiItem): string => {
  if (product.sellingWeightKg != null) {
    return `${product.sellingWeightKg} kg`
  }

  if (product.sellingVolumeL != null) {
    return `${product.sellingVolumeL} L`
  }
  return ''
}

function PantryItemRow({
  item,
  isSelected,
  onToggleSelect,
  editingItemId,
  editingQuantity,
  setEditingQuantity,
  editingExpirationDate,
  setEditingExpirationDate,
  editingNotifyDays,
  setEditingNotifyDays,
  expandedNutritionId,
  nutritionLoadingId,
  nutritionErrorById,
  nutritionById,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onShowNutrition,
}: {
  item: PantryDisplayItem
  isSelected: boolean
  onToggleSelect: () => void
  editingItemId: string | null
  editingQuantity: number
  setEditingQuantity: (quantity: number) => void
  editingExpirationDate: string
  setEditingExpirationDate: (value: string) => void
  editingNotifyDays: string
  setEditingNotifyDays: (value: string) => void
  expandedNutritionId: string | null
  nutritionLoadingId: string | null
  nutritionErrorById: Record<string, string>
  nutritionById: Record<string, NutritionResult>
  onStartEdit: (item: PantryDisplayItem) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onShowNutrition: (item: PantryDisplayItem) => void
}) {
  return (
    <div key={item.id} className={`pantry-item${isSelected ? ' pantry-item--selected' : ''}`}>
      <div className="pantry-item-main">
        <button
          type="button"
          className={`pantry-select-circle${isSelected ? ' pantry-select-circle--active' : ''}`}
          aria-label={isSelected ? `Deselect ${item.name}` : `Select ${item.name}`}
          aria-pressed={isSelected}
          onClick={onToggleSelect}
        />
        <div>
        <h3>{item.name}</h3>
        {editingItemId === item.id ? (
          <>
            <input
              type="number"
              min="1"
              value={editingQuantity}
              onChange={(event) =>
                setEditingQuantity(Number(event.target.value))
              }
            />
            <label className="expiry-field">
              <span>Expires on</span>
              <input
                type="date"
                value={editingExpirationDate}
                onChange={(event) => setEditingExpirationDate(event.target.value)}
              />
            </label>
            <label className="expiry-field">
              <span>Remind me (days before)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="3"
                value={editingNotifyDays}
                disabled={editingExpirationDate === ''}
                onChange={(event) => setEditingNotifyDays(event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <p>Quantity: {item.quantity}</p>
            {item.expirationDate && (
              <p className="pantry-expiry">
                Expires {new Date(`${item.expirationDate}T00:00:00`).toLocaleDateString()}
                {item.notifyDaysBefore !== null && ` (reminder ${item.notifyDaysBefore} days before)`}
              </p>
            )}
          </>
        )}

        {item.lowStock && (
          <span className="low-stock">
            Running low
          </span>
        )}
      </div>
      </div>

      <div className="pantry-item-actions">
        <button
          type="button"
          className="nutrition-button"
          onClick={() => onShowNutrition(item)}
        >
          {expandedNutritionId === item.id ? 'Hide Nutrition' : 'Nutrition'}
        </button>
        {editingItemId === item.id ? (
          <>
            <button
              type="button"
              onClick={() => onSaveEdit(item.id)}
            >
              Save
            </button>
            <button
              type="button"
              className="cancel-edit-button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(item)}
          >
            Edit
          </button>
        )}
      </div>
      {expandedNutritionId === item.id && (
        <div className="nutrition-panel">
          {nutritionLoadingId === item.id && <p>Loading nutrition…</p>}
          {nutritionErrorById[item.id] && nutritionLoadingId !== item.id && (
            <p className="nutrition-error">{nutritionErrorById[item.id]}</p>
          )}
          {nutritionById[item.id] && nutritionLoadingId !== item.id && (
            <>
              <p className="nutrition-match">
                {nutritionById[item.id].food.foodname} — serving:{' '}
                {nutritionById[item.id].servingAmount}{' '}
                {nutritionById[item.id].food.serving_size_unit} (
                {nutritionById[item.id].food.serving_or_measure_description})
              </p>
              <table className="nutrition-table">
                <thead>
                  <tr>
                    <th>Nutrient</th>
                    <th>Per serving</th>
                    <th>%RDI</th>
                  </tr>
                </thead>
                <tbody>
                  {nutritionById[item.id].components.map((component) => (
                    <tr key={component.component_code}>
                      <td>
                        {component.component_displayname}
                        <span className="nutrition-per100"> ({component.unit_abbr})</span>
                      </td>
                      <td>{component.amount}</td>
                      <td>{component.percent_RDI}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Pantry({
  onAddToShoppingList,
  shoppingListItems,
}: PantryProps) {
  const { user } = useUser()
  const { accessToken } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const [pantryItems, setPantryItems] = useState<PantryDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generationMessage, setGenerationMessage] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState(1)
  const [newExpirationDate, setNewExpirationDate] = useState('')
  const [newNotifyDays, setNewNotifyDays] = useState('')
  const [editingExpirationDate, setEditingExpirationDate] = useState('')
  const [editingNotifyDays, setEditingNotifyDays] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchField, setSearchField] = useState<'name' | 'quantity'>('name')
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [productCategoryFilters, setProductCategoryFilters] = useState<string[]>([])

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const availableCategories = Array.from(new Set(pantryItems.map((item) => item.category?.trim() || "Uncategorised")))
      .sort((a, b) => a.localeCompare(b));
  const filteredPantryItems = pantryItems.filter((item) => {
    if (selectedCategories.length === 0) {
      return true;
    }
    const category = item.category?.trim() || "Uncategorised";
    return selectedCategories.includes(category);
  });

  const [productResults, setProductResults] = useState<ProductApiItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductApiItem | null>(null)
  const [nutritionById, setNutritionById] = useState<Record<string, NutritionResult>>({})
  const [nutritionLoadingId, setNutritionLoadingId] = useState<string | null>(null)
  const [nutritionErrorById, setNutritionErrorById] = useState<Record<string, string>>({})
  const [expandedNutritionId, setExpandedNutritionId] = useState<string | null>(null)
  const nutritionAbortRef = useRef<AbortController | null>(null)
  const productSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setProductResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (editingItemId === null) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingItemId(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingItemId])

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((previous) =>
      previous.includes(id)
        ? previous.filter((selected) => selected !== id)
        : [...previous, id]
    )
  }

  const clearSelection = () => {
    setSelectedItemIds([])
  }

  const handleBulkAddToShoppingList = () => {
    const selectedItems = pantryItems.filter((item) =>
      selectedItemIds.includes(item.id)
    )

    const newItems = selectedItems.filter(
      (item) =>
        !shoppingListItems.some(
          (shoppingItem) => shoppingItem.name === item.name
        )
    )

    newItems.forEach((item) => {
      onAddToShoppingList(item.name, item.productId)
    })

    setGenerationMessage(
      newItems.length === 0
        ? 'Selected items are already on your shopping list.'
        : `${newItems.length} ${
            newItems.length === 1 ? 'item' : 'items'
          } added to your shopping list.`
    )

    clearSelection()
  }

  const handleGenerateShoppingList = () => {
    const lowStockItems = pantryItems.filter((item) => item.lowStock)

    if (lowStockItems.length === 0) {
      setGenerationMessage('There are no low-stock items to add.')
      return
    }

    const newItems = lowStockItems.filter(
      (item) =>
        !shoppingListItems.some(
          (shoppingItem) => shoppingItem.name === item.name
        )
    )

    if (newItems.length === 0) {
      setGenerationMessage(
        'All low-stock items are already on your shopping list.'
      )
      return
    }

    newItems.forEach((item) => {
      onAddToShoppingList(item.name, item.productId)
    })

    setGenerationMessage(
      `${newItems.length} low-stock ${
        newItems.length === 1 ? 'item' : 'items'
      } added to your shopping list.`
    )
  }

  const loadPantry = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user) {
        setPantryItems([])
        setLoading(false)
        return
      }

      const pantryData = await listPantry(user.id, accessToken)

      const displayItems = await Promise.all(
        pantryData.map(async (pantryItem) => {
          const product = await getProduct(pantryItem.product_id, accessToken)

          return {
            id: pantryItem.pantry_item_id,
            productId: pantryItem.product_id,
            name: product.productName,
            quantity: pantryItem.quantity,
            unit: getProductSize(product),
            lowStock: pantryItem.quantity <= 1,
            category: product.groceryType,
            expirationDate: pantryItem.expirationDate ?? null,
            notifyDaysBefore: pantryItem.notifyDaysBefore ?? null,
          }
        })
      )
      setPantryItems(displayItems)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to load pantry from the server.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (user) {
      loadPantry()
    }
  }, [user])

  const productSearchAbortRef = useRef<AbortController | null>(null)

  const handleProductSearch = async (value: string) => {
    setNewItemName(value)
    setSelectedProduct(null)
    // Typing again supersedes the search still in flight.
    productSearchAbortRef.current?.abort()

    if (value.trim().length < 2) {
      setProductResults([])
      return
    }

    const controller = new AbortController()
    productSearchAbortRef.current = controller
    try {
      const products = await searchProducts(value, accessToken, controller.signal)

      if (!controller.signal.aborted) setProductResults(products)
    } catch (err) {
      if (controller.signal.aborted) return
      console.error(err)
      setProductResults([])
    }
  }

  /** Opens the add form with whatever was typed in the pantry search bar already searched for. */
  const openAddItem = () => {
    setAddItemOpen(true)
    const typed = searchInput.trim()
    if (typed !== '') void handleProductSearch(typed)
  }

  const handleAddPantryItem = async () => {
    if (!user || !selectedProduct || newItemQuantity < 1) {
      return
    }

    try {
      setError('')

      const { expirationDate, notifyDaysBefore } = parseExpiry(newExpirationDate, newNotifyDays)
      await addPantryItem(
        {
          userId: user.id,
          productId: selectedProduct.productId,
          quantity: newItemQuantity,
          expirationDate: expirationDate ?? undefined,
          notifyDaysBefore: notifyDaysBefore ?? undefined,
        },
        accessToken,
      )

      await loadPantry()

      setNewItemName('')
      setSelectedProduct(null)
      setProductResults([])
      setNewItemQuantity(1)
      setNewExpirationDate('')
      setNewNotifyDays('')
      setProductCategoryFilters([])
      setAddItemOpen(false)
      void refreshNotifications()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to add pantry item')
    }
  }

  const handleBulkRemove = async () => {
    try {
      setError('')

      await Promise.all(selectedItemIds.map((id) => deletePantryItem(id, accessToken)))

      await loadPantry()
      clearSelection()
      setConfirmDeleteOpen(false)
      void refreshNotifications()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to remove pantry item.')
    }
  }

  const handleStartEdit = (item: PantryDisplayItem) => {
    setEditingItemId(item.id)
    setEditingQuantity(item.quantity)
    setEditingExpirationDate(item.expirationDate ?? '')
    setEditingNotifyDays(item.notifyDaysBefore === null ? '' : String(item.notifyDaysBefore))
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
  }

  const handleShowNutrition = async (item: PantryDisplayItem) => {
    if (expandedNutritionId === item.id) {
      setExpandedNutritionId(null)
      return
    }
    setExpandedNutritionId(item.id)
    if (nutritionById[item.id]) {
      return
    }
    nutritionAbortRef.current?.abort()
    const controller = new AbortController()
    nutritionAbortRef.current = controller
    setNutritionLoadingId(item.id)
    setNutritionErrorById((current) => {
      const next = { ...current }
      delete next[item.id]
      return next
    })
    try {
      const result = await fetchNutritionForFood(item.name, controller.signal)
      setNutritionById((current) => ({ ...current, [item.id]: result }))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      console.error(err)
      setNutritionErrorById((current) => ({
        ...current,
        [item.id]: err instanceof Error ? err.message : `No nutrition data found for "${item.name}".`,
      }))
    } finally {
      setNutritionLoadingId((current) => (current === item.id ? null : current))
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (editingQuantity < 1) {
      return
    }

    try {
      setError('')

      await updatePantryQuantity(id, editingQuantity, accessToken)

      // Sending neither field clears the expiry date.
      const { expirationDate, notifyDaysBefore } = parseExpiry(editingExpirationDate, editingNotifyDays)
      await setPantryExpiry(id, expirationDate, notifyDaysBefore, accessToken)

      setEditingItemId(null)
      await loadPantry()
      void refreshNotifications()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to update pantry item.')
    }
  }

  const normalizedSearch = searchInput.trim().toLowerCase()
  // filter by category first then apply text / quantity search
  const filteredItems = filteredPantryItems.filter((item) => {
    if (normalizedSearch === '') {
      return true
    }
    return searchField === 'name' ? item.name.toLowerCase().includes(normalizedSearch) : String(item.quantity).includes(normalizedSearch)
  })

  const filteredProductResults = productResults.filter((product) => {
    if (productCategoryFilters.length === 0) {
      return true
    }
    const category = product.groceryType?.trim() || 'Uncategorised'
    return productCategoryFilters.includes(category)
  })

  // group filtered items by category
  const groupedPantryItems = filteredItems.reduce<Record<string, PantryDisplayItem[]>>((groups, item) => {
    const category = item.category?.trim() || 'Uncategorised'

    if (!groups[category]) {
      groups[category] = []
    }

    groups[category].push(item)

    return groups
  }, {})

  // sort categories and items alphabetically
  const sortedCategories = Object.keys(groupedPantryItems).sort((a, b) => a.localeCompare(b))

  Object.values(groupedPantryItems).forEach((items) => {
    items.sort((a, b) => a.name.localeCompare(b.name))
  })

  const sortedFilteredItems = [...filteredItems].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <main className="pantry-page">
      <header className="pantry-header">
        <div>
          <h1>My Pantry</h1>
          <div className="pantry-header-stats">
            <span>
              <strong>{pantryItems.length}</strong> pantry items
            </span>
            <span className="pantry-header-stat-low">
              <strong>{pantryItems.filter((item) => item.lowStock).length}</strong> running low
            </span>
          </div>
        </div>

        <div className="pantry-header-actions">
          <button
            type="button"
            className="pantry-generate-button"
            onClick={handleGenerateShoppingList}
          >
            Generate Shopping List
          </button>

          {generationMessage && (
            <p>{generationMessage}</p>
          )}
        </div>
      </header>

      <div className="pantry-content">
        {loading && <Loading message="Loading your pantry..." fullScreen={false} />}
        {error && <p>{error}</p>}

        {!loading && (
          <section className="pantry-card">
        <div className="pantry-toolbar">
          <div className="pantry-search">
            <input
              type="text"
              placeholder={
                searchField === 'name'
                  ? 'Search for an item (i.e Milk)'
                  : 'Search by quantity (i.e 2)'
              }
              aria-label={
                searchField === 'name'
                  ? 'Search pantry items by name'
                  : 'Search pantry items by quantity'
              }
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />

            <button
              type="button"
              className="apply-filters-button"
              onClick={() => setFiltersOpen(true)}
            >
              Apply Filters
              {selectedCategories.length > 0 && (
                <span className="apply-filters-count">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            className="view-toggle-button"
            onClick={() => setGroupByCategory(!groupByCategory)}
          >
            {groupByCategory ? 'Sort Alphabetically' : 'Group by Category'}
          </button>

          <button
            type="button"
            className="add-pantry-button add-pantry-button-compact"
            onClick={openAddItem}
            aria-label="Add Pantry Item"
          >
            <span className="add-pantry-plus">+</span>
            <span className="add-pantry-label">Add Pantry Item</span>
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
              aria-label="Filter pantry items"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pantry-filter-modal-header">
                <h2>Filters</h2>
                <button
                  type="button"
                  className="pantry-filter-close"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="pantry-filter-modal-field">
                <label htmlFor="pantry-search-field">Search by</label>
                <select
                  id="pantry-search-field"
                  value={searchField}
                  onChange={(event) =>
                    setSearchField(event.target.value as 'name' | 'quantity')
                  }
                >
                  <option value="name">Name</option>
                  <option value="quantity">Quantity</option>
                </select>
              </div>

              <div className="pantry-filter-modal-field">
                <span className="pantry-filter-modal-label">Filter by</span>
                <div className="pantry-category-filter-options">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`pantry-filter-button ${
                        selectedCategories.includes(category) ? 'active' : ''
                      }`}
                      aria-pressed={selectedCategories.includes(category)}
                      onClick={() => {
                        setSelectedCategories((previous) =>
                          previous.includes(category)
                            ? previous.filter((selected) => selected !== category)
                            : [...previous, category]
                        )
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pantry-filter-modal-footer">
                {selectedCategories.length > 0 && (
                  <button
                    type="button"
                    className="pantry-clear-filters"
                    onClick={() => setSelectedCategories([])}
                  >
                    Clear filters
                  </button>
                )}

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

        {addItemOpen && (
          <div
            className="pantry-filter-overlay"
            onClick={() => setAddItemOpen(false)}
          >
            <div
              className="pantry-filter-modal pantry-add-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Add pantry item"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pantry-filter-modal-header">
                <h2>Add Pantry Item</h2>
                <button
                  type="button"
                  className="pantry-filter-close"
                  aria-label="Close add pantry item"
                  onClick={() => setAddItemOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="pantry-filter-modal-field">
                <label htmlFor="add-item-search">Search for a product</label>
                <div className="product-search-container" ref={productSearchRef}>
                  <input
                    id="add-item-search"
                    type="text"
                    placeholder="Find a product to add to pantry..."
                    value={newItemName}
                    onChange={(event) => handleProductSearch(event.target.value)}
                  />

                  {filteredProductResults.length > 0 && !selectedProduct && (
                    <div className="product-dropdown">
                      {filteredProductResults.map((product) => (
                        <button
                          type="button"
                          key={product.productId}
                          className="product-dropdown-item"
                          onClick={() => {
                            setSelectedProduct(product)
                            setNewItemName(
                              `${product.productName} - ${getProductSize(product)}`
                            )
                            setProductResults([])
                          }}
                        >
                          <span>{product.productName}</span>
                          <span>{getProductSize(product)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pantry-filter-modal-field">
                <label htmlFor="add-item-quantity">Quantity</label>
                <input
                  id="add-item-quantity"
                  type="number"
                  min="1"
                  value={newItemQuantity}
                  onChange={(event) =>
                    setNewItemQuantity(Number(event.target.value))
                  }
                />
              </div>

              <div className="pantry-filter-modal-field">
                <label htmlFor="add-item-expiry">Expires on (optional)</label>
                <input
                  id="add-item-expiry"
                  type="date"
                  value={newExpirationDate}
                  onChange={(event) => setNewExpirationDate(event.target.value)}
                />
              </div>

              <div className="pantry-filter-modal-field">
                <label htmlFor="add-item-notify">Remind me (days before)</label>
                <input
                  id="add-item-notify"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="3"
                  value={newNotifyDays}
                  disabled={newExpirationDate === ''}
                  onChange={(event) => setNewNotifyDays(event.target.value)}
                />
              </div>

              <div className="pantry-filter-modal-field">
                <span className="pantry-filter-modal-label">Filter by</span>
                <div className="pantry-category-filter-options">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`pantry-filter-button ${
                        productCategoryFilters.includes(category) ? 'active' : ''
                      }`}
                      aria-pressed={productCategoryFilters.includes(category)}
                      onClick={() => {
                        setProductCategoryFilters((previous) =>
                          previous.includes(category)
                            ? previous.filter((selected) => selected !== category)
                            : [...previous, category]
                        )
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="pantry-add-error">{error}</p>}

              <div className="pantry-filter-modal-footer">
                <button
                  type="button"
                  className="pantry-clear-filters"
                  onClick={() => setAddItemOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="pantry-filter-done"
                  onClick={handleAddPantryItem}
                  disabled={!selectedProduct || newItemQuantity < 1}
                >
                  Add Pantry Item
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredItems.length === 0 && !loading ? (
            <p className="pantry-empty-search">
              {pantryItems.length === 0
                ? 'No pantry items yet.'
                  : selectedCategories.length > 0 || normalizedSearch !== ''
                  ? 'No pantry items match your current filters.'
                      : 'No pantry items to display.'}
            </p>
          ) : groupByCategory ? (
            sortedCategories.map((category) => (
              <div key={category} className="pantry-category">
                <h2 className="pantry-category-heading">{category}</h2>

                {groupedPantryItems[category].map((item) => (
                  <PantryItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItemIds.includes(item.id)}
                    onToggleSelect={() => toggleItemSelection(item.id)}
                    editingItemId={editingItemId}
                    editingQuantity={editingQuantity}
                    setEditingQuantity={setEditingQuantity}
                    editingExpirationDate={editingExpirationDate}
                    setEditingExpirationDate={setEditingExpirationDate}
                    editingNotifyDays={editingNotifyDays}
                    setEditingNotifyDays={setEditingNotifyDays}
                    expandedNutritionId={expandedNutritionId}
                    nutritionLoadingId={nutritionLoadingId}
                    nutritionErrorById={nutritionErrorById}
                    nutritionById={nutritionById}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onShowNutrition={handleShowNutrition}
                  />
                ))}
              </div>
            ))
          ) : (
            sortedFilteredItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                isSelected={selectedItemIds.includes(item.id)}
                onToggleSelect={() => toggleItemSelection(item.id)}
                editingItemId={editingItemId}
                editingQuantity={editingQuantity}
                setEditingQuantity={setEditingQuantity}
                    editingExpirationDate={editingExpirationDate}
                    setEditingExpirationDate={setEditingExpirationDate}
                    editingNotifyDays={editingNotifyDays}
                    setEditingNotifyDays={setEditingNotifyDays}
                expandedNutritionId={expandedNutritionId}
                nutritionLoadingId={nutritionLoadingId}
                nutritionErrorById={nutritionErrorById}
                nutritionById={nutritionById}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onShowNutrition={handleShowNutrition}
              />
            ))
          )}
        </section>
        )}

        {selectedItemIds.length > 0 && (
          <div className="pantry-bulk-bar">
            <span className="pantry-bulk-count">
              {selectedItemIds.length} selected
            </span>

            <button
              type="button"
              className="pantry-bulk-add"
              onClick={handleBulkAddToShoppingList}
            >
              Add to Shopping Cart
            </button>

            <button
              type="button"
              className="pantry-bulk-delete"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete
            </button>
          </div>
        )}

        {confirmDeleteOpen && (
          <div
            className="pantry-filter-overlay"
            onClick={() => setConfirmDeleteOpen(false)}
          >
            <div
              className="pantry-filter-modal pantry-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pantry-filter-modal-header">
                <h2>Delete items?</h2>
                <button
                  type="button"
                  className="pantry-filter-close"
                  aria-label="Close confirm delete"
                  onClick={() => setConfirmDeleteOpen(false)}
                >
                  ×
                </button>
              </div>

              <p className="pantry-confirm-text">
                Are you sure you want to delete {selectedItemIds.length}{' '}
                {selectedItemIds.length === 1 ? 'item' : 'items'}? This cannot be
                undone.
              </p>

              <div className="pantry-filter-modal-footer">
                <button
                  type="button"
                  className="pantry-clear-filters"
                  onClick={() => setConfirmDeleteOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="pantry-confirm-delete"
                  onClick={handleBulkRemove}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default Pantry
