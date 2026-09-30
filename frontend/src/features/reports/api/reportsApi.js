import { http } from '../../../services/http/client'

export const reportsApi = {
  agentPerformance: async ({ from, to, agentId, source } = {}) => {
    return http.get('/api/reports/agent-performance', {
      query: {
        from: from || undefined,
        to: to || undefined,
        agentId: agentId || undefined,
        source: source || undefined,
      },
    })
  },
  conversionFunnel: async ({ from, to, agentId, source } = {}) => {
    return http.get('/api/reports/conversion-funnel', {
      query: {
        from: from || undefined,
        to: to || undefined,
        agentId: agentId || undefined,
        source: source || undefined,
      },
    })
  },
  dashboardSummary: async ({ from, to, calendarMonth, agentId, source } = {}) => {
    return http.get('/api/reports/dashboard-summary', {
      query: {
        from: from || undefined,
        to: to || undefined,
        calendarMonth: calendarMonth || undefined,
        agentId: agentId || undefined,
        source: source || undefined,
      },
    })
  },
  filterOptions: async () => {
    return http.get('/api/reports/filter-options')
  },
  calendar: async ({ from, to, agentId } = {}) => {
    return http.get('/api/reports/calendar', {
      query: {
        from: from || undefined,
        to: to || undefined,
        agentId: agentId || undefined,
      },
    })
  },
}
