const express = require('express');
const router = express.Router();

const RpDestinationDepartmentController = require('../../controllers/master/rpDestinationDepartment.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_RP_DESTINATION_DEPARTMENT', 'view'),
  RpDestinationDepartmentController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_RP_DESTINATION_DEPARTMENT', 'view'),
  RpDestinationDepartmentController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_RP_DESTINATION_DEPARTMENT', 'create'),
  RpDestinationDepartmentController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_RP_DESTINATION_DEPARTMENT', 'update'),
  RpDestinationDepartmentController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_RP_DESTINATION_DEPARTMENT', 'deactivate'),
  RpDestinationDepartmentController.updateStatus
);

module.exports = router;