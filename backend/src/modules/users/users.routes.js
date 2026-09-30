const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate } = require('../../core/middleware/auth.middleware');
const { requireCompanyContext } = require('../../core/middleware/tenant.middleware');
const usersController = require('./users.controller');
const {
  listUsersSchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
} = require('./users.validation');

router.get('/', authenticate, requireCompanyContext, validate(listUsersSchema), usersController.listUsers);
router.post('/', authenticate, requireCompanyContext, validate(createUserSchema), usersController.createUser);
router.get('/:id', authenticate, requireCompanyContext, validate(userIdParamsSchema), usersController.getUserById);
router.put('/:id', authenticate, requireCompanyContext, validate(updateUserSchema), usersController.updateUser);

module.exports = router;
