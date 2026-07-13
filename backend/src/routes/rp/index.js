const express = require('express');
const router = express.Router();

const config = require('../../config');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.use(requireApp(config.app.slug));

router.use('/', require('./rp.routes'));

module.exports = router;
