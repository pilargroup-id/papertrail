const express = require('express');
const router = express.Router();

const PaymentMethodController = require('../../controllers/master/paymentMethod.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_PAYMENT_METHOD', 'view'),
  PaymentMethodController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_PAYMENT_METHOD', 'view'),
  PaymentMethodController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_PAYMENT_METHOD', 'create'),
  PaymentMethodController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_PAYMENT_METHOD', 'update'),
  PaymentMethodController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_PAYMENT_METHOD', 'deactivate'),
  PaymentMethodController.updateStatus
);

module.exports = router;