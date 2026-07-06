const express = require('express');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');
const config = require('../../config');
const frpRoutes = require('./frp.routes');

const router = express.Router();

router.use(authenticate);
router.use(requireApp(config.app.slug));

router.use('/', frpRoutes);

module.exports = router;