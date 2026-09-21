# AGENTS.md

## Project Overview
- Single-page React 19 application bundled with Vite (v8) and TypeScript (v6).
- Frontend interface for Canvas Scraper (`Stocker-Frontend`).

## Key Commands
- `npm run dev`: Launch local Vite dev server.
- `npm run lint`: Run `oxlint` (configured via `.oxlintrc.json`).
- `npx tsc -b`: Typecheck project references (`tsconfig.app.json` + `tsconfig.node.json`).
- `npm run build`: Typecheck and build bundle (`tsc -b && vite build`) to `dist/`.
- `npm run preview`: Preview production build locally.
- *Note:* No test runner or test suite is currently configured.

## TypeScript & Compiler Constraints
- Uses TypeScript composite project references: root `tsconfig.json` references `tsconfig.app.json` (`src/`) and `tsconfig.node.json` (`vite.config.ts`).
- `allowImportingTsExtensions: true` and `verbatimModuleSyntax: true` are enabled.
- `erasableSyntaxOnly: true` is enabled in tsconfig: avoid non-erasable TypeScript features such as enums and parameter properties.
- `noUnusedLocals` and `noUnusedParameters` are strict compiler errors during `tsc -b`.

## Verification Workflow
Before committing or concluding edits, verify:
```bash
npm run lint && npm run build
```

## Modules & Architecture
- `src/landing-page/`: Marketing landing page module with dedicated sections (Hero, Who We Are, Purpose/Mission, Features, Offerings) and isolated documentation at `src/landing-page/README.md`.
- `src/pricing/`: Frontend for the Stocker-Backend price engine (`GET /api/pricing/match`, `GET /api/pricing/search`, `POST /api/pricing/compare` via the gateway; all need the gateway JWT, sent with `authFetch`). `/pricing` is user-facing: users type product names and compare their own shopping list, and never see item ids (keep it that way). See `src/pricing/README.md`. The gateway base URL is read once in `src/lib/apiConfig.ts` (`API_BASE`), shared with auth/identity: container env `API_BASE_URL` (via `/config.js`) > build-time `VITE_API_BASE_URL` > `http://localhost:8080`. `Pantry.tsx`/`Dashboard.tsx` still call the pantry (`:8087`) and catalog (`:8082`) services directly on `localhost` and are not covered by this yet.
- `src/context/ShoppingListContext.tsx`: owns the shopping list (`ShoppingItem[]`), persisted to `localStorage` per user. Adding an item immediately calls `/api/pricing/match` and keeps the per-chain results (`prices[itemId]`); `estimatedCost` is derived from the cheapest match. `src/pages/ShoppingList.tsx` lists items; `src/pages/ShoppingItemPage.tsx` (`/shopping-list/:itemId`) shows the New World / PAK'nSAVE / Woolworths comparison table.
- Routing is `react-router-dom` (`BrowserRouter` in `main.tsx`, routes in `App.tsx`); everything except `/`, `/login` and `/signup` is behind `ProtectedRoute`.
- Docker: `Dockerfile` builds the bundle and serves it with nginx (`nginx.conf`, SPA fallback). `docker/40-app-config.sh` writes `/config.js` from the `API_BASE_URL` env var at every container start (`public/config.js` is an empty placeholder in dev), so the gateway address needs no rebuild. The app may be served over plain http, where `crypto.randomUUID()` does not exist: use `newId()` from `src/lib/uuid.ts`.
