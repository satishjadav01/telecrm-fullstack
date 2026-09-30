const AppError = require('../errors/app-error');

const requireCompanyContext = (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401));

  if (req.user.role === 'super_admin') return next();

  if (!req.user.companyId) {
    return next(new AppError('Company not set for this user', 403));
  }

  return next();
};

module.exports = {
  requireCompanyContext,
};

