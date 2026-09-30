const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate, authorizeRoles } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const phoneDevicesController = require('./phoneDevices.controller');
const {
  listPhoneDevicesSchema,
  createPhoneDeviceSchema,
  updatePhoneDeviceSchema,
} = require('./phoneDevices.validation');

router.get(
  '/',
  authenticate,
  requireCompanyContext,
  authorizeRoles('admin', 'manager'),
  validate(listPhoneDevicesSchema),
  phoneDevicesController.listPhoneDevices
);

router.post(
  '/',
  authenticate,
  requireCompanyContext,
  authorizeRoles('admin', 'manager'),
  validate(createPhoneDeviceSchema),
  phoneDevicesController.createPhoneDevice
);

router.put(
  '/:id',
  authenticate,
  requireCompanyContext,
  authorizeRoles('admin', 'manager'),
  validate(updatePhoneDeviceSchema),
  phoneDevicesController.updatePhoneDevice
);

module.exports = router;
