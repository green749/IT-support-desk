const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function csrfToken() {
  return document.cookie.split('; ').find((row) => row.startsWith('csrfToken='))?.split('=')[1]
}

/**
 * Cookie-authenticated HTTP client. JWTs are never read or persisted by the UI.
 * A single retry after refresh avoids refresh loops on expired sessions.
 */
export async function api(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken()) headers['x-csrf-token'] = decodeURIComponent(csrfToken())

  const response = await fetch(`${API_URL}${path}`, { ...options, method, headers, credentials: 'include' })
  if (response.status === 401 && !retried && !path.startsWith('/auth/refresh') && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: csrfToken() ? { 'x-csrf-token': decodeURIComponent(csrfToken()) } : {},
    })
    if (refreshed.ok) return api(path, options, true)
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    let errorMsg = payload.message || 'Something went wrong. Please try again.'
    if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
      errorMsg = payload.errors.map(e => e.msg || e.message).filter(Boolean).join('. ') || errorMsg
    }
    throw new Error(errorMsg)
  }
  return payload
}
