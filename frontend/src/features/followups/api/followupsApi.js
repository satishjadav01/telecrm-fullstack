import { http } from '../../../services/http/client'

const listQuery = ({ page = 1, limit = 20, status, from, to, assignedTo, leadId, source, search, hasFilter } = {}) => ({
  page,
  limit,
  status: status || undefined,
  from: from || undefined,
  to: to || undefined,
  assignedTo: assignedTo || undefined,
  leadId: leadId || undefined,
  source: source || undefined,
  search: search || undefined,
  hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
})

export const followupsApi = {
  list: async (params = {}) => {
    return http.get('/api/follow-ups/my', {
      query: listQuery(params),
    })
  },
  listMy: async (params = {}) => {
    return http.get('/api/follow-ups/my', {
      query: listQuery(params),
    })
  },
  create: async (payload) => {
    return http.post('/api/follow-ups', payload)
  },
  update: async (id, payload) => {
    return http.put(`/api/follow-ups/${id}`, payload)
  },
}