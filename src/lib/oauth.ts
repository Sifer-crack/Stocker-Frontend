import { API_BASE } from './apiConfig'

export type OAuthProvider = 'github'

// OAuth starts with a full-page navigation (not fetch): the backend redirects to
// the provider, which then redirects back to STOCKER_OAUTH_SUCCESS_REDIRECT with
// the refresh cookie set.
export function startOAuthLogin(provider: OAuthProvider): void {
  window.location.href = `${API_BASE}/api/identity/oauth2/authorization/${provider}`
}
