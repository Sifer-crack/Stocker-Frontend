import './Pantry.css'

interface PantryProps {
  onAddToShoppingList: (item: string) => void
}

function Pantry({
  onAddToShoppingList,
}: PantryProps) {
  const pantryItems = [
    { name: 'Milk', quantity: 1, lowStock: true },
    { name: 'Bread', quantity: 2, lowStock: false },
    { name: 'Eggs', quantity: 4, lowStock: true },
    { name: 'Rice', quantity: 3, lowStock: false },
    { name: 'Pasta', quantity: 2, lowStock: false },
    { name: 'Butter', quantity: 1, lowStock: true },
  ]

  return (
    <main className="pantry-page">
      <header className="pantry-header">
        <div>
          <h1>My Pantry</h1>
          <p>Keep track of what you already have at home.</p>
        </div>
      </header>

      <div className="pantry-content">
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
              key={item.name}
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