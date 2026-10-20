# syntax=docker/dockerfile:1

# ---- Build: type-check + Vite production bundle ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Serve: static files via nginx ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# The gateway address is runtime config: it is the address the *browser* uses to reach the gateway
# (e.g. the Pi's Tailscale IP), not something baked into the JS. See docker/40-app-config.sh.
ENV API_BASE_URL=""
COPY --chmod=755 docker/40-app-config.sh /docker-entrypoint.d/40-app-config.sh

EXPOSE 80
