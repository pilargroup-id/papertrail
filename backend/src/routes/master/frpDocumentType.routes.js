const express = require('express');
const router = express.Router();

const FrpDocumentTypeController = require('../../controllers/master/frpDocumentType.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  requireModulePermission('MASTER_FRP_DOCUMENT_TYPE', 'view'),
  FrpDocumentTypeController.index
);

router.get(
  '/:id',
  requireModulePermission('MASTER_FRP_DOCUMENT_TYPE', 'view'),
  FrpDocumentTypeController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_FRP_DOCUMENT_TYPE', 'create'),
  FrpDocumentTypeController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_FRP_DOCUMENT_TYPE', 'update'),
  FrpDocumentTypeController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_FRP_DOCUMENT_TYPE', 'deactivate'),
  FrpDocumentTypeController.updateStatus
);

module.exports = router;