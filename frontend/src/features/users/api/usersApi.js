import { http } from '../../../services/http/client'

export const usersApi = {
  list: async ({ page = 1, limit = 20, roleCode, isActive } = {}) => {
    return http.get('/api/users', {
      query: {
        page,
        limit,
        roleCode: roleCode || undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    })
  },
  getById: async (id) => {
    return http.get(`/api/users/${id}`)
  },
  create: async (payload) => {
    return http.post('/api/users', payload)
  },
  update: async (id, payload) => {
    return http.put(`/api/users/${id}`, payload)
  },
}

