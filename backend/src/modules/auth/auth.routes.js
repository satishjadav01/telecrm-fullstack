const router = require('express').Router();

const validate = require('../../core/middleware/validate.middleware');
const { authenticate } = require('../../core/middleware/auth.middleware');
const authController = require('./auth.controller');
const { loginSchema } = require('./auth.validation');

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;

