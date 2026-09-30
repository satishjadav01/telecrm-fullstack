const { z } = require('zod');

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    roleCode: z.string().trim().optional(),
    isActive: z.coerce.boolean().optional(),
    companyId: z.string().uuid().optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const userIdParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2),
    email: z.string().email().optional(),
    phone: z.string().trim().min(5).optional(),
    password: z.string().min(6),
    roleCode: z.string().trim().min(2),
    companyId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().trim().min(2).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().trim().min(5).nullable().optional(),
    roleCode: z.string().trim().min(2).optional(),
    companyId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  listUsersSchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
};
