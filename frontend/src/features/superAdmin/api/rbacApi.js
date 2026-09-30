import { http } from '../../../services/http/client'

export const rbacApi = {
  listRoles: async ({ page = 1, limit = 50, search, isActive } = {}) => {
    return http.get('/api/super/rbac/roles', {
      query: {
        page,
        limit,
        search: search || undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    })
  },
  createRole: async (payload) => http.post('/api/super/rbac/roles', payload),
  updateRole: async (roleId, payload) => http.put(`/api/super/rbac/roles/${roleId}`, payload),

  listPermissions: async ({ page = 1, limit = 200, search } = {}) => {
    return http.get('/api/super/rbac/permissions', {
      query: {
        page,
        limit,
        search: search || undefined,
      },
    })
  },
  createPermission: async (payload) => http.post('/api/super/rbac/permissions', payload),
  updatePermission: async (permissionId, payload) =>
    http.put(`/api/super/rbac/permissions/${permissionId}`, payload),

  getRolePermissions: async (roleId) => http.get(`/api/super/rbac/roles/${roleId}/permissions`),
  setRolePermissions: async (roleId, permissionIds) =>
    http.put(`/api/super/rbac/roles/${roleId}/permissions`, { permissionIds }),
}

