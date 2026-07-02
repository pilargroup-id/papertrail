const express = require('express');
const router = express.Router();

const RpCheckerRuleController = require('../../controllers/master/rpCheckerRule.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_RP_CHECKER_RULE', 'view'),
  RpCheckerRuleController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_RP_CHECKER_RULE', 'view'),
  RpCheckerRuleController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_RP_CHECKER_RULE', 'create'),
  RpCheckerRuleController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_RP_CHECKER_RULE', 'update'),
  RpCheckerRuleController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_RP_CHECKER_RULE', 'deactivate'),
  RpCheckerRuleController.updateStatus
);

module.exports = router;