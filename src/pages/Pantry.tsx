import { useEffect, useState } from 'react'
import './Pantry.css'

interface PantryProps {
  onAddToShoppingList: (item: string) => void
}

interface PantryApiItem {
  pantry_item_id: string
  user_id: string
  product_id: string
  quantity: number
}

interface ProductApiItem {
  productId: string
  categoryId: string | null
  name: string
  unit: string
}

interface PantryDisplayItem {
  id: string
  name: string
  quantity: number
  unit: string
  lowStock: boolean
}

function Pantry({
  onAddToShoppingList,
}: PantryProps) {
  const [pantryItems, setPantryItems] = useState<PantryDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState(1)
  const[newItemUnit, setNewItemUnit] = useState('');
  // Temporary until the authentication service provides the logged-in user's UUID.
  const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001'

  const loadPantry = async () => {
    try {
      setLoading(true)
      setError('')

      const pantryResponse = await fetch(
        `http://localhost:8087/pantry-items?userId=${TEMP_USER_ID}`
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
            name: product.name,
            quantity: pantryItem.quantity,
            unit: product.unit,
            lowStock: pantryItem.quantity <= 1,
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
    loadPantry()
  }, [])

  const handleAddPantryItem = async () => {
    const trimmedName = newItemName.trim()
    const trimmedUnit = newItemUnit.trim()

    if (!trimmedName || !trimmedUnit || newItemQuantity < 1) {
      return
  }

    try {
      setError('')

      const params = new URLSearchParams({
        userId: TEMP_USER_ID, // TODO: replace with real userid
        productName: trimmedName,
        unit: trimmedUnit,
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

      // reload pantry from backend
      await loadPantry()

      setNewItemName('')
      setNewItemUnit('')
      setNewItemQuantity(1)
      setShowAddForm(false)
    } catch (err) {
      console.error(err)
      setError('Unable to add pantry item')
    }
}

const handleRemovePantryItem = (id: string) => {
  setPantryItems((currentItems) =>
    currentItems.filter((item) => item.id !== id)
  )
}

const handleStartEdit = (item: PantryDisplayItem) => {
  setEditingItemId(item.id)
  setEditingQuantity(item.quantity)
}

const handleSaveEdit = (id: string) => {
  if (editingQuantity < 1) {
    return
  }
  setPantryItems((currentItems) =>
    currentItems.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: editingQuantity,
            lowStock: editingQuantity <= 1,
          }
        : item
    )
  )
  setEditingItemId(null)
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
              placeholder="Item name"
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
            />
            <input
                type="text"
                placeholder="Unit"
                value={newItemUnit}
                onChange={(event) => setNewItemUnit(event.target.value)}
            />

            <input
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(event) =>
                setNewItemQuantity(Number(event.target.value))
              }
            />
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
                  onClick={() =>
                    onAddToShoppingList(item.name)
                  }
                >
                  Add to Shopping List
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
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

export default Pantry