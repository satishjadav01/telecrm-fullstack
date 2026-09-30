import { http } from '../../../services/http/client'

export const phoneDevicesApi = {
  list: async ({ page = 1, limit = 50, assignedToUserId, isActive } = {}) => {
    return http.get('/api/phone-devices', {
      query: {
        page,
        limit,
        assignedToUserId: assignedToUserId || undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    })
  },
  create: async (payload) => {
    return http.post('/api/phone-devices', payload)
  },
  update: async (id, payload) => {
    return http.put(`/api/phone-devices/${id}`, payload)
  },
}
