const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate, authorizeRoles } = require('../../core/middleware/auth.middleware');
const companiesController = require('./companies.controller');
const {
  listCompaniesSchema,
  createCompanySchema,
  updateCompanySchema,
  createCompanyAdminSchema,
  updateMyCompanySettingsSchema,
} = require('./companies.validation');

router.get('/', authenticate, authorizeRoles('super_admin'), validate(listCompaniesSchema), companiesController.listCompanies);
router.post('/', authenticate, authorizeRoles('super_admin'), validate(createCompanySchema), companiesController.createCompany);
router.put('/:companyId', authenticate, authorizeRoles('super_admin'), validate(updateCompanySchema), companiesController.updateCompany);
router.post(
  '/:companyId/admin',
  authenticate,
  authorizeRoles('super_admin'),
  validate(createCompanyAdminSchema),
  companiesController.createCompanyAdmin
);

router.get('/settings/my-company', authenticate, authorizeRoles('admin', 'manager'), companiesController.getMyCompanySettings);
router.put('/settings/my-company', authenticate, authorizeRoles('admin'), validate(updateMyCompanySettingsSchema), companiesController.updateMyCompanySettings);

module.exports = router;
