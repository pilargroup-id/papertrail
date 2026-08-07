const express = require('express');
const router = express.Router();

const BudgetAccessRuleController = require('../../controllers/master/budgetAccessRule.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  BudgetAccessRuleController.index
);

router.get(
  '/:id',
  BudgetAccessRuleController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_BUDGET_ACCESS_RULE', 'create'),
  BudgetAccessRuleController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_BUDGET_ACCESS_RULE', 'update'),
  BudgetAccessRuleController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_BUDGET_ACCESS_RULE', 'deactivate'),
  BudgetAccessRuleController.updateStatus
);

router.delete(
  '/:id',
  requireModulePermission('MASTER_BUDGET_ACCESS_RULE', 'deactivate'),
  BudgetAccessRuleController.destroy
);

module.exports = router;
