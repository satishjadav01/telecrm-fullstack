const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const { hashPassword } = require('../../core/utils/crypto');

const toUniqueViolationMessage = (error) => {
  if (error?.code !== 'P2002') return null;

  const target = error?.meta?.target;
  const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];

  if (fields.includes('code')) return 'Company code already exists';
  if (fields.includes('email')) return 'Email already exists';
  if (fields.includes('phone')) return 'Phone already exists';
  return 'Duplicate value already exists';
};

const slugifyCompanyCode = (name = '') => {
  const base = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

  return base || `company-${Date.now()}`;
};

const listCompanies = async (query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  const companyIds = items.map((c) => c.id);
  const admins = companyIds.length
    ? await prisma.user.findMany({
        where: {
          companyId: { in: companyIds },
          role: { code: 'admin' },
        },
        select: {
          id: true,
          companyId: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const adminByCompanyId = new Map();
  for (const admin of admins) {
    if (!admin.companyId) continue;
    if (!adminByCompanyId.has(admin.companyId)) {
      adminByCompanyId.set(admin.companyId, admin);
    }
  }

  const normalizedItems = items.map((c) => {
    const admin = adminByCompanyId.get(c.id) || null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      hasAdmin: Boolean(admin),
      admin: admin
        ? {
            id: admin.id,
            fullName: admin.fullName,
            email: admin.email,
            phone: admin.phone,
            isActive: admin.isActive,
          }
        : null,
    };
  });

  return { items: normalizedItems, total, page, limit };
};

const createCompany = async (payload) => {
  const code = (payload.code || slugifyCompanyCode(payload.name)).toLowerCase();

  try {
    return await prisma.company.create({
      data: {
        name: payload.name,
        code,
        isActive: payload.isActive ?? true,
        shopifyAbandonedCartApiUrl: payload.shopifyAbandonedCartApiUrl || null,
      },
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }
};

const updateCompany = async (companyId, payload) => {
  await getCompanyById(companyId);

  try {
    return await prisma.company.update({
      where: { id: companyId },
      data: {
        name: payload.name,
        code: payload.code ? payload.code.toLowerCase() : undefined,
        isActive: payload.isActive,
        shopifyAbandonedCartApiUrl: payload.shopifyAbandonedCartApiUrl,
      },
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }
};

const getCompanyById = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError('Company not found', 404);
  return company;
};

const createCompanyAdmin = async (companyId, payload) => {
  await getCompanyById(companyId);

  if (!payload.email && !payload.phone) {
    throw new AppError('Either email or phone is required', 400);
  }

  const adminRole = await prisma.role.findFirst({
    where: { code: 'admin', isActive: true },
    select: { id: true },
  });
  if (!adminRole) throw new AppError('Admin role not found', 500);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      companyId,
      roleId: adminRole.id,
    },
    select: { id: true, isActive: true },
  });

  if (existingAdmin) {
    throw new AppError('Admin already exists for this company', 409);
  }

  const passwordHash = await hashPassword(payload.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        companyId,
        fullName: payload.fullName,
        email: payload.email || null,
        phone: payload.phone || null,
        passwordHash,
        roleId: adminRole.id,
        isActive: payload.isActive ?? true,
      },
      include: {
        role: { select: { id: true, code: true, name: true } },
        company: { select: { id: true, code: true, name: true } },
      },
    });
  } catch (error) {
    const message = toUniqueViolationMessage(error);
    if (message) throw new AppError(message, 409);
    throw error;
  }

  return { ...user, passwordHash: undefined };
};

const getCompanySettings = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      code: true,
      shopifyAbandonedCartApiUrl: true,
    },
  });
  if (!company) throw new AppError('Company not found', 404);
  return company;
};

const updateCompanySettings = async (companyId, payload) => {
  await getCompanyById(companyId);

  // For security, we only allow updating specific integration fields here
  return await prisma.company.update({
    where: { id: companyId },
    data: {
      shopifyAbandonedCartApiUrl: payload.shopifyAbandonedCartApiUrl,
    },
    select: {
      id: true,
      shopifyAbandonedCartApiUrl: true,
      updatedAt: true,
    },
  });
};

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  createCompanyAdmin,
  getCompanySettings,
  updateCompanySettings,
};
