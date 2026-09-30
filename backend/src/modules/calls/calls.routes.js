const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const callsController = require('./calls.controller');
const {
  startCallSchema,
  callDispositionSchema,
  listCallsSchema,
  callsSummarySchema,
} = require('./calls.validation');

router.get('/', authenticate, requireCompanyContext, validate(listCallsSchema), callsController.listCalls);
router.get('/summary', authenticate, requireCompanyContext, validate(callsSummarySchema), callsController.getCallsSummary);
router.post('/start', authenticate, requireCompanyContext, validate(startCallSchema), callsController.startCall);
router.post('/:id/disposition', authenticate, requireCompanyContext, validate(callDispositionSchema), callsController.applyDisposition);

module.exports = router;

