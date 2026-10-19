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
4. `/shopping-list/:itemId` (`ShoppingItemPage.tsx`) loads the search from `/api/pricing/products` the first
   time it is opened and renders it with `ProductResults`: rows are products, columns are chains (one product at
   two chains is one row), "Use this one" picks the product compare will price (`PUT .../items/{id}/product`),
   and similar alternatives sit in their own opt-in section. The answer is rendered by its `status`
   (`found`, `alternatives-only`, `refreshing`, `not-found`), with per-chain progress chips while a page load
   runs; `not-found` is final. `/pricing` "Look up a product" uses the same component without the pick buttons.
5. The cheapest price x quantity feeds the list's estimated cost, the Dashboard and the sidebar.

Ticked-off and removed items cannot be stored server-side yet (no endpoints), so they are remembered in
`localStorage` (`stocker.shoppingList.overlay.<userId>`) and only apply to this browser. The old
`stocker.shoppingList.<userId>` key is no longer read.

Related pages outside this folder: `pages/FavoriteStores.tsx` (favorite chains and their stored products,
`storesApi.ts`) and `pages/Notifications.tsx` (pantry expiry notifications, polled every 60 s).

## File Structure

```
src/pricing/
├── api.ts                   # authFetch client: compareShoppingList (searchPrices is unused by the UI)
├── shoppingApi.ts           # /api/shopping/items: add + list, and the shape of an item / live push
├── storesApi.ts             # favorite stores and a chain's stored products
├── types.ts                 # request/response shapes matching the gateway's REST DTOs
├── chains.ts                # supported chains (id + label), normChain()
├── format.ts                # formatPrice(), formatPerUnit()
├── productsApi.ts           # GET /api/pricing/products and PUT /api/pricing/items/{id}/product
├── productPolling.ts        # re-asks every 2.5 s while a page load is pending (max 10), abortable
├── products.ts              # cheapest chain / price helpers
├── ProductComparisonTable.tsx # products x chains table (optional "Use this one" column)
├── ProductResults.tsx       # status messages, progress chips, table, opt-in alternatives, disclaimer
├── PriceDisclaimer.tsx      # "Prices are chain-wide and may vary by store." under every price table
├── PricingTable.css         # table/error styles shared by every pricing view
├── PriceSearch.tsx          # /pricing "Look up a product": type a name, get products by chain
├── fulfilment.ts            # labels and text for fulfilment methods, fees and (possibly negative) savings
├── ShoppingListCompare.tsx  # /pricing "Compare my shopping list": the real list, region, savings baseline
├── PricingPage.tsx          # /pricing: the two cards above
├── PricingPage.css
├── index.ts                 # public exports
└── README.md
```

## Backend contract

All calls need the gateway JWT (`Authorization: Bearer <accessToken>`, added by `authFetch`).

- `GET /api/pricing/products?term=&itemId=[&category=][&limit=]` ->
  `{ query, matchMethod: "canonical" | "lexical" | "generic-fallback", status, stale, refresh, products, alternatives }`.
  A product is `{ productKey, name, brand, category, packSize, grade, unit, unitPrice, cheapestChainId, prices }`
  with `prices` keyed by lower-case chain id (`{ price, unitPrice, promo, storeId, capturedAt, stale }`; `storeId`
  is ignored: prices are per chain, not per store). Size and grade (`2L`, `12 pack`, `size 7`) are read from `term`.
  `status`: `found`, `alternatives-only`, `refreshing` (ask again in 2-3 s; asking starts no new supermarket
  request) or `not-found` (final). `refresh`: chain -> `pending | done | failed | skipped`. `generic-fallback`
  means alternatives of the same type, not the typed product. 422 `{ error }`. The old `GET /api/pricing/match`
  still exists on the backend (deprecated) but the UI no longer uses it.
- `PUT /api/pricing/items/{itemId}/product` `{ productKey }` -> `{ itemId, productKey, chains }`; replaces the
  item's earlier stored price so compare prices the selected product. 404 when the key is unknown.
- `POST /api/pantry-items` takes a JSON body `{ userId, productId?, name?, category?, unit?, quantity,
  expirationDate?, notifyDaysBefore? }` for free-text items (no catalog entry needed); catalog items still use
  the query-parameter form.
- `POST /api/shopping/items` `{ name, quantity?, category?, region? }` -> 201 `ServerShoppingItem` (pending);
  `GET /api/shopping/items`; SSE `GET /api/updates/shopping` (event `shopping-item-updated`, data
  `{ source: "sync"|"backfill", item }`, comment heartbeats every 25 s). The client sends no `X-User-Id`.
- `GET|POST /api/shopping/favorite-stores`, `DELETE /api/shopping/favorite-stores/{id}` (204, no body),
  `GET /api/pricing/stores/{chainId}/products?query=&limit=` (database only). Favorites store the chain id in
  lower case; price results use upper case.
- `GET /api/notifications`, `POST /api/notifications/{id}/acknowledge` (`status: "NEW" | "ACKNOWLEDGED"`).
- `GET /api/pricing/search?term=&itemId=&storeUrls=&category=` -> `{ priceRecords: [...] }`, sorted
  ascending by price.
- `POST /api/pricing/compare` with `{ items: [{itemId, quantity}], region, selectedChainId, allowedMethods? }` ->
  `{ storeTotals: [...], cheapestChainId, selectedChainId }`. Each `storeTotals[]` entry also has
  `totalWithFulfilment`, `bestMethod`, `fulfilmentCost` and `fulfilmentOptions` (delivery / click and collect; a
  chain offering none of the allowed methods is omitted, so the list can be empty). `selectedChainId` is sent lower
  case (see `normChain`). Returns HTTP 422 with `{ error }` when the
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
