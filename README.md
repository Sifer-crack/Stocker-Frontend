# Stocker Frontend

The web client for **Stocker**, a household grocery and pantry assistant. It lets you track pantry
stock, keep a shared shopping list, and compare prices across New Zealand supermarkets (New World,
PAK'nSAVE and Woolworths) while accounting for delivery and click-and-collect fees.

This is a single-page React application. All data comes from the **Stocker-Backend gateway**
(default `http://localhost:8080`), which the browser calls directly with a JWT access token.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Backend API](#backend-api)
- [Testing](#testing)
- [Production build](#production-build)
- [Docker](#docker)
- [Architecture notes](#architecture-notes)
- [Contributing](#contributing)
- [Authors](#authors)
- [License](#license)

## Features

| Page | Route | Description |
| --- | --- | --- |
| Landing page | `/` | Marketing page for the project |
| Login / Sign up | `/login`, `/signup` | Account access through the gateway's identity service |
| OAuth callback | `/oauth/callback` | Completes a GitHub OAuth sign-in |
| Dashboard | `/dashboard` | Budget, pantry and shopping-list summary |
| My Pantry | `/pantry` | Pantry items with quantities, nutrition information, expiry dates and reminder thresholds |
| Shopping List | `/shopping-list` | Server-side list updated live over server-sent events, with prices per item |
| Shopping Item | `/shopping-list/:itemId` | Per-chain price comparison, alternatives and unit prices for one item |
| Price Search | `/pricing` | Search any product, or compare the whole shopping list across chains |
| Favorite Stores | `/favorite-stores` | Save chains and browse the products stored for them |
| Notifications | `/notifications` | Pantry items approaching expiry (polled every 60 seconds, with unread badge) |
| Account | `/account` | Profile and weekly budget |

The interface supports light and dark themes, persisted in `localStorage`.

## Tech stack

- [React 19](https://react.dev/) with [React Router 7](https://reactrouter.com/)
- [TypeScript 6](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) for development and bundling
- [Vitest 5](https://vitest.dev/) for unit tests
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting
- nginx for serving the production bundle

No UI component library is used; styles are plain CSS.

## Prerequisites

- **Node.js 22 or newer** (CI uses Node 24) and npm
- A running Stocker backend gateway, or at least the CORS origin of this app configured there

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Point the app at the gateway (optional; defaults to http://localhost:8080)
cp .env.example .env
# edit VITE_API_BASE_URL if your gateway runs elsewhere

# 3. Start the dev server
npm run dev
```

Vite serves the app at <http://localhost:5173>. Add that origin to the gateway's
`STOCKER_CORS_ALLOWED_ORIGINS` environment variable, otherwise API calls will be blocked by CORS.

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module replacement |
| `npm run build` | Type-check (`tsc -b`) and build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with `oxlint` (configuration in `.oxlintrc.json`) |
| `npm test` | Run the Vitest unit tests |

Before committing, run:

```bash
npm run lint && npm run build && npm test
```

## Configuration

The gateway base URL is resolved at runtime in `src/lib/apiConfig.ts`, in this order:

1. `API_BASE_URL` container environment variable, written to `/config.js` at container start
2. Build-time `VITE_API_BASE_URL` (see `.env.example`)
3. `http://localhost:8080`

> **Why two variables?** The bundle runs in the viewer's browser, so the gateway address must be
> reachable from *their* machine. In Docker, `API_BASE_URL` is read at container start, which means
> the image does not need rebuilding when the address changes. For local development, Vite injects
> `VITE_API_BASE_URL` at build time.

For local development, `public/config.js` is an empty placeholder; the Docker entrypoint regenerates
it from `API_BASE_URL` on every start via `docker/40-app-config.sh`.

## Project structure

```
.
├── docker/                  # Container startup scripts (runtime config)
├── docs/                    # Manual test checklists
├── public/                  # Static assets, including config.js placeholder
├── src/
│   ├── assets/              # Images
│   ├── components/          # Shared UI (top bar, sidebar, toasts, loading, route guard)
│   ├── context/             # Auth, user, theme, notifications and shopping-list providers
│   ├── hooks/               # Reusable hooks
│   ├── landing-page/        # Marketing page module (own README)
│   ├── lib/                 # API clients, auth/session, SSE, formatting helpers
│   ├── pages/               # Route components (Dashboard, Pantry, Login, ...)
│   ├── pricing/             # Price engine UI (own README)
│   ├── test/                # Vitest setup
│   ├── App.tsx              # Routes and application layout
│   ├── main.tsx             # Providers and React root
│   └── index.css            # Global styles and theme variables
├── .env.example
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.ts
```

Deeper documentation lives alongside the code:

- [`src/landing-page/README.md`](src/landing-page/README.md) — marketing page sections and styling
- [`src/pricing/README.md`](src/pricing/README.md) — price comparison flow, polling and fulfilment costs

## Backend API

The frontend expects the following routes on the gateway (all require the JWT unless noted):

| Area | Routes |
| --- | --- |
| Identity | `/api/identity/**`, including login, refresh, logout and OAuth |
| Pantry | `/api/pantry-items/**` |
| Catalog | `/api/products/**` |
| Pricing | `/api/pricing/products`, `/api/pricing/search`, `/api/pricing/compare`, `/api/pricing/suggest` |
| Shopping | `/api/shopping/items`, `/api/shopping/favorite-stores` |
| Live updates | `GET /api/updates/shopping` (server-sent events) |
| Notifications | `/api/notifications/**` |

If a route returns `404`, the backend branch you are running probably does not include that service yet.

### Authentication

- The access token is kept in memory and sent as a bearer token by `authFetch` (`src/lib/authFetch.ts`).
- The refresh token lives in an HTTP-only cookie and is used by `src/lib/session.ts` to obtain a new
  access token shortly before expiry.
- `authFetch` retries once on `401` after refreshing; a failed refresh ends the session and redirects
  to `/login`.
- Everything except `/`, `/login`, `/signup` and `/oauth/callback` is behind `ProtectedRoute`.

## Testing

```bash
npm test        # unit tests (Vitest, plain Node, no network)
```

Tests cover pure logic such as SSE parsing, token refresh, product polling caps, pantry request
building, chain-id normalisation and fulfilment helpers. They do **not** exercise the live backend.

End-to-end/manual checks are documented in [`docs/manual-checklist.md`](docs/manual-checklist.md).
Run the app against a backend stack and work through the checklist for changes that touch network,
authentication or pricing behaviour.

## Production build

```bash
npm run build
npm run preview   # serve dist/ locally
```

`npm run build` runs the TypeScript project build first, so type errors fail the build.

nginx (`nginx.conf`) serves `dist/` with:

- long-lived immutable caching for fingerprinted `/assets/*`
- `no-cache` for `index.html`
- SPA fallback so client-side routes such as `/shopping-list/<id>` work on a hard refresh

## Docker

```bash
docker build -t stocker-frontend .

docker run -d --name stocker-frontend --restart unless-stopped -p 3000:80 \
  -e API_BASE_URL=http://<gateway-host>:8080 \
  stocker-frontend
```

The app is then available at <http://localhost:3000>. Remember to allow that page origin in the
gateway's `STOCKER_CORS_ALLOWED_ORIGINS`.

The container needs no rebuild when `API_BASE_URL` changes; restart it with the new value instead.

## Architecture notes

- **State** is held in React context providers (`AuthContext`, `UserContext`, `ThemeContext`,
  `NotificationsContext`, `ShoppingListContext`) mounted in `src/main.tsx`.
- **Live shopping updates** use a fetch-based SSE reader (`src/lib/sseStream.ts`) because the native
  `EventSource` API cannot send an `Authorization` header. Reconnects use exponential backoff and the
  latest access token.
- **Price polling** re-requests a product search every 2.5 seconds while the backend reports
  `refreshing` (capped at roughly three minutes) and stops when the status becomes final.
- **Local-only state**: the backend currently has no check-off or delete endpoints for shopping-list
  items, so ticked/removed items are stored in `localStorage` and apply to the current browser only.
- **Theme** is applied through `data-theme` on `<html>` and CSS custom properties in `src/index.css`.
- **Plain-HTTP support**: `crypto.randomUUID()` is unavailable outside secure contexts, so ids use
  `newId()` from `src/lib/uuid.ts`.

## Contributing

1. Create a branch from `dev`.
2. Make your change and add or update tests for logic in `src/lib` and module helpers.
3. Run `npm run lint && npm run build && npm test`.
4. Update the relevant README if you change configuration, routes or API usage.
5. Open a pull request. CI runs lint, tests and build on every push to `main`/`dev` and on pull
   requests (`.github/workflows/ci.yml`).

## Authors

Built by the Stocker team:

- [Semion Andreev](https://github.com/Sifer-crack) (Sifer-crack)
- Rhys Woolliscroft (john)
- [Nick Tozer](https://github.com/pilotdwn) (pilotdwn)
- bigboy427

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
