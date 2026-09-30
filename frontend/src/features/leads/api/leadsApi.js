import { http } from "../../../services/http/client";

export const leadsApi = {
  list: async ({
    page = 1,
    limit = 20,
    search,
    stage,
    assignedTo,
    source,
    from,
    to,
    hasFilter,
  } = {}) => {
    return http.get("/api/leads", {
      query: {
        page,
        limit,
        search: search || undefined,
        stage: stage || undefined,
        assignedTo: assignedTo || undefined,
        source: source || undefined,
        from: from || undefined,
        to: to || undefined,
        hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
      },
    });
  },
  getById: async (id) => {
    return http.get(`/api/leads/${id}`);
  },
  create: async (payload) => {
    return http.post("/api/leads", payload);
  },
  update: async (id, payload) => {
    return http.put(`/api/leads/${id}`, payload);
  },
  delete: async (id) => {
    return http.del(`/api/leads/${id}`);
  },
  importExcel: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return http.post("/api/leads/import-excel", formData);
  },
  assignImported: async ({ leadIds, agentId, onlyUnassigned = true }) => {
    return http.post("/api/leads/assign-imported", {
      leadIds,
      agentId,
      onlyUnassigned,
    });
  },
  searchByPhone: async (phone) => {
    return http.get("/api/leads/search-by-phone", { query: { phone } });
  },
};
