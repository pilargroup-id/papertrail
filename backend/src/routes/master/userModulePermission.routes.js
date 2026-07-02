const express = require('express');
const router = express.Router();

const UserModulePermissionController = require('../../controllers/master/userModulePermission.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_PERMISSION', 'view'),
  UserModulePermissionController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_PERMISSION', 'view'),
  UserModulePermissionController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_PERMISSION', 'create'),
  UserModulePermissionController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_PERMISSION', 'update'),
  UserModulePermissionController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_PERMISSION', 'deactivate'),
  UserModulePermissionController.updateStatus
);

module.exports = router;