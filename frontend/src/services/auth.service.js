import { api } from './api'

export const authService = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => api('/auth/me'),
  updateProfile: (profile) => api('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  logout: () => api('/auth/logout', { method: 'POST' }),
}
