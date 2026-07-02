const express = require('express');
const router = express.Router();

const BudgetTypeController = require('../../controllers/master/budgetType.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_BUDGET_TYPE', 'view'),
  BudgetTypeController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_BUDGET_TYPE', 'view'),
  BudgetTypeController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_BUDGET_TYPE', 'create'),
  BudgetTypeController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_BUDGET_TYPE', 'update'),
  BudgetTypeController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_BUDGET_TYPE', 'deactivate'),
  BudgetTypeController.updateStatus
);

module.exports = router;