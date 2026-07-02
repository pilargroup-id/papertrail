const express = require('express');
const router = express.Router();

const VendorController = require('../../controllers/master/vendor.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_VENDOR', 'view'),
  VendorController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_VENDOR', 'view'),
  VendorController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_VENDOR', 'create'),
  VendorController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_VENDOR', 'update'),
  VendorController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_VENDOR', 'deactivate'),
  VendorController.updateStatus
);

module.exports = router;