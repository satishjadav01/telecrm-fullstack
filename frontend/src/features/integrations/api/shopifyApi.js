import { http } from '../../../services/http/client'

export const shopifyApi = {
  syncAbandonedCheckouts: async ({ startDate, endDate } = {}) => {
    const data = await http.post('/api/integrations/shopify/sync', {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
    return data?.data || data
  },
  getAbandonedCheckouts: async () => {
    return http.get('/api/integrations/shopify/checkouts', { timeoutMs: 8000 })
  },
  importCheckout: async (checkoutData) => {
    return http.post('/api/integrations/shopify/import-checkout', checkoutData)
  },
}
