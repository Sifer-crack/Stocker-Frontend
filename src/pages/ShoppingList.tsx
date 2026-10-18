import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import {
  fetchSpendingReport,
  formatReportDateKey,
  mergePurchaseIntoReport,
  saveSpendingReport,
} from '../lib/spendingReport'
import './ShoppingList.css'
import type { ShoppingItem } from '../App'

interface ShoppingListApiItem {
  shoppingListId: string
  productId: string
  quantity: number
  shoppingListItemId: string
  status: string
}

interface ProductApiItem {
  productId: string
  productName: string
  groceryType: string | null
  sellingWeightKg: number | null
  sellingVolumeL: number | null
}

interface ShoppingListProps {
  items: ShoppingItem[]
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>
}

function ShoppingList({
  items,
  setItems,
}: ShoppingListProps) {
  const navigate = useNavigate()
  const { user } = useUser()
  const { accessToken } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [itemName, setItemName] = useState('')
  const [completedItems, setCompletedItems] = useState<number[]>([])
  const [completionMessage, setCompletionMessage] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setItems([])
      return
    }
    const controller = new AbortController()
    const loadShoppingList = async () => {
      setIsLoading(true)
      setApiError('')

      try {
        const response = await fetch(
            `http://localhost:8083/shopping-lists?userId=${user.id}`,
            { signal: controller.signal}
        )

        if (!response.ok) {
          throw new Error('Unable to load your shopping list.')
        }

        const data = await response.json()
        const shoppingListItems: ShoppingListApiItem[] =
            Array.isArray(data) ? data : data.value

        const loadedItems: ShoppingItem[] = await Promise.all(
            shoppingListItems.map(async (item) => {
              const productResponse = await fetch(
                  `http://localhost:8082/products/${item.productId}`,
                  { signal: controller.signal }
              )
              if (!productResponse.ok) {
                throw new Error(`Unable to load product ${item.productId}.`)
              }
                  const product: ProductApiItem =
                      await productResponse.json()

                  return {
                    name: product.productName,
                    productId: item.productId,
                    shoppingListItemId: item.shoppingListItemId,
                    quantity: item.quantity,
                    status: item.status,
                  }
            })
        )
        setItems(loadedItems)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        console.error('Unable to load shopping list: ', error)
        setApiError('Unable to load your shopping list.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadShoppingList()
    return () => controller.abort()
  }, [user?.id, setItems]);

  const weeklyBudget = user?.groceryBudget ?? 0
  const toggleCompleted = (index: number) => {
  if (completedItems.includes(index)) {
    setCompletedItems(
      completedItems.filter((itemIndex) => itemIndex !== index)
    )
  } else {
    setCompletedItems([...completedItems, index])
  }
}
const removeItem = async (index: number) => {
    const item = items[index]
  if (!item) {
    return
  }

  if (item.shoppingListItemId) {
    if (!user?.id) {
      setApiError('You must be signed in to remove items.')
      return
    }
    try {
      const response = await fetch(`http://localhost:8083/shopping-lists/items/${item.shoppingListItemId}?userId=${user.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Unable to remove shopping list item.')
      }
    } catch (error) {
      console.error('Unable to remove item: ', error)
      setApiError('Unable to remove the item. Please try again')
      return
    }
  }

  setItems((currentItems) => currentItems.filter((_, i) => i !== index))
  setCompletedItems((currentCompleted) =>
  currentCompleted
      .filter((itemIndex) => itemIndex !== index)
      .map((itemIndex) => itemIndex > index ? itemIndex - 1 : itemIndex))
}

const completeShopping = async () => {
  if (completedItems.length === 0) {
    setCompletionMessage('Select the items you have purchased first.')
    return
  }

  if (!user) {
    setCompletionMessage('Unable to update pantry because no user is signed in.')
    return
  }

  const completedSet = new Set(completedItems)

  const purchasedItems = items.filter((_, index) =>
    completedSet.has(index)
  )

  try {
    for (const item of purchasedItems) {
      if (!item.productId) {
        continue
      }

      const response = await fetch(
        `http://localhost:8087/pantry-items?userId=${user.id}&productId=${item.productId}&quantity=1`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error(`Could not update pantry for ${item.name}`)
      }
    }

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

const addItem = () => {
  if (itemName.trim() === '') {
    return
  }
  setItems([
    ...items,
    {
      name: itemName,
    },
  ])
  setItemName('')
}

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

  const estimatedCost = items.reduce(
    (total, item) => total + getItemPrice(item) * (item.quantity ?? 1),
    0
  )
  const remainingBudget = weeklyBudget - estimatedCost
  const progressPercentage =
  items.length === 0
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
          <input
            type="text"
            placeholder="Search products"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
          />

          <button type="button" onClick={addItem}>
            Add Item
          </button>
        </div>
      </header>

      <div className="shopping-content">
        <section className="shopping-list-card">
          {isLoading ? (
              <p className="empty-list">Loading shopping list...</p>
          ) : apiError ? (
              <p className="completion-message" role="alert">
                {apiError}
              </p>
          ) : items.length === 0 ? (
              <p className="empty-list">No items added yet.</p>
          ) : (
              <ul className="shopping-items">
                {items.map((item, index) => (
                <li key={index} className="shopping-item">
                  <div className="shopping-item-info">
                    <button
                      type="button"
                      className={`item-checkbox ${
                        completedItems.includes(index) ? 'completed' : ''
                      }`}
                      onClick={() => toggleCompleted(index)}
                      aria-label={`Mark ${item.name} as ${
                        completedItems.includes(index) ? 'not completed' : 'completed'
                      }`}
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
              {completedItems.length} / {items.length} items
            </strong>

            <hr />

            <div className="summary-row">
              <span>Estimated cost</span>
              <strong>${estimatedCost.toFixed(2)}</strong>
            </div>

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
            disabled={items.length === 0}
          >
            Complete Shopping
          </button>

          {completionMessage && (
            <p className="completion-message">
              {completionMessage}
            </p>
          )}

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