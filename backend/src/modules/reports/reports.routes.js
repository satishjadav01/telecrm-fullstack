const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const reportsController = require('./reports.controller');
const { reportsQuerySchema } = require('./reports.validation');

router.get(
  '/agent-performance',
  authenticate,
  requireCompanyContext,
  validate(reportsQuerySchema),
  reportsController.getAgentPerformance
);

router.get(
  '/conversion-funnel',
  authenticate,
  requireCompanyContext,
  validate(reportsQuerySchema),
  reportsController.getConversionFunnel
);

router.get(
  '/filter-options',
  authenticate,
  requireCompanyContext,
  reportsController.getFilterOptions
);

router.get(
  '/calendar',
  authenticate,
  requireCompanyContext,
  validate(reportsQuerySchema),
  reportsController.getCalendarData
);

router.get(
  '/dashboard-summary',
  authenticate,
  requireCompanyContext,
  validate(reportsQuerySchema),
  reportsController.getDashboardSummary
);

module.exports = router;

