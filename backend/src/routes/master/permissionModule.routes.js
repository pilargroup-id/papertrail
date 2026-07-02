const express = require('express');
const router = express.Router();

const PermissionModuleController = require('../../controllers/master/permissionModule.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_PERMISSION', 'view'),
  PermissionModuleController.index
);

module.exports = router;