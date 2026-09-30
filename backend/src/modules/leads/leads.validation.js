const { z } = require('zod');

const leadStageEnum = z.enum(['new', 'attempted', 'connected', 'follow_up', 'converted', 'dropped']);
const assignmentModeEnum = z.enum(['none', 'manual', 'round_robin']);
const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true' || value === '1') return true;
  if (value.toLowerCase() === 'false' || value === '0') return false;
  return value;
}, z.boolean());

const listLeadsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    stage: leadStageEnum.optional(),
    assignedTo: z.string().uuid().optional(),
    source: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    hasFilter: queryBooleanSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const listAgentQueueSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    hasFilter: queryBooleanSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const leadIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phonePrimary: z.string().trim().min(5),
    phoneAlternate: z.string().trim().optional(),
    email: z.string().email().optional(),
    source: z.string().trim().optional(),
    city: z.string().trim().optional(),
    stage: leadStageEnum.optional(),
    priority: z.number().int().min(1).max(5).optional(),
    notes: z.string().trim().optional(),
    assignmentMode: assignmentModeEnum.optional(),
    assignedTo: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phonePrimary: z.string().trim().min(5).optional(),
    phoneAlternate: z.string().trim().optional(),
    email: z.string().email().optional(),
    source: z.string().trim().optional(),
    city: z.string().trim().optional(),
    stage: leadStageEnum.optional(),
    priority: z.number().int().min(1).max(5).optional(),
    notes: z.string().trim().optional(),
    assignmentMode: assignmentModeEnum.optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
});

const importLeadsExcelSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const assignImportedLeadsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    leadIds: z.array(z.string().uuid()).min(1),
    agentId: z.string().uuid(),
    onlyUnassigned: z.boolean().optional(),
  }),
});

module.exports = {
  listLeadsSchema,
  leadIdParamsSchema,
  createLeadSchema,
  updateLeadSchema,
  importLeadsExcelSchema,
  assignImportedLeadsSchema,
  listAgentQueueSchema,
};

