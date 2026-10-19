import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchNutritionForFood } from '../lib/nutrition'
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
import type { NutritionResult } from '../lib/nutrition'
import './Pantry.css'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { useUser } from '../context/UserContext'

interface PantryProps {
  onAddToShoppingList: (item: string) => void
}

interface PantryDisplayItem {
  id: string
  name: string
  quantity: number
  unit: string
  lowStock: boolean
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

function Pantry({
  onAddToShoppingList,
}: PantryProps) {
  const navigate = useNavigate()
  const { user } = useUser()
  const { accessToken } = useAuth()
  const { refresh: refreshNotifications } = useNotifications()
  const handleAddToShoppingList = (item: string) => {
    onAddToShoppingList(item)
    navigate('/shopping-list')
  }
  const [pantryItems, setPantryItems] = useState<PantryDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState(1)
  const [newExpirationDate, setNewExpirationDate] = useState('')
  const [newNotifyDays, setNewNotifyDays] = useState('')
  const [editingExpirationDate, setEditingExpirationDate] = useState('')
  const [editingNotifyDays, setEditingNotifyDays] = useState('')

  const[productResults, setProductResults] = useState<ProductApiItem[]>([])
  const[selectedProduct, setSelectedProduct] = useState<ProductApiItem | null>(null)
  const [nutritionById, setNutritionById] = useState<Record<string, NutritionResult>>({})
  const [nutritionLoadingId, setNutritionLoadingId] = useState<string | null>(null)
  const [nutritionErrorById, setNutritionErrorById] = useState<Record<string, string>>({})
  const [expandedNutritionId, setExpandedNutritionId] = useState<string | null>(null)
  const nutritionAbortRef = useRef<AbortController | null>(null)

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
            name: product.productName,
            quantity: pantryItem.quantity,
            unit: getProductSize(product),
            lowStock: pantryItem.quantity <= 1,
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

  const handleProductSearch = async (value: string) => {
    setNewItemName(value)
    setSelectedProduct(null)

    if (value.trim().length < 2) {
      setProductResults([])
      return
    }

    try {
      const products = await searchProducts(value, accessToken)

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

      // reload pantry from backend
      await loadPantry()

      setNewItemName('')
      setSelectedProduct(null)
      setProductResults([])
      setNewItemQuantity(1)
      setNewExpirationDate('')
      setNewNotifyDays('')
      setShowAddForm(false)
      void refreshNotifications()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to add pantry item')
    }
}

const handleRemovePantryItem = async (id: string) => {
  try {
    setError('')

    await deletePantryItem(id, accessToken)
    await loadPantry()
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

  return (
    <main className="pantry-page">
      <header className="pantry-header">
        <div>
          <h1>My Pantry</h1>
          <p>Keep track of what you already have at home.</p>
        </div>

        <button
          type="button"
          className="add-pantry-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Pantry Item'}
        </button>
      </header>
        {showAddForm && (
          <div className="add-pantry-form">
            <input
                type="text"
                placeholder={"Search products..."}
                value={newItemName}
                onChange={(event) => handleProductSearch(event.target.value)
            }
            />

            {productResults.length > 0 && !selectedProduct && (
                <div className="product-dropdown">
                  {productResults.map((product) =>
                  <button
                      type="button"
                      key={product.productId}
                      className="product-dropdown-item"
                      onClick={() => {
                        setSelectedProduct(product)
                        setNewItemName(`${product.productName} - ${getProductSize(product)}`
                        )
                        setProductResults([])
                      }}
                  >
                    <span>{product.productName}</span>
                    <span>{getProductSize(product)}</span>
                  </button>
                  )}
                </div>
            )}
            <input
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(event) =>
                setNewItemQuantity(Number(event.target.value))
              }
            />
            <label className="expiry-field">
              <span>Expires on (optional)</span>
              <input
                type="date"
                value={newExpirationDate}
                onChange={(event) => setNewExpirationDate(event.target.value)}
              />
            </label>
            <label className="expiry-field">
              <span>Remind me (days before)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="3"
                value={newNotifyDays}
                disabled={newExpirationDate === ''}
                onChange={(event) => setNewNotifyDays(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={handleAddPantryItem}
            >
              Add Item
            </button>
          </div>
        )}

      <div className="pantry-content">
        {loading && <p>Loading pantry...</p>}
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
        </div>

        <section className="pantry-card">
          {pantryItems.map((item) => (
            <div
              key={item.id}
              className="pantry-item"
            >
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

              <div className="pantry-item-actions">
                <button
                  type="button"
                  onClick={() =>
                    handleAddToShoppingList(item.name)
                  }
                >
                  Add to Shopping List
                </button>
                <button
                  type="button"
                  onClick={() => handleShowNutrition(item)}
                >
                  {expandedNutritionId === item.id ? 'Hide Nutrition' : 'Nutrition'}
                </button>
                {editingItemId === item.id ? (
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(item.id)}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="remove-pantry-button"
                  onClick={() => handleRemovePantryItem(item.id)}
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
          ))}
        </section>
      </div>
    </main>
  )
}

export default Pantry