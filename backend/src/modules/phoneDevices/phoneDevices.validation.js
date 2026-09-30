const { z } = require('zod');

const optionalTrimmedString = (max) => z.string().trim().max(max).optional().or(z.literal(''));

const phoneDeviceIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const listPhoneDevicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    assignedToUserId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const phoneDeviceBodySchema = z.object({
  label: z.string().trim().min(1).max(120),
  imei: z.string().trim().min(5).max(40),
  phoneNumber: optionalTrimmedString(20),
  manufacturer: optionalTrimmedString(80),
  model: optionalTrimmedString(80),
  simNumber: optionalTrimmedString(40),
  notes: z.string().trim().optional().or(z.literal('')),
  assignedToUserId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const createPhoneDeviceSchema = z.object({
  body: phoneDeviceBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updatePhoneDeviceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: phoneDeviceBodySchema.partial(),
  query: z.object({}).optional(),
});

module.exports = {
  phoneDeviceIdParamsSchema,
  listPhoneDevicesSchema,
  createPhoneDeviceSchema,
  updatePhoneDeviceSchema,
};
