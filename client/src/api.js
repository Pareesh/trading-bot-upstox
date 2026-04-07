const API_BASE = '/api'
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000'
const CONNECT_URL = `${API_ORIGIN}/api/auth/upstox`

export async function fetchJson(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, options)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || response.statusText || 'Request failed')
  }

  return payload
}

export { CONNECT_URL }
