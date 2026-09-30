const AppError = require('../errors/app-error');
const { verifyAccessToken } = require('../utils/crypto');

const extractBearerToken = (authHeader = '') => {
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
};

const authenticate = (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError('Authorization token missing', 401);
    }

    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role || null,
      companyId: payload.companyId || null,
      permissions: payload.permissions || [],
    };

    next();
  } catch (error) {
    next(new AppError('Unauthorized', 401));
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!roles.length || roles.includes(req.user.role)) {
      return next();
    }

    return next(new AppError('Forbidden: insufficient role', 403));
  };
};

const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!requiredPermissions.length) return next();

    const userPermissions = new Set(req.user.permissions || []);
    const allowed = requiredPermissions.every((permission) => userPermissions.has(permission));

    if (!allowed) {
      return next(new AppError('Forbidden: insufficient permissions', 403));
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
  authorizePermissions,
};

