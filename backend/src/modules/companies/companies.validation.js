const { z } = require('zod');

const listCompaniesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    isActive: z.coerce.boolean().optional(),
    search: z.string().trim().optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const companyIdParamsSchema = z.object({
  params: z.object({ companyId: z.string().uuid() }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const createCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9_-]+$/i, 'code must be alphanumeric and may include _ or -')
      .optional(),
    shopifyAbandonedCartApiUrl: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateCompanySchema = z.object({
  params: z.object({ companyId: z.string().uuid() }),
  body: z.object({
    name: z.string().trim().min(2),
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9_-]+$/i, 'code must be alphanumeric and may include _ or -')
      .optional(),
    shopifyAbandonedCartApiUrl: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
});

const createCompanyAdminSchema = z.object({
  params: z.object({ companyId: z.string().uuid() }),
  body: z.object({
    fullName: z.string().trim().min(2),
    email: z.string().email().optional(),
    phone: z.string().trim().min(5).optional(),
    password: z.string().min(6),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
});

const updateMyCompanySettingsSchema = z.object({
  body: z.object({
    shopifyAbandonedCartApiUrl: z.string().trim().max(500).optional().nullable(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  listCompaniesSchema,
  companyIdParamsSchema,
  createCompanySchema,
  updateCompanySchema,
  createCompanyAdminSchema,
  updateMyCompanySettingsSchema,
};

