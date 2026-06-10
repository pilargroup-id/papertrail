import axios from 'axios'
import { getToken } from '../utils/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_PATH_PREFIXES = ['/api/', '/logout', '/generate-pdf', '/preview', '/pdfs']

export function resolveApiUrl(input) {
  if (typeof input !== 'string') return input
  if (!input.startsWith('/')) return input
  if (!API_BASE_URL) return input

  if (API_PATH_PREFIXES.some(prefix => input.startsWith(prefix))) {
    return `${API_BASE_URL}${input}`
  }

  return input
}

export function configureNetworkClient() {
  if (typeof window === 'undefined' || window.__FRP_NETWORK_CONFIGURED__) return

  window.__FRP_NETWORK_CONFIGURED__ = true

  const nativeFetch = window.fetch.bind(window)

  window.fetch = (input, init = {}) => {
    const nextInput = resolveApiUrl(input)
    const token = getToken()

    const nextInit = {
      credentials: init.credentials || 'include',
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    }

    return nativeFetch(nextInput, nextInit)
  }

  axios.defaults.withCredentials = true

  if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL
  }
}

