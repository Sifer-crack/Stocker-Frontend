import { useEffect, useRef, useState } from 'react'
import { fetchNutritionForFood } from '../lib/nutrition'
import type { NutritionResult } from '../lib/nutrition'
import './Pantry.css'
import Loading from '../components/Loading'
import { useUser } from '../context/UserContext'
import type { ShoppingItem } from '../App'

interface PantryProps {
  onAddToShoppingList: (name: string, productId?: string) => void
  shoppingListItems: ShoppingItem[]
}

interface PantryApiItem {
  pantry_item_id: string
  user_id: string
  product_id: string
  quantity: number
}

interface ProductApiItem {
  productId: string
  productName: string
  groceryType: string | null
  sellingWeightKg: number | null
  sellingVolumeL: number | null
}

interface PantryDisplayItem {
  id: string
  productId: string
  name: string
  quantity: number
  unit: string
  lowStock: boolean
  category: string | null
}

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
  editingItemId,
  editingQuantity,
  setEditingQuantity,
  expandedNutritionId,
  nutritionLoadingId,
  nutritionErrorById,
  nutritionById,
  onAddToShoppingList,
  onStartEdit,
  onSaveEdit,
  onRemove,
  onShowNutrition,
}: {
  item: PantryDisplayItem
  editingItemId: string | null
  editingQuantity: number
  setEditingQuantity: (quantity: number) => void
  expandedNutritionId: string | null
  nutritionLoadingId: string | null
  nutritionErrorById: Record<string, string>
  nutritionById: Record<string, NutritionResult>
  onAddToShoppingList: (name: string, productId: string) => void
  onStartEdit: (item: PantryDisplayItem) => void
  onSaveEdit: (id: string) => void
  onRemove: (id: string) => void
  onShowNutrition: (item: PantryDisplayItem) => void
}) {
  return (
    <div key={item.id} className="pantry-item">
      <div>
        <h3>{item.name}</h3>
        {editingItemId === item.id ? (
          <input
            type="number"
            min="1"
            value={editingQuantity}
            onChange={(event) =>
              setEditingQuantity(Number(event.target.value))
            }
          />
        ) : (
          <p>Quantity: {item.quantity}</p>
        )}

        {item.lowStock && (
          <span className="low-stock">
            Running low
          </span>
        )}
      </div>

      <div className="pantry-item-actions">
        <button
          type="button"
          onClick={() => onAddToShoppingList(item.name, item.productId)}
        >
          Add to Shopping List
        </button>
        <button
          type="button"
          onClick={() => onShowNutrition(item)}
        >
          {expandedNutritionId === item.id ? 'Hide Nutrition' : 'Nutrition'}
        </button>
        {editingItemId === item.id ? (
          <button
            type="button"
            onClick={() => onSaveEdit(item.id)}
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(item)}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="remove-pantry-button"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
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
  const [pantryItems, setPantryItems] = useState<PantryDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generationMessage, setGenerationMessage] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchField, setSearchField] = useState<'name' | 'quantity'>('name')
  const [groupByCategory, setGroupByCategory] = useState(false)

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

  const handleAddToShoppingList = (
    name: string,
    productId: string
  ) => {
    const alreadyAdded = shoppingListItems.some(
      (item) => item.name === name
    )

    if (alreadyAdded) {
      setGenerationMessage(`${name} is already on your shopping list.`)
      return
    }

    onAddToShoppingList(name, productId)
    setGenerationMessage(`${name} added to your shopping list.`)
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

      const pantryResponse = await fetch(
        `http://localhost:8087/pantry-items?userId=${user.id}`
      )
      if (!pantryResponse.ok) {
        throw new Error('Could not load pantry')
      }
      const pantryData: PantryApiItem[] = await pantryResponse.json()

      const displayItems = await Promise.all(
        pantryData.map(async (pantryItem) => {
          const productResponse = await fetch(
            `http://localhost:8082/products/${pantryItem.product_id}`
          )

          if (!productResponse.ok) {
            throw new Error('Could not load product')
          }

          const product: ProductApiItem = await productResponse.json()

          return {
            id: pantryItem.pantry_item_id,
            productId: pantryItem.product_id,
            name: product.productName,
            quantity: pantryItem.quantity,
            unit: getProductSize(product),
            lowStock: pantryItem.quantity <= 1,
            category: product.groceryType,
          }
        })
      )
      setPantryItems(displayItems)
    } catch (err) {
      console.error(err)
      setError('Unable to load pantry from the server.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (user) {
      loadPantry()
    }
  }, [user])

  const handleProductSearch = async (value: string) => {
    setNewItemName(value)
    setSelectedProduct(null)

    if (value.trim().length < 2) {
      setProductResults([])
      return
    }

    try {
      const response = await fetch(
        `http://localhost:8082/products/search?query=${encodeURIComponent(value)}`
      )

      if (!response.ok) {
        throw new Error('Could not search products')
      }

      const products: ProductApiItem[] = await response.json()

      setProductResults(products)
    } catch (err) {
      console.error(err)
      setProductResults([])
    }
  }

  const handleAddPantryItem = async () => {
    if (!user || !selectedProduct || newItemQuantity < 1) {
      return
    }

    try {
      setError('')

      const params = new URLSearchParams({
        userId: user.id,
        productId: selectedProduct.productId,
        quantity: String(newItemQuantity),
      })

      const response = await fetch(
        `http://localhost:8087/pantry-items?${params.toString()}`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error('Could not add pantry item')
      }

      await loadPantry()

      setNewItemName('')
      setSelectedProduct(null)
      setProductResults([])
      setNewItemQuantity(1)
    } catch (err) {
      console.error(err)
      setError('Unable to add pantry item')
    }
  }

  const handleRemovePantryItem = async (id: string) => {
    try {
      setError('')

      const response = await fetch(
        `http://localhost:8087/pantry-items/${id}`,
        {
          method: 'DELETE',
        }
      )
      if (!response.ok) {
        throw new Error('Could not remove pantry item')
      }
      await loadPantry()
    } catch (err) {
      console.error(err)
      setError('Unable to remove pantry item.')
    }
  }

  const handleStartEdit = (item: PantryDisplayItem) => {
    setEditingItemId(item.id)
    setEditingQuantity(item.quantity)
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

      const params = new URLSearchParams({
        quantity: String(editingQuantity),
      })

      const response = await fetch(
        `http://localhost:8087/pantry-items/${id}?${params.toString()}`,
        {
          method: 'PUT',
        }
      )

      if (!response.ok) {
        throw new Error('Could not update pantry item')
      }

      setEditingItemId(null)
      await loadPantry()
    } catch (err) {
      console.error(err)
      setError('Unable to update pantry item.')
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
          <p>Keep track of what you already have at home.</p>
        </div>

        <div className="pantry-header-actions">
          <button
            type="button"
            className="view-toggle-button"
            onClick={() => setGroupByCategory(!groupByCategory)}
          >
            {groupByCategory ? 'Sort Alphabetically' : 'Group by Category'}
          </button>
        </div>
      </header>

      <div className="add-pantry-container">
        <div className="add-pantry-form">
          <div className="product-search-container" ref={productSearchRef}>
            <input
                type="text"
                placeholder="Find a product to add to pantry..."
                value={newItemName}
                onChange={(event) => handleProductSearch(event.target.value)}
            />

            {productResults.length > 0 && !selectedProduct && (
                <div className="product-dropdown">
                  {productResults.map((product) => (
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

            <input
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(event) =>
                setNewItemQuantity(Number(event.target.value))
              }
            />
          </div>

          <button
            type="button"
            className="add-pantry-button"
            onClick={handleAddPantryItem}
            disabled={!selectedProduct || newItemQuantity < 1}
          >
            Add Pantry Item
          </button>
        </div>

      <div className="pantry-content">
        {loading && <Loading message="Loading your pantry..." fullScreen={false} />}
        {error && <p>{error}</p>}
        <div className="pantry-summary">
          <div>
            <span>Pantry items</span>
            <strong>{pantryItems.length}</strong>
          </div>

          <div>
            <span>Running low</span>
            <strong>
              {pantryItems.filter((item) => item.lowStock).length}
            </strong>
          </div>

          <div className="pantry-generate-actions">
            <button
              type="button"
              onClick={handleGenerateShoppingList}
            >
              Generate Shopping List
            </button>

            {generationMessage && (
              <p>{generationMessage}</p>
            )}
          </div>
        </div>

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
          <select
            aria-label="Choose what to search by"
            value={searchField}
            onChange={(event) =>
              setSearchField(event.target.value as 'name' | 'quantity')
            }
          >
            <option value="name">Name</option>
            <option value="quantity">Quantity</option>
          </select>
        </div>

        <div className="pantry-category-filters">
          <span className="pantry-category-filter-label">
            Filter by category:
          </span>

          <div className="pantry-category-filter-options">
            {availableCategories.map((category) => (
                <button key={category}
                type="button"
                className={`pantry-filter-button ${
                  selectedCategories.includes(category) ? 'active' : ''
                }`}
                aria-pressed={selectedCategories.includes(category)}
                onClick={() => {
                  setSelectedCategories((previous) =>
                  previous.includes(category) ? previous.filter((selected) => selected !== category)
                  : [...previous, category])
                }}>
                  {category}
                </button>
            ))}
          </div>

          {selectedCategories.length > 0 && (
              <button type ="button"
              className="pantry-clear-filters"
              onClick={() => setSelectedCategories([])}>
                Clear filters
              </button>
          )}
        </div>

        <section className="pantry-card">
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
                    editingItemId={editingItemId}
                    editingQuantity={editingQuantity}
                    setEditingQuantity={setEditingQuantity}
                    expandedNutritionId={expandedNutritionId}
                    nutritionLoadingId={nutritionLoadingId}
                    nutritionErrorById={nutritionErrorById}
                    nutritionById={nutritionById}
                    onAddToShoppingList={handleAddToShoppingList}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onRemove={handleRemovePantryItem}
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
                editingItemId={editingItemId}
                editingQuantity={editingQuantity}
                setEditingQuantity={setEditingQuantity}
                expandedNutritionId={expandedNutritionId}
                nutritionLoadingId={nutritionLoadingId}
                nutritionErrorById={nutritionErrorById}
                nutritionById={nutritionById}
                onAddToShoppingList={handleAddToShoppingList}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onRemove={handleRemovePantryItem}
                onShowNutrition={handleShowNutrition}
              />
            ))
          )}
        </section>
      </div>
    </main>
  )
}

export default Pantry
