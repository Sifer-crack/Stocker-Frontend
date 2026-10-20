// Runtime config. Empty in dev (Vite serves this file as-is, values fall back to VITE_* / defaults).
// In the Docker image, docker/40-app-config.sh regenerates it from env vars every time the container starts.
window.__APP_CONFIG__ = {}
