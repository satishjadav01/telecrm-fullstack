const { z } = require("zod");

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true" || value === "1") return true;
  if (value.toLowerCase() === "false" || value === "0") return false;
  return value;
}, z.boolean());

const callIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const leadIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const agentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      source: z.string().trim().optional(),
      search: z.string().trim().optional(),
      hasFilter: queryBooleanSchema.optional(),
    })
    .optional(),
  body: z.object({}).optional(),
});

const listRecordingsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    agentId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    source: z.string().trim().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    search: z.string().trim().optional(),
    hasFilter: queryBooleanSchema.optional(),
  }),
  body: z.object({}).optional(),
});

module.exports = {
  callIdSchema,
  leadIdSchema,
  agentIdSchema,
  listRecordingsSchema,
};
