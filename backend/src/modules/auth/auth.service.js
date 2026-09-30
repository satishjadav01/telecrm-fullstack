const prisma = require('../../config/db');
const AppError = require('../../core/errors/app-error');
const { comparePassword, signAccessToken, signRefreshToken } = require('../../core/utils/crypto');

const toSafeUser = (user) => {
  const permissions = user.role.rolePermission.map((item) => item.permission.code);

  return {
    id: user.id,
    companyId: user.companyId || null,
    company: user.company
      ? { id: user.company.id, code: user.company.code, name: user.company.name }
      : null,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: {
      code: user.role.code,
      name: user.role.name,
    },
    permissions,
  };
};

const login = async ({ identifier, password }) => {
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ email: identifier }, { phone: identifier }],
    },
    include: {
      company: { select: { id: true, code: true, name: true } },
      role: {
        include: {
          rolePermission: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const safeUser = toSafeUser(user);

  const accessToken = signAccessToken({
    sub: safeUser.id,
    companyId: safeUser.companyId,
    role: safeUser.role.code,
    permissions: safeUser.permissions,
  });

  const refreshToken = signRefreshToken({
    sub: safeUser.id,
    role: safeUser.role.code,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: safeUser,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

const getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: { select: { id: true, code: true, name: true } },
      role: {
        include: {
          rolePermission: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  return toSafeUser(user);
};

module.exports = {
  login,
  getMyProfile,
};

