# Pricing Module (`src/pricing`)

Frontend for the Stocker-Backend price engine (`services/pricing`, exposed through the `gateway`'s
`PricingController`) and the shopping service's item list. Every list item has its own page comparing
the same product across New World, PAK'nSAVE and Woolworths.

## How it fits together

1. `ShoppingList` -> `addItem(name)` in `src/context/ShoppingListContext.tsx` POSTs `/api/shopping/items`.
   The server answers at once with `comparisonStatus: "pending"` and prices the item in the background.
2. The context keeps one fetch-based SSE connection (`src/lib/sseStream.ts`) on `GET /api/updates/shopping`.
   Each `shopping-item-updated` push carries the item's full state and replaces it by id (a push whose
   `comparedAt` is older than the one held is ignored). Every (re)connect refetches `GET /api/shopping/items`.
3. The list shows the server's `cheapest` price per item. `unavailable` means pricing rejected the item.
   `pending` can last a while (the backend never retries), so after 2 minutes the wording becomes
   "Still looking for prices…".
4. `/shopping-list/:itemId` (`ShoppingItemPage.tsx`) loads the per-chain detail from `/api/pricing/match` the
   first time it is opened: `ChainComparisonTable` (one fixed row per chain), `AlternativesTable` for similar
   products, and an "Updating prices…" note while `stale` prices are being refreshed.
5. The cheapest price x quantity feeds the list's estimated cost, the Dashboard and the sidebar.

Ticked-off and removed items cannot be stored server-side yet (no endpoints), so they are remembered in
`localStorage` (`stocker.shoppingList.overlay.<userId>`) and only apply to this browser. The old
`stocker.shoppingList.<userId>` key is no longer read.

Related pages outside this folder: `pages/FavoriteStores.tsx` (favorite chains and their stored products,
`storesApi.ts`) and `pages/Notifications.tsx` (pantry expiry notifications, polled every 60 s).

## File Structure

```
src/pricing/
├── api.ts                   # authFetch client: matchItem, compareShoppingList (searchPrices is unused by the UI)
├── shoppingApi.ts           # /api/shopping/items: add + list, and the shape of an item / live push
├── storesApi.ts             # favorite stores and a chain's stored products
├── types.ts                 # request/response shapes matching the gateway's REST DTOs
├── chains.ts                # supported chains (id + label), cheapestMatch()
├── format.ts                # formatPrice(), storeLabel()
├── ChainComparisonTable.tsx # per-item, one-row-per-chain comparison table
├── AlternativesTable.tsx    # similar (non-exact) products, shown apart from the exact matches
├── PricingTable.css         # table/error styles shared by every pricing view
├── matchPolling.ts          # matchItem + capped retries while empty (3x) or stale (2x)
├── PriceSearch.tsx          # /pricing "Look up a product": type a name, get one row per chain
├── ShoppingListCompare.tsx  # /pricing "Compare my shopping list": the real list, region, savings baseline
├── PricingPage.tsx          # /pricing: the two cards above
├── PricingPage.css
├── index.ts                 # public exports
└── README.md
```

## Backend contract

All calls need the gateway JWT (`Authorization: Bearer <accessToken>`, added by `authFetch`).

- `GET /api/pricing/match?term=&itemId=&category=&weightKg=&volumeL=` ->
  `{ matchMethod: "canonical" | "lexical", matches: MatchView[], alternatives: MatchView[], stale: boolean }`.
  `matches`: at most one per chain, cheapest first (`matchType: "exact"`); `alternatives`:
  `matchType: "alternative"`. Each view also has `unitPrice` (per kg / L / item, no unit sent, so the UI infers
  it from `packSize`) and `packSize`; `productUrl` is always null. `stale` = some prices are older than 12 h and
  a refresh may be running, so ask again shortly. Empty lists = nothing stored yet (not an error). 422 `{ error }`.
- `POST /api/shopping/items` `{ name, quantity?, category?, region? }` -> 201 `ServerShoppingItem` (pending);
  `GET /api/shopping/items`; SSE `GET /api/updates/shopping` (event `shopping-item-updated`, data
  `{ source: "sync"|"backfill", item }`, comment heartbeats every 25 s). The client sends no `X-User-Id`.
- `GET|POST /api/shopping/favorite-stores`, `DELETE /api/shopping/favorite-stores/{id}` (204, no body),
  `GET /api/pricing/stores/{chainId}/products?query=&limit=` (database only). Favorites store the chain id in
  lower case; price results use upper case.
- `GET /api/notifications`, `POST /api/notifications/{id}/acknowledge` (`status: "NEW" | "ACKNOWLEDGED"`).
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
