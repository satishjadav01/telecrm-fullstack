import { http } from '../../../services/http/client'

export const callsApi = {
  agentQueue: async ({ page = 1, limit = 50, from, to, hasFilter } = {}) => {
    return http.get('/api/leads/agent-queue', {
      query: {
        page,
        limit,
        from: from || undefined,
        to: to || undefined,
        hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
      },
    })
  },
  list: async ({ page = 1, limit = 20, disposition, direction, leadId, agentId, phoneDeviceId, source, from, to, hasFilter } = {}) => {
    return http.get('/api/calls', {
      query: {
        page,
        limit,
        disposition: disposition || undefined,
        direction: direction || undefined,
        leadId: leadId || undefined,
        agentId: agentId || undefined,
        phoneDeviceId: phoneDeviceId || undefined,
        source: source || undefined,
        from: from || undefined,
        to: to || undefined,
        hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
      },
    })
  },
  summary: async ({ disposition, direction, leadId, agentId, phoneDeviceId, source, from, to, hasFilter } = {}) => {
    return http.get('/api/calls/summary', {
      query: {
        disposition: disposition || undefined,
        direction: direction || undefined,
        leadId: leadId || undefined,
        agentId: agentId || undefined,
        phoneDeviceId: phoneDeviceId || undefined,
        source: source || undefined,
        from: from || undefined,
        to: to || undefined,
        hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
      },
    })
  },
  start: async ({ leadId, direction = 'outbound', startedAt, notes } = {}) => {
    return http.post('/api/calls/start', {
      leadId,
      direction,
      startedAt: startedAt || undefined,
      notes: notes || undefined,
    })
  },
  applyDisposition: async (callId, payload) => {
    return http.post(`/api/calls/${callId}/disposition`, payload)
  },
}
