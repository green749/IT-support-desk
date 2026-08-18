const rawEnvUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '')
const API_URL = rawEnvUrl.endsWith('/api') ? rawEnvUrl : `${rawEnvUrl}/api`

let memoryCsrfToken = typeof window !== 'undefined' ? sessionStorage.getItem('csrfToken') || '' : ''
let memoryAccessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '' : ''

export function setAccessToken(token) {
  if (token) {
    memoryAccessToken = token
    try {
      localStorage.setItem('accessToken', token)
      sessionStorage.setItem('accessToken', token)
    } catch (e) {}
  } else {
    memoryAccessToken = ''
    try {
      localStorage.removeItem('accessToken')
      sessionStorage.removeItem('accessToken')
    } catch (e) {}
  }
}

export function getAccessToken() {
  if (memoryAccessToken) return memoryAccessToken
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || ''
  }
  return ''
}

export function setCsrfToken(token) {
  if (token) {
    memoryCsrfToken = token
    try {
      sessionStorage.setItem('csrfToken', token)
    } catch (e) {}
  } else {
    memoryCsrfToken = ''
    try {
      sessionStorage.removeItem('csrfToken')
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
 * Cookie-authenticated & Bearer token client.
 * Provides 100% reliability across standard browsing and Incognito mode (where 3rd-party cookies are blocked).
 */
export async function api(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const csrf = getCsrfToken()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrf) {
    headers['x-csrf-token'] = decodeURIComponent(csrf)
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${API_URL}${cleanPath}`, { ...options, method, headers, credentials: 'include' })
  if (response.status === 401 && !retried && !cleanPath.startsWith('/auth/refresh') && !cleanPath.startsWith('/auth/login') && !cleanPath.startsWith('/auth/register')) {
    const refreshHeaders = {
      ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: refreshHeaders,
    })
    if (refreshed.ok) {
      const refreshPayload = await refreshed.json().catch(() => ({}))
      if (refreshPayload?.csrfToken) setCsrfToken(refreshPayload.csrfToken)
      if (refreshPayload?.accessToken) setAccessToken(refreshPayload.accessToken)
      return api(path, options, true)
    } else {
      setAccessToken('')
      setCsrfToken('')
    }
  }

  const payload = await response.json().catch(() => ({}))
  if (payload?.csrfToken) {
    setCsrfToken(payload.csrfToken)
  }
  if (payload?.accessToken) {
    setAccessToken(payload.accessToken)
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
