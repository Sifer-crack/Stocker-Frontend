#!/bin/sh
# Runs on every container start (the nginx image executes /docker-entrypoint.d/*.sh).
# Turns the API_BASE_URL env var into /config.js, which index.html loads before the app,
# so the gateway address can be changed with `docker run -e API_BASE_URL=...` without a rebuild.
set -eu

# Escape backslashes and double quotes so the value stays a valid JS string.
api_base_url=$(printf '%s' "${API_BASE_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')

printf 'window.__APP_CONFIG__ = { apiBaseUrl: "%s" }\n' "$api_base_url" > /usr/share/nginx/html/config.js
echo "app-config: apiBaseUrl=${API_BASE_URL:-<unset, falling back to build-time/localhost default>}"
