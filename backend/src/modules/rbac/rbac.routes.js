const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate, authorizeRoles } = require('../../core/middleware/auth.middleware');
const rbacController = require('./rbac.controller');
const {
  listSchema,
  roleIdParamsSchema,
  permissionIdParamsSchema,
  createRoleSchema,
  updateRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  setRolePermissionsSchema,
} = require('./rbac.validation');

router.use(authenticate, authorizeRoles('super_admin'));

router.get('/roles', validate(listSchema), rbacController.listRoles);
router.post('/roles', validate(createRoleSchema), rbacController.createRole);
router.put('/roles/:roleId', validate(updateRoleSchema), rbacController.updateRole);

router.get('/permissions', validate(listSchema), rbacController.listPermissions);
router.post('/permissions', validate(createPermissionSchema), rbacController.createPermission);
router.put('/permissions/:permissionId', validate(updatePermissionSchema), rbacController.updatePermission);

router.get('/roles/:roleId/permissions', validate(roleIdParamsSchema), rbacController.getRolePermissions);
router.put('/roles/:roleId/permissions', validate(setRolePermissionsSchema), rbacController.setRolePermissions);

module.exports = router;
