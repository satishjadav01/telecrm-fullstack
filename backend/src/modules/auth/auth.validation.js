const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, 'identifier is required'),
    password: z.string().min(6, 'password must be at least 6 characters'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = {
  loginSchema,
};

