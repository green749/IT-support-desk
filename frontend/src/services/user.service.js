import { api } from './api'

export const userService = {
  list: (params = {}) => api(`/users?${new URLSearchParams(params)}`),
  get: (id) => api(`/users/${id}`),
  getCategories: (id) => api(`/users/${id}/categories`),
  update: (id, updates) => api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
}
