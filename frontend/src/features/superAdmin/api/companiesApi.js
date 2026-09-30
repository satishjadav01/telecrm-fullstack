import { http } from "../../../services/http/client";

export const companiesApi = {
  list: async ({ page = 1, limit = 20, isActive, search } = {}) => {
    return http.get("/api/super/companies", {
      query: {
        page,
        limit,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        search: search || undefined,
      },
    });
  },
  create: async (payload) => {
    return http.post("/api/super/companies", payload);
  },
  update: async (id, payload) => {
    return http.put(`/api/super/companies/${id}`, payload);
  },
  createAdmin: async (companyId, payload) => {
    return http.post(`/api/super/companies/${companyId}/admin`, payload);
  },
};
