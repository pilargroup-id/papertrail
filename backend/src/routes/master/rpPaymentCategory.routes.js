const express = require('express');
const router = express.Router();

const RpPaymentCategoryController = require('../../controllers/master/rpPaymentCategory.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  RpPaymentCategoryController.index
);

router.get(
  '/:id',
  RpPaymentCategoryController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_RP_PAYMENT_CATEGORY', 'create'),
  RpPaymentCategoryController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_RP_PAYMENT_CATEGORY', 'update'),
  RpPaymentCategoryController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_RP_PAYMENT_CATEGORY', 'deactivate'),
  RpPaymentCategoryController.updateStatus
);

module.exports = router;