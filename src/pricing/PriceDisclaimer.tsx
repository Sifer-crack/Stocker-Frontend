import './PricingTable.css'

/** Prices are tracked per chain, not per store: say so next to every table that shows them. */
export function PriceDisclaimer() {
  return <p className="pricing-disclaimer">Prices are chain-wide and may vary by store.</p>
}
