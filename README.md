# Stocker-Frontend

React + TypeScript (Vite) single-page app for **Stocker**, a household grocery and pantry assistant: track what
is in your pantry, keep a shopping list, and see which New Zealand supermarket (New World, PAK'nSAVE,
Woolworths) is cheapest.

The browser talks only to the backend **gateway** (`Stocker-Backend`, port 8080) with a JWT. See
[CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md) for how the two fit together.

## Features

| Page | Route | What it does |
| --- | --- | --- |
| Landing page | `/` | Marketing page ([details](src/landing-page/README.md)) |
| Login / Sign up | `/login`, `/signup` | Account access via the gateway's identity service |
| Dashboard | `/dashboard` | Budget, pantry and shopping list summary |
| My Pantry | `/pantry` | Pantry items with quantities, nutrition info and optional expiry dates with a reminder threshold |
| Shopping List | `/shopping-list` | Server-side list; prices arrive live over a server-sent-events stream. Each item (`/shopping-list/:itemId`) has a per-chain comparison, similar alternatives, unit prices and a stale-price indicator |
| Price Search | `/pricing` | Look up any product, or compare the whole list across chains ([details](src/pricing/README.md)) |
| Favorite Stores | `/favorite-stores` | Save chains and browse the products stored for them |
| Notifications | `/notifications` | Pantry items about to expire (polled every 60 s; unread badge in the sidebar) |
| Shopping Options / Route | `/store-recommendations`, `/shopping-route` | Store suggestions and route for the list |
| Account | `/account` | Profile and weekly budget |

## Backend requirements

The frontend expects a gateway that serves these routes. They currently live on different backend branches, so
check that yours has them:

- `/api/identity/**`, `/api/products/**`, `/api/pantry-items/**`
- `/api/pricing/{match,search,compare}` and `/api/pricing/stores/{chainId}/products`
- `/api/shopping/items`, `/api/shopping/favorite-stores` and the stream `/api/updates/shopping`
- `/api/notifications/**`

The gateway address is resolved in `src/lib/apiConfig.ts`: container env `API_BASE_URL` (via `/config.js`) >
build-time `VITE_API_BASE_URL` > `http://localhost:8080`. The page origin must be listed in the gateway's
`STOCKER_CORS_ALLOWED_ORIGINS`.

Known gaps: the backend has no delete or check-off for shopping items, so those are remembered in this browser
only; inventory trusts the `userId` the page sends.

## Docker

The image builds the bundle and serves it with nginx on port 80. The gateway address is a **runtime** env var
because it is the address the *browser* uses to reach the gateway (the app's JavaScript runs on the viewer's
machine, so `localhost` would mean their machine):

```bash
docker build -t stocker-frontend .
docker run -d --name stocker-frontend --restart unless-stopped -p 3000:80 \
  -e API_BASE_URL=http://<pi-tailscale-ip>:8080 stocker-frontend
```

Open `http://<pi-tailscale-ip>:3000`. The gateway must allow that page origin: set
`STOCKER_CORS_ALLOWED_ORIGINS` on the gateway to include `http://<pi-tailscale-ip>:3000`. The Pantry and Dashboard
pages still call the pantry/catalog services directly on `localhost` and will not work from another machine yet.

## Development

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Lint with oxlint
npm run lint

# Typecheck and build the production bundle (run lint and build before committing)
npm run build

# Preview build locally
npm run preview
```
