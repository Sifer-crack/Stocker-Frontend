import './PricingPage.css'
import { PriceSearch } from './PriceSearch.tsx'
import { ShoppingListCompare } from './ShoppingListCompare.tsx'

export function PricingPage() {
  return (
    <div className="pricing-page">
      <header className="pricing-header">
        <div className="landing-brand">
          <span className="brand-dot" />
          <span className="brand-name">Stocker</span>
          <span className="brand-tag">Price Engine</span>
        </div>
        <a href="#/" className="nav-link">
          ← Back home
        </a>
      </header>

      <section className="pricing-intro">
        <div className="section-label">Price Engine</div>
        <h2 className="section-title">Compare Grocery Prices Across Chains</h2>
        <p className="section-lead">
          Live pricing data pulled from New World, PAK&apos;nSave, and Woolworths NZ. Search a single
          item or price out a whole shopping list to find the cheapest supermarket.
        </p>
      </section>

      <section className="pricing-grid">
        <PriceSearch />
        <ShoppingListCompare />
      </section>
    </div>
  )
}

export default PricingPage
