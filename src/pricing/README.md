# Pricing Module (`src/pricing`)

Frontend for the Stocker-Backend price engine (`services/pricing`, exposed through the
`gateway`'s `PricingController`). Lets a user search live per-item prices across supermarket
chains, and compare a whole shopping list's total cost across chains with savings shown.

## File Structure

```
src/pricing/
├── api.ts                  # fetch client for GET /api/pricing/search and POST /api/pricing/compare
├── types.ts                # request/response shapes matching the gateway's REST DTOs
├── PriceSearch.tsx          # single-item search form + results table
├── ShoppingListCompare.tsx  # multi-item shopping list form + per-chain totals/savings table
├── PricingPage.tsx          # page shell combining both, linked from the landing page nav
├── PricingPage.css
├── index.ts                 # public exports
└── README.md
```

## Backend contract

- `GET /api/pricing/search?term=&itemId=&storeUrls=&category=` → `{ priceRecords: [...] }`,
  sorted ascending by price.
- `POST /api/pricing/compare` with `{ items: [{itemId, quantity}], region, selectedChainId }` →
  `{ storeTotals: [...], cheapestChainId, effectiveSelectedChainId }`. Returns HTTP 422 with
  `{ error }` when the request is outside the supported service area or has no items.

See `Stocker-Backend/gateway/src/main/java/com/stocker/gateway/api/rest/PricingController.java`
and `Stocker-Backend/TASKS.md` (Price engine section) for the authoritative contract.

## Configuration

Set `VITE_GATEWAY_BASE_URL` (see `.env.example`) to point at a running gateway instance; defaults
to `http://localhost:8080`. No auth/credentials are sent cross-origin yet, matching the gateway's
current CORS setup.

## Routing

There's no router dependency yet, so `App.tsx` switches between the landing page and this page on
`window.location.hash === '#/pricing'`. The landing page's nav links to `#/pricing`; this page
links back via `#/`.
