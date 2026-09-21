# Stocker-Frontend

Front-end interface and marketing platform for **Canvas Scraper** (`Stocker`).

## Overview

Stocker provides tools for academic data extraction, structured courseware synchronization, and automated insights from Canvas LMS.

### Modules

- **Marketing Landing Page** (`src/landing-page`): Single-page presentation highlighting who we are, what we are here for, and what we have to offer across learner, department, and enterprise tiers. See [landing-page README](src/landing-page/README.md) for details.
- **Pricing** (`src/pricing`): Frontend for the Stocker-Backend price engine. Items added to the shopping list are priced automatically (semantic match per chain) and each item has its own New World / PAK'nSAVE / Woolworths comparison page; a manual search/compare tool lives at `/pricing`. See [pricing README](src/pricing/README.md) for details.

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

# Build production bundle
npm run build

# Preview build locally
npm run preview
```
