const { z } = require('zod');

const followUpStatusEnum = z.enum(['pending', 'completed', 'cancelled', 'overdue']);
const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true' || value === '1') return true;
  if (value.toLowerCase() === 'false' || value === '0') return false;
  return value;
}, z.boolean());

const baseListFollowUpsQuerySchema = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: followUpStatusEnum.optional(),
  leadId: z.string().uuid().optional(),
  source: z.string().trim().optional(),
  search: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  hasFilter: queryBooleanSchema.optional(),
};

const listFollowUpsSchema = z.object({
  query: z.object({
    ...baseListFollowUpsQuerySchema,
    assignedTo: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const listMyFollowUpsSchema = z.object({
  query: z.object(baseListFollowUpsQuerySchema),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const createFollowUpSchema = z.object({
  body: z.object({
    leadId: z.string().uuid(),
    assignedTo: z.string().uuid().optional(),
    callId: z.string().uuid().optional(),
    dueAt: z.coerce.date(),
    reminderAt: z.coerce.date().optional(),
    reason: z.string().trim().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    note: z.string().trim().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    assignedTo: z.string().uuid().optional(),
    dueAt: z.coerce.date().optional(),
    reminderAt: z.coerce.date().nullable().optional(),
    reason: z.string().trim().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    note: z.string().trim().optional(),
    status: followUpStatusEnum.optional(),
    completedAt: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  listFollowUpsSchema,
  listMyFollowUpsSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
};