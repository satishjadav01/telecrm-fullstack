import { http } from '../../../services/http/client'

export const authApi = {
  login: async (identifier, password) => {
    return http.post('/api/auth/login', { identifier, password })
  },
  me: async () => {
    return http.get('/api/auth/me')
  },
}

