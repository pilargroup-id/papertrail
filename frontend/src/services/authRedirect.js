const DEFAULT_LOGIN_URL = 'https://pilargroup.id/login'
const RETURN_URL_PARAM = 'return_url'

export const getCentralLoginUrl = () => import.meta.env.VITE_LOGIN_URL || DEFAULT_LOGIN_URL

export const buildCentralLoginRedirectUrl = (currentUrl = window.location.href) => {
  const loginUrl = getCentralLoginUrl()
  const separator = loginUrl.includes('?') ? '&' : '?'

  return `${loginUrl}${separator}${RETURN_URL_PARAM}=${encodeURIComponent(currentUrl)}`
}

// Only call this from a point where the auth-check endpoint (/auth/me) has
// actually returned 401 — never on a merely-missing local token, since the
// backend may still authenticate the request via its own fallback (dev auth).
export const redirectToCentralLogin = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.location.assign(buildCentralLoginRedirectUrl())
}
