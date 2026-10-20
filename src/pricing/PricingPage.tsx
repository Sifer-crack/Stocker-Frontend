import './PricingPage.css'
import './PricingTable.css'
import { PriceSearch } from './PriceSearch.tsx'
import { ShoppingListCompare } from './ShoppingListCompare.tsx'

export function PricingPage() {
  return (
    <main className="pricing-page">
      <header className="pricing-intro">
        <h1>Price Search</h1>
        <p>
          Live prices from New World, PAK&apos;nSAVE and Woolworths NZ. Look up any product, or compare your whole
          shopping list to find the cheapest supermarket. Items you add to your shopping list are priced
          automatically.
        </p>
      </header>

      <section className="pricing-grid">
        <PriceSearch />
        <ShoppingListCompare />
      </section>
    </main>
  )
}

export default PricingPage
