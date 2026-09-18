import './ShoppingRoute.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShoppingRouteProps {
  selectedOption: string
}

function ShoppingRoute({
  selectedOption,
}: ShoppingRouteProps) {
  const navigate = useNavigate()
  const [shoppingStarted, setShoppingStarted] = useState(false)
  const stores = selectedOption
    .replace(' only', '')
    .replace(' Click & Collect', '')
    .replace(' Delivery', '')
    .split(' + ')
  return (
    <main className="route-page">
      <header className="route-header">
        <div>
          <h1>Shopping Route</h1>
          <p>Your recommended route for this shopping trip.</p>
        </div>
      </header>

      <div className="route-content">
        <section className="route-main-card">
          <div className="route-card-heading">
            <div>
              <span className="route-label">SELECTED OPTION</span>
              <h2>{selectedOption}</h2>
            </div>

            <span className="route-status">Recommended</span>
          </div>

          <div className="route-stop">
            <div className="route-number">1</div>

            <div>
              <span>START</span>
              <h3>Your Location</h3>
              <p>Begin your shopping trip</p>
            </div>
          </div>

          <div className="route-line"></div>

          {stores.map((store, index) => (

        <div key={store}>
          {index > 0 && <div className="route-line"></div>}
          <div className="route-stop">
            <div className="route-number">{index + 2}</div>
            <div>
              <span>SHOP</span>
              <h3>{store}</h3>
              <p>Purchase your shopping list items</p>
            </div>
          </div>
        </div>
      ))}
        </section>

        <aside className="route-summary-card">
          <h2>Trip Summary</h2>

          <div className="route-summary-row">
            <span>Selected option</span>
            <strong>{selectedOption}</strong>
          </div>

          <div className="route-summary-row">
            <span>Estimated stops</span>
            <strong>{stores.length}</strong>
          </div>

          <div className="route-summary-row">
            <span>Route status</span>
            <strong>{shoppingStarted ? 'Active' : 'Ready'}</strong>
          </div>

          <button
            type="button"
            onClick={() => setShoppingStarted(true)}
            disabled={shoppingStarted}
          >
            {shoppingStarted ? 'Shopping Started' : 'Start Shopping'}
          </button>
          {shoppingStarted && (
            <p className="shopping-started-message">
              Your shopping route is now active.
            </p>
          )}

          <button
            type="button"
            className="route-back-button"
            onClick={() => navigate('/store-recommendations')}
          >
            Back to Shopping Options
          </button>
        </aside>
      </div>
    </main>
  )
}

export default ShoppingRoute