const express = require('express');
const router = express.Router();

const VendorBankAccountController = require('../../controllers/master/vendorBankAccount.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_VENDOR_BANK_ACCOUNT', 'view'),
  VendorBankAccountController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_VENDOR_BANK_ACCOUNT', 'view'),
  VendorBankAccountController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_VENDOR_BANK_ACCOUNT', 'create'),
  VendorBankAccountController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_VENDOR_BANK_ACCOUNT', 'update'),
  VendorBankAccountController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_VENDOR_BANK_ACCOUNT', 'deactivate'),
  VendorBankAccountController.updateStatus
);

module.exports = router;