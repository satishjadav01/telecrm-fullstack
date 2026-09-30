const { z } = require('zod');

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
    search: z.string().trim().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const roleIdParamsSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const permissionIdParamsSchema = z.object({
  params: z.object({ permissionId: z.string().uuid() }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const createRoleSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_]+$/i, 'code must be alphanumeric and may include _'),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateRoleSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
});

const createPermissionSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(100),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updatePermissionSchema = z.object({
  params: z.object({ permissionId: z.string().uuid() }),
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  }),
  query: z.object({}).optional(),
});

const setRolePermissionsSchema = z.object({
  params: z.object({ roleId: z.string().uuid() }),
  body: z.object({
    permissionIds: z.array(z.string().uuid()).default([]),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  listSchema,
  roleIdParamsSchema,
  createRoleSchema,
  updateRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  setRolePermissionsSchema,
};
