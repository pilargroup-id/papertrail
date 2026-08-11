const express = require('express');
const router = express.Router();

const config = require('../../config');
const LogController = require('../../controllers/logs/log.controller');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.use(requireApp(config.app.slug));

router.get('/activities', LogController.activityLogs);
router.get('/budget-usages', LogController.budgetUsageLogs);

module.exports = router;
