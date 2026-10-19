# Manual test checklist (Sprint 2 frontend)

None of these have been run. Unit tests (`npm test`) cover the pure logic only. Lint and build passing only proves the code compiles. Run them against the
backend stack (`integration/sprint2-manual-test`, see `docs/MANUAL_TESTING.md` in the backend repo) at
`http://localhost:5173` with a freshly registered user. Tick and date each line.

## Session
- [ ] Log in, stay 20+ minutes (or set `STOCKER_JWT_ACCESS_TTL=60` on the backend): list, notifications poll and live updates keep working with no reload.
- [ ] Stop the gateway for ~1 minute across a refresh time, then restart it: you are not sent to `/login`.
- [ ] Delete the refresh cookie, wait for the next call: you are sent to `/login`.

## Expiry notifications (2.5)
- [ ] Add/edit a pantry item with a date; reload; the date is still shown.
- [ ] The "remind me N days before" value survives a reload.
- [ ] An item expiring within N days appears in Notifications after the next scan (up to 15 min).
- [ ] An item expiring later than N days produces nothing.
- [ ] "Got it" marks it acknowledged and lowers the sidebar badge.
- [ ] Repeated polls/scans never show two rows for the same item and date.
- [ ] No date, or a cleared date: no notification.
- [ ] A reminder without a date, or a negative number, shows the backend message.
- [ ] The notification appears in the UI within 60 s of existing.
- [ ] No request goes to `localhost:8087` / `:8082` (browser network tab).

## Favorite stores (3.3)
- [ ] Save a store; it is listed after reload; a second account sees none.
- [ ] Remove a store.
- [ ] Selecting a favorite shows only that store's items; searching narrows the list.
- [ ] "Add to list" adds the item (pending, then priced).
- [ ] Saving the same store twice does not create a second row.

## Shopping list, match, compare (4.6)
- [ ] Add an item: a "Fetching prices…" row at once, then prices appear without reload.
- [ ] Reload: same state. Open an item page by URL directly: detail loads.
- [ ] Item page and /pricing search: one row per product with a price per chain ("—" where not carried); a product at two chains is one row; the cheapest chain is highlighted; the disclaimer sits under each table.
- [ ] Status: `refreshing` shows "Checking the supermarkets…" with per-chain chips and stops by itself; `not-found` shows "Nothing found at any supermarket"; `alternatives-only` shows "No exact match. Similar products:".
- [ ] Alternatives: next to a real match they are hidden until "Include similar alternatives" is ticked, then appear in a separate dashed box; a generic-fallback result says it is the same type of product.
- [ ] "Use this one" on the item page marks the row Selected, and the compare page then prices that product.
- [ ] Cancel (and typing again) stops a running price search and clears the results.
- [ ] Free-text items: in Pantry, typing "Tim Tams" and picking 'Add "Tim Tams" as a new item' adds it with no catalog entry; Add Item in the Pantry search bar prefills the form; on the shopping list the same option adds an uncatalogued item; Complete Shopping puts it in the pantry by name.
- [ ] Shopping-list search suggestions come from `/api/pricing/suggest` (items supermarkets stock, e.g. "Cooking wine"), show "at N stores", and focusing the empty box lists the most widely stocked products; typing quickly only keeps the last request.
- [ ] Rename on the shopping list: Rename turns the name into an input (the button becomes Save); Enter or Save saves (the item is priced again under the new name, keeps its quantity and ticked state), Escape or clicking away cancels; renaming to an existing item name does not create a duplicate.
- [ ] Compare: totals, items priced of N, unavailable item names, cheapest marked, savings positive/zero/negative.
- [ ] Unsupported region shows the exact 422 message; no crash.
- [ ] Picking a "compare savings against" store changes the baseline (needs the lower-case fix).
- [ ] Picking a store that the chosen method filters out shows "—" for savings and the explanation line.

## Fulfilment costs (5.4)
- [ ] With a list where the shelf-cheapest chain loses once fees are added, the recommendation names the true cheapest and notes the difference.
- [ ] Only "Delivery" ticked: PAK'nSAVE is not shown and the note says why.
- [ ] Only "Click and collect": all three chains remain.
- [ ] Nothing ticked: Compare is disabled.
- [ ] Empty `storeTotals` (e.g. delivery only with a PAK'nSAVE-only result) shows the "No supermarket offers…" message.
- [ ] Best option and fee are shown per chain; "All options" lists alternatives.

## Notification pop-ups
- [ ] With a NEW expiry notification, a card appears top right (under the top bar) with the product name and "Expires in N days"; it disappears after about 9 s, or on ×.
- [ ] Hovering a card pauses its timer. "View notifications" opens the page and dismisses the card.
- [ ] More than three new notifications: three cards plus "and N more"; dismissing one brings the next in.
- [ ] A dismissed or timed-out card does not come back on the next poll or after a reload (same tab session); acknowledging a notification removes its card.
