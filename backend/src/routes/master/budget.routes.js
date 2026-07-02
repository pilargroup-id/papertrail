const express = require('express');
const router = express.Router();

const BudgetController = require('../../controllers/master/budget.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_BUDGET', 'view'),
  BudgetController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_BUDGET', 'view'),
  BudgetController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_BUDGET', 'create'),
  BudgetController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_BUDGET', 'update'),
  BudgetController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_BUDGET', 'deactivate'),
  BudgetController.updateStatus
);

module.exports = router;