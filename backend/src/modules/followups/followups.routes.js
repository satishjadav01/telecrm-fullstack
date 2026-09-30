const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate, authorizeRoles } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const followupsController = require('./followups.controller');
const {
  listFollowUpsSchema,
  listMyFollowUpsSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
} = require('./followups.validation');

router.get('/my', authenticate, requireCompanyContext, validate(listMyFollowUpsSchema), followupsController.listMyFollowUps);
router.get(
  '/',
  authenticate,
  requireCompanyContext,
  authorizeRoles('admin', 'manager', 'team_lead', 'super_admin'),
  validate(listFollowUpsSchema),
  followupsController.listFollowUps,
);
router.post('/', authenticate, requireCompanyContext, validate(createFollowUpSchema), followupsController.createFollowUp);
router.put('/:id', authenticate, requireCompanyContext, validate(updateFollowUpSchema), followupsController.updateFollowUp);

module.exports = router;
