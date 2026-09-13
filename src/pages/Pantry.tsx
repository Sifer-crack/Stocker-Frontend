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
  // Temporary until the authentication service provides the logged-in user's UUID.
  const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001'
  useEffect(() => {
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
  loadPantry()
}, [])

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
        >
          + Add Pantry Item
        </button>
      </header>

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
                <p>Quantity: {item.quantity}</p>

                {item.lowStock && (
                  <span className="low-stock">
                    Running low
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  onAddToShoppingList(item.name)
                }
              >
                Add to Shopping List
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

export default Pantry