const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate, authorizeRoles } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const recordingsController = require('./recordings.controller');
const { uploadRecording } = require('./storage');
const {
  callIdSchema,
  leadIdSchema,
  agentIdSchema,
  listRecordingsSchema,
} = require('./recordings.validation');

router.get(
  '/recordings',
  authenticate,
  requireCompanyContext,
  authorizeRoles('admin', 'manager', 'team_lead', 'super_admin'),
  validate(listRecordingsSchema),
  recordingsController.listRecordings,
);

router.post(
  '/calls/:id/recording-upload',
  authenticate,
  requireCompanyContext,
  validate(callIdSchema),
  uploadRecording.single('recording'),
  recordingsController.uploadRecording,
);

router.get('/calls/:id/recording', authenticate, requireCompanyContext, validate(callIdSchema), recordingsController.getCallRecording);
router.get('/calls/:id/recording-file', authenticate, requireCompanyContext, validate(callIdSchema), recordingsController.streamCallRecording);
router.get('/leads/:id/recordings', authenticate, requireCompanyContext, validate(leadIdSchema), recordingsController.listLeadRecordings);
router.get('/agents/:id/recordings', authenticate, requireCompanyContext, validate(agentIdSchema), recordingsController.listAgentRecordings);

module.exports = router;