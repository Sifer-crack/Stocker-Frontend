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
- `src/pricing/`: Frontend for the Stocker-Backend price engine (`GET /api/pricing/search`, `POST /api/pricing/compare` via the gateway). See `src/pricing/README.md`. Configured via `VITE_GATEWAY_BASE_URL` (`.env.example`), defaults to `http://localhost:8080`.
- No router dependency yet: `App.tsx` switches between modules on `window.location.hash` (`#/pricing` vs. everything else). Add a real router only if page count grows enough to justify it.

