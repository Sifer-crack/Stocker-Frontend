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
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingQuantity, setEditingQuantity] = useState(1)
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
    // Get the available products from the Catalog service.
    const productsResponse = await fetch('http://localhost:8082/products')
    if (!productsResponse.ok) {
      throw new Error('Could not load products')
    }
    const products: ProductApiItem[] = await productsResponse.json()
    // Find the product matching the name and unit entered by the user.
    const matchingProduct = products.find(
      (product) =>
        product.name.toLowerCase() === trimmedName.toLowerCase() &&
        product.unit.toLowerCase() === trimmedUnit.toLowerCase()
    )
    if (!matchingProduct) {
      setError('Product not found in catalogue.')
      return
    }
    // Add the matching product to the user's pantry.
    const params = new URLSearchParams({
      userId: TEMP_USER_ID,
      productId: matchingProduct.productId,
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
    setNewItemName('')
    setNewItemUnit('')
    setNewItemQuantity(1)
    setShowAddForm(false)
    await loadPantry()

  } catch (err) {
    console.error(err)
    setError('Unable to add pantry item.')
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
              placeholder="Unit (e.g. 2L)"
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