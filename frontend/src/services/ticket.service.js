import { api } from './api'

export const ticketService = {
  list: (params = {}) => api(`/tickets?${new URLSearchParams(params)}`),
  get: (id) => api(`/tickets/${id}`),
  create: (ticket) => api('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  update: (id, changes) => api(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  remove: (id) => api(`/tickets/${id}`, { method: 'DELETE' }),
  assign: (id, agentId) => api(`/tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agentId }) }),
  getEligibleAgents: (id) => api(`/tickets/${id}/eligible-agents`),
  reply: (id, message, isInternal = false) => api(`/tickets/${id}/replies`, { method: 'POST', body: JSON.stringify({ message, isInternal }) }),
  resolve: (id, message) => api(`/tickets/${id}/resolve`, { method: 'POST', body: JSON.stringify({ message }) }),
}
