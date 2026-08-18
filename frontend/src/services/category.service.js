import { api } from './api'

export const categoryService = {
  list: () => api('/categories'),
}
