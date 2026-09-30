const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const { hashPassword } = require('../../core/utils/crypto');

const toUniqueViolationMessage = (error) => {
  if (error?.code !== 'P2002') return null;

  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];

  if (fields.includes('email')) return 'Email already exists';
  if (fields.includes('phone')) return 'Phone already exists';
  return 'Duplicate value already exists';
};

const baseInclude = {
  role: {
    select: { id: true, code: true, name: true },
  },
  company: {
    select: { id: true, code: true, name: true },
  },
  phoneDevicesAssigned: {
    where: { isActive: true },
    select: { id: true, label: true, imei: true, phoneNumber: true },
  },
};

const listUsers = async (query = {}, scope = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.roleCode) where.role = { code: query.roleCode };

  if (scope.isSuper) {
    if (query.companyId) where.companyId = query.companyId;
  } else {
    where.companyId = scope.companyId;
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: baseInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((u) => ({ ...u, passwordHash: undefined })),
    page,
    limit,
    total,
  };
};

const getUserById = async (id, scope = {}) => {
  const user = await prisma.user.findUnique({ where: { id }, include: baseInclude });
  if (!user) throw new AppError('User not found', 404);

  if (!scope.isSuper && user.companyId !== scope.companyId) {
    throw new AppError('User not found', 404);
  }

  return { ...user, passwordHash: undefined };
};

const resolveRoleId = async (roleCode) => {
  const role = await prisma.role.findFirst({ where: { code: roleCode, isActive: true }, select: { id: true } });
  if (!role) throw new AppError('Role not found', 400);
  return role.id;
};

const createUser = async (payload, scope = {}) => {
  if (payload.roleCode === 'super_admin') {
    throw new AppError('Forbidden', 403);
  }

  const roleId = await resolveRoleId(payload.roleCode);

  if (!payload.email && !payload.phone) {
    throw new AppError('Either email or phone is required', 400);
  }

  const passwordHash = await hashPassword(payload.password);

  const companyId = scope.isSuper ? (payload.companyId || null) : scope.companyId;
  if (!scope.isSuper && !companyId) {
    throw new AppError('Company not set for this user', 403);
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        companyId,
        fullName: payload.fullName,
        email: payload.email || null,
        phone: payload.phone || null,
        passwordHash,
        roleId,
        isActive: payload.isActive ?? true,
      },
      include: baseInclude,
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }

  return { ...user, passwordHash: undefined };
};

const updateUser = async (id, payload, scope = {}) => {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, companyId: true } });
  if (!existing) throw new AppError('User not found', 404);

  if (!scope.isSuper && existing.companyId !== scope.companyId) {
    throw new AppError('User not found', 404);
  }

  const data = {};
  if (payload.fullName !== undefined) data.fullName = payload.fullName;
  if (payload.email !== undefined) data.email = payload.email;
  if (payload.phone !== undefined) data.phone = payload.phone;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.roleCode !== undefined) data.roleId = await resolveRoleId(payload.roleCode);

  if (scope.isSuper && payload.companyId !== undefined) {
    if (payload.companyId === null) {
      data.companyId = null;
    } else {
      data.companyId = payload.companyId;
    }
  }

  let user;
  try {
    user = await prisma.user.update({ where: { id }, data, include: baseInclude });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }
  return { ...user, passwordHash: undefined };
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
};
