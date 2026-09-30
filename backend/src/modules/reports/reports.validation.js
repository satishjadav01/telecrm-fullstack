const { z } = require('zod');

const reportsQuerySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    calendarMonth: z.coerce.date().optional(),
    agentId: z.string().uuid().optional(),
    source: z.string().optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = {
  reportsQuerySchema,
};
