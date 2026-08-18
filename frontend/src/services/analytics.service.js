import { api } from './api'

export const analyticsService = {
  dashboard: () => api('/analytics/dashboard'),
}
