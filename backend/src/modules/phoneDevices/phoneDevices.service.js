const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');

const phoneDevicesEnabled = typeof prisma.phoneDevice?.findMany === 'function';

const toUniqueViolationMessage = (error) => {
  if (error?.code !== 'P2002') return null;
  const target = Array.isArray(error?.meta?.target)
    ? error.meta.target
    : typeof error?.meta?.target === 'string'
      ? [error.meta.target]
      : [];

  if (target.includes('imei')) return 'IMEI already exists';
  return 'Duplicate value already exists';
};

const ensurePhoneDevicesAvailable = () => {
  if (phoneDevicesEnabled) return;
  throw new AppError(
    'Phone device setup is not ready yet. Run backend Prisma migrate and generate, then refresh this page.',
    503
  );
};

const normalizeOptional = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? null : trimmed;
};

const includePhoneDevice = {
  assignee: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
};

const ensureAssignableAgent = async ({ assignedToUserId, companyId }) => {
  if (!assignedToUserId) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: assignedToUserId,
      companyId,
      isActive: true,
      role: { code: 'agent' },
    },
    select: { id: true },
  });

  if (!user) throw new AppError('Assigned user must be an active agent in this company', 400);
  return user;
};

const buildData = (payload = {}) => {
  const data = {};
  if (payload.label !== undefined) data.label = payload.label.trim();
  if (payload.imei !== undefined) data.imei = payload.imei.trim();
  if (payload.phoneNumber !== undefined) data.phoneNumber = normalizeOptional(payload.phoneNumber);
  if (payload.manufacturer !== undefined) data.manufacturer = normalizeOptional(payload.manufacturer);
  if (payload.model !== undefined) data.model = normalizeOptional(payload.model);
  if (payload.simNumber !== undefined) data.simNumber = normalizeOptional(payload.simNumber);
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);
  if (payload.assignedToUserId !== undefined) data.assignedToUserId = payload.assignedToUserId || null;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  return data;
};

const keepSinglePhoneAssignment = async ({ tx, companyId, assignedToUserId, excludeId = null }) => {
  if (!assignedToUserId) return;
  await tx.phoneDevice.updateMany({
    where: {
      companyId,
      assignedToUserId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    data: {
      assignedToUserId: null,
      updatedAt: new Date(),
    },
  });
};

const listPhoneDevices = async (query = {}, companyId) => {
  ensurePhoneDevicesAvailable();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = { companyId };
  if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const [items, total] = await Promise.all([
    prisma.phoneDevice.findMany({
      where,
      include: includePhoneDevice,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.phoneDevice.count({ where }),
  ]);

  return { items, page, limit, total };
};

const createPhoneDevice = async (payload, companyId) => {
  ensurePhoneDevicesAvailable();
  await ensureAssignableAgent({ assignedToUserId: payload.assignedToUserId, companyId });
  const data = buildData(payload);

  try {
    return await prisma.$transaction(async (tx) => {
      await keepSinglePhoneAssignment({
        tx,
        companyId,
        assignedToUserId: data.assignedToUserId || null,
      });

      return tx.phoneDevice.create({
        data: {
          companyId,
          ...data,
        },
        include: includePhoneDevice,
      });
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }
};

const updatePhoneDevice = async (id, payload, companyId) => {
  ensurePhoneDevicesAvailable();
  const existing = await prisma.phoneDevice.findFirst({
    where: { id, companyId },
    select: { id: true },
  });

  if (!existing) throw new AppError('Phone device not found', 404);

  if (payload.assignedToUserId !== undefined) {
    await ensureAssignableAgent({ assignedToUserId: payload.assignedToUserId, companyId });
  }

  const data = buildData(payload);

  try {
    return await prisma.$transaction(async (tx) => {
      await keepSinglePhoneAssignment({
        tx,
        companyId,
        assignedToUserId: data.assignedToUserId || null,
        excludeId: id,
      });

      return tx.phoneDevice.update({
        where: { id },
        data,
        include: includePhoneDevice,
      });
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }
};

module.exports = {
  listPhoneDevices,
  createPhoneDevice,
  updatePhoneDevice,
};
