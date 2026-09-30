const prisma = require('../../config/db');

const METHODS_TO_AUDIT = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

module.exports = async (req, res, next) => {
  if (!METHODS_TO_AUDIT.has(req.method) || !req.path.startsWith('/api')) {
    return next();
  }

  res.on('finish', async () => {
    try {
      if (res.statusCode >= 500) return;

      await prisma.auditLog.create({
        data: {
          actorUserId: req.user?.id || null,
          entityName: req.baseUrl || req.path,
          action: req.method,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          newData: req.body || null,
        },
      });
    } catch (_) {
      // Never block request lifecycle for audit write failures.
    }
  });

  return next();
};
