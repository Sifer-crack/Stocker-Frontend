# Pricing Module (`src/pricing`)

Frontend for the Stocker-Backend price engine (`services/pricing`, exposed through the `gateway`'s
`PricingController`). Prices are fetched **when an item is added to the shopping list**, and every
list item has its own page comparing the same product across New World, PAK'nSAVE and Woolworths.

## How it fits together

1. `ShoppingList` -> `addItem(name)` in `src/context/ShoppingListContext.tsx` creates a `ShoppingItem`
   (its `id` is a UUID that doubles as the backend `itemId`) and calls `matchItem` right away.
2. The backend matches the typed name to one product per chain (semantic search) and returns them. An
   empty result can mean the backend deferred the fetch to its async refresh, so the context retries a
   few times (3s, 6s, 12s) before settling on "No prices found".
3. `/shopping-list/:itemId` (`src/pages/ShoppingItemPage.tsx`) renders `ChainComparisonTable`: one fixed
   row per chain (a chain with no match reads "Not found"), the cheapest row highlighted.
4. The cheapest matched price x quantity feeds the list's estimated cost, the Dashboard and the sidebar.

The list and its prices are stored in `localStorage` (`stocker.shoppingList.<userId>`). Items still
pending on reload are resumed.

## File Structure

```
src/pricing/
├── api.ts                   # authFetch client: matchItem, compareShoppingList (searchPrices is unused by the UI)
├── types.ts                 # request/response shapes matching the gateway's REST DTOs
├── chains.ts                # supported chains (id + label), cheapestMatch()
├── format.ts                # formatPrice(), storeLabel()
├── ChainComparisonTable.tsx # per-item, one-row-per-chain comparison table
├── PricingTable.css         # table/error styles shared by every pricing view
├── matchPolling.ts          # matchItem + retry while the backend has nothing yet (shared by list + search)
├── PriceSearch.tsx          # /pricing "Look up a product": type a name, get one row per chain
├── ShoppingListCompare.tsx  # /pricing "Compare my shopping list": the real list, region, savings baseline
├── PricingPage.tsx          # /pricing: the two cards above
├── PricingPage.css
├── index.ts                 # public exports
└── README.md
```

## Backend contract

All calls need the gateway JWT (`Authorization: Bearer <accessToken>`, added by `authFetch`).

- `GET /api/pricing/match?term=&itemId=&category=` ->
  `{ matchMethod: "semantic" | "lexical", matches: ChainMatch[] }`, at most one match per chain,
  ascending by price. `"lexical"` means the backend's embedding provider was unavailable and it fell
  back to keyword scoring; the item page says so. Empty `matches` = nothing found (yet).
  **Not implemented in Stocker-Backend yet**: see the "Pending task: semantic item match" section of
  `Stocker-Backend/CLAUDE.md` for the spec.
- `GET /api/pricing/search?term=&itemId=&storeUrls=&category=` -> `{ priceRecords: [...] }`, sorted
  ascending by price.
- `POST /api/pricing/compare` with `{ items: [{itemId, quantity}], region, selectedChainId }` ->
  `{ storeTotals: [...], cheapestChainId, selectedChainId }`. Returns HTTP 422 with `{ error }` when the
  request is outside the supported service area or has no items.

Errors are `{ error }` with a non-2xx status. See
`Stocker-Backend/gateway/src/main/java/com/stocker/gateway/api/rest/PricingController.java` and
`Stocker-Backend/TASKS.md` (Price engine section) for the authoritative contract.

## Configuration

The gateway address is `API_BASE` in `src/lib/apiConfig.ts`, shared with auth/identity. In Docker set the
container env `API_BASE_URL`; for `npm run dev` / `npm run build` set `VITE_API_BASE_URL` (see `.env.example`);
otherwise it defaults to `http://localhost:8080`.

## Routing

`react-router-dom` (see `App.tsx`). Inside the protected app layout: `/shopping-list`,
`/shopping-list/:itemId` (item comparison page) and `/pricing` ("Price Search" in the sidebar).

Users never see or type item ids. The list uses each item's generated id; "Look up a product" derives a stable
id from the wording (`search:<slug>`) so repeat searches reuse the backend's cache; "Compare my shopping list"
sends the list's own ids and maps unavailable ids back to item names.
