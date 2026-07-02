const express = require('express');
const router = express.Router();

const BankController = require('../../controllers/master/bank.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_BANK', 'view'),
  BankController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_BANK', 'view'),
  BankController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_BANK', 'create'),
  BankController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_BANK', 'update'),
  BankController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_BANK', 'deactivate'),
  BankController.updateStatus
);

module.exports = router;