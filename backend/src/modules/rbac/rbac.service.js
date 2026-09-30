const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');

const paginate = (query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const listRoles = async (query = {}) => {
  const { page, limit, skip } = paginate(query);

  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.role.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.role.count({ where }),
  ]);

  return { items, total, page, limit };
};

const createRole = async (payload) => {
  return prisma.role.create({
    data: {
      code: payload.code,
      name: payload.name,
      description: payload.description || null,
      isActive: payload.isActive ?? true,
    },
  });
};

const updateRole = async (roleId, payload) => {
  const existing = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!existing) throw new AppError('Role not found', 404);

  return prisma.role.update({
    where: { id: roleId },
    data: {
      name: payload.name ?? undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      isActive: payload.isActive ?? undefined,
    },
  });
};

const listPermissions = async (query = {}) => {
  const { page, limit, skip } = paginate(query);

  const where = {};
  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.permission.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.permission.count({ where }),
  ]);

  return { items, total, page, limit };
};

const createPermission = async (payload) => {
  return prisma.permission.create({
    data: {
      code: payload.code,
      name: payload.name,
      description: payload.description || null,
    },
  });
};

const updatePermission = async (permissionId, payload) => {
  const existing = await prisma.permission.findUnique({ where: { id: permissionId }, select: { id: true } });
  if (!existing) throw new AppError('Permission not found', 404);

  return prisma.permission.update({
    where: { id: permissionId },
    data: {
      name: payload.name ?? undefined,
      description: payload.description !== undefined ? payload.description : undefined,
    },
  });
};

const getRolePermissions = async (roleId) => {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, code: true, name: true } });
  if (!role) throw new AppError('Role not found', 404);

  const items = await prisma.rolePermission.findMany({
    where: { roleId },
    include: {
      permission: { select: { id: true, code: true, name: true, description: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    role,
    permissionIds: items.map((rp) => rp.permissionId),
    permissions: items.map((rp) => rp.permission),
  };
};

const setRolePermissions = async (roleId, permissionIds = []) => {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) throw new AppError('Role not found', 404);

  const uniqueIds = [...new Set(permissionIds)];
  const existingPerms = uniqueIds.length
    ? await prisma.permission.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } })
    : [];

  if (existingPerms.length !== uniqueIds.length) {
    throw new AppError('One or more permissions are invalid', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (uniqueIds.length) {
      await tx.rolePermission.createMany({
        data: uniqueIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  });

  return getRolePermissions(roleId);
};

module.exports = {
  listRoles,
  createRole,
  updateRole,
  listPermissions,
  createPermission,
  updatePermission,
  getRolePermissions,
  setRolePermissions,
};

