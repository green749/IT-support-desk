const rawEnvUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '')
const API_URL = rawEnvUrl.endsWith('/api') ? rawEnvUrl : `${rawEnvUrl}/api`

let memoryCsrfToken = typeof window !== 'undefined' ? sessionStorage.getItem('csrfToken') || '' : ''

export function setCsrfToken(token) {
  if (token) {
    memoryCsrfToken = token
    try {
      sessionStorage.setItem('csrfToken', token)
    } catch (e) {}
  }
}

function getCsrfToken() {
  if (typeof document !== 'undefined') {
    const cookieToken = document.cookie.split('; ').find((row) => row.startsWith('csrfToken='))?.split('=')[1]
    if (cookieToken) return cookieToken
  }
  return memoryCsrfToken || (typeof window !== 'undefined' ? sessionStorage.getItem('csrfToken') : '') || ''
}

/**
 * Cookie-authenticated HTTP client. JWTs are never read or persisted by the UI.
 * A single retry after refresh avoids refresh loops on expired sessions.
 */
export async function api(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  
  const token = getCsrfToken()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && token) {
    headers['x-csrf-token'] = decodeURIComponent(token)
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${API_URL}${cleanPath}`, { ...options, method, headers, credentials: 'include' })
  if (response.status === 401 && !retried && !cleanPath.startsWith('/auth/refresh') && !cleanPath.startsWith('/auth/login') && !cleanPath.startsWith('/auth/register')) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: token ? { 'x-csrf-token': decodeURIComponent(token) } : {},
    })
    if (refreshed.ok) {
      const refreshPayload = await refreshed.json().catch(() => ({}))
      if (refreshPayload?.csrfToken) setCsrfToken(refreshPayload.csrfToken)
      return api(path, options, true)
    }
  }

  const payload = await response.json().catch(() => ({}))
  if (payload?.csrfToken) {
    setCsrfToken(payload.csrfToken)
  }

  if (!response.ok) {
    let errorMsg = payload.message || 'Something went wrong. Please try again.'
    if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
      errorMsg = payload.errors.map(e => e.msg || e.message).filter(Boolean).join('. ') || errorMsg
    }
    throw new Error(errorMsg)
  }
  return payload
}
