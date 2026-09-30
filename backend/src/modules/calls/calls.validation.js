const { z } = require('zod');

const callDirectionEnum = z.enum(['inbound', 'outbound']);
const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true' || value === '1') return true;
  if (value.toLowerCase() === 'false' || value === '0') return false;
  return value;
}, z.boolean());
const callDispositionEnum = z.enum([
  'no_answer',
  'busy',
  'interested',
  'not_interested',
  'callback',
  'converted',
]);

const callIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const startCallSchema = z.object({
  body: z.object({
    leadId: z.string().uuid(),
    direction: callDirectionEnum.optional(),
    startedAt: z.coerce.date().optional(),
    notes: z.string().trim().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const callDispositionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    disposition: callDispositionEnum,
    notes: z.string().trim().optional(),
    endedAt: z.coerce.date().optional(),
    followUpRequired: z.boolean().optional(),
    followUpAt: z.coerce.date().optional(),
    followUpReason: z.string().trim().optional(),
    followUpPriority: z.number().int().min(1).max(5).optional(),
  }),
  query: z.object({}).optional(),
});

const listCallsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    disposition: callDispositionEnum.optional(),
    direction: callDirectionEnum.optional(),
    leadId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    phoneDeviceId: z.string().uuid().optional(),
    source: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    hasFilter: queryBooleanSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const callsSummarySchema = z.object({
  query: z.object({
    disposition: callDispositionEnum.optional(),
    direction: callDirectionEnum.optional(),
    leadId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    phoneDeviceId: z.string().uuid().optional(),
    source: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    hasFilter: queryBooleanSchema.optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = {
  callIdParamSchema,
  startCallSchema,
  callDispositionSchema,
  listCallsSchema,
  callsSummarySchema,
};
