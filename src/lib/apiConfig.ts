declare global {
  interface Window {
    /** Written by /config.js; in Docker it is generated at container start from the API_BASE_URL env var. */
    __APP_CONFIG__?: { apiBaseUrl?: string }
  }
}

/**
 * Base URL of the Stocker gateway, as the *browser* must reach it. Precedence:
 * container env `API_BASE_URL` (via /config.js) > build-time `VITE_API_BASE_URL` > localhost.
 */
export const API_BASE: string =
  window.__APP_CONFIG__?.apiBaseUrl || (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
