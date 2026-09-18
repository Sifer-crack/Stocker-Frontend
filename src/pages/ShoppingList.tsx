import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ShoppingList.css'

interface ShoppingListProps {
  items: string[]
  setItems: React.Dispatch<React.SetStateAction<string[]>>
  weeklyBudget: number
}

function ShoppingList({
  items,
  setItems,
  weeklyBudget,
}: ShoppingListProps) {
  const navigate = useNavigate()
  const [itemName, setItemName] = useState('')
  const [completedItems, setCompletedItems] = useState<number[]>([])
  const toggleCompleted = (index: number) => {
  if (completedItems.includes(index)) {
    setCompletedItems(
      completedItems.filter((itemIndex) => itemIndex !== index)
    )
  } else {
    setCompletedItems([...completedItems, index])
  }
}
const removeItem = (index: number) => {
  setItems(items.filter((_, i) => i !== index))

  setCompletedItems(
    completedItems
      .filter((itemIndex) => itemIndex !== index)
      .map((itemIndex) =>
        itemIndex > index ? itemIndex - 1 : itemIndex
      )
  )
}

  const addItem = () => {
  if (itemName.trim() === '') {
    return
  }
  setItems([...items, itemName])
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

  const getItemPrice = (item: string) => {
    return itemPrices[item.toLowerCase()] ?? 5.00
  }

  const estimatedCost = items.reduce(
    (total, item) => total + getItemPrice(item),
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
          {items.length === 0 ? (
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
                      aria-label={`Mark ${item} as ${
                        completedItems.includes(index) ? 'not completed' : 'completed'
                      }`}
                    />

                    <div>
                      <strong>{item}</strong>
                      <p>Qty 1</p>
                    </div>
                  </div>

                  <div className="shopping-item-actions">
                    <span>Est. ${getItemPrice(item).toFixed(2)}</span>

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