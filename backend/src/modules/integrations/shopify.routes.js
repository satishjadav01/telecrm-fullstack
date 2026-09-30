const express = require('express');
const { syncCheckouts, getCheckouts, importCheckout } = require('./shopify.controller');
const { authenticate } = require('../../core/middleware/auth.middleware');

const router = express.Router();

router.post('/sync' , authenticate, syncCheckouts);
router.get('/checkouts', authenticate, getCheckouts);
router.post('/import-checkout', authenticate, importCheckout);

module.exports = router;

