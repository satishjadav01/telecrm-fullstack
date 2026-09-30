import { http } from '../../../services/http/client'

export const adminApi = {
  getMyCompany: async () => {
    return http.get('/api/super/companies/settings/my-company')
  },
  updateMyCompany: async (payload) => {
    return http.put('/api/super/companies/settings/my-company', payload)
  }
}
