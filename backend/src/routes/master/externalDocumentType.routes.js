const express = require('express');
const router = express.Router();

const ExternalDocumentTypeController = require('../../controllers/master/externalDocumentType.controller');
const { requireModulePermission } = require('../../middleware/modulePermission.middleware');

router.get(
  '/',
  ExternalDocumentTypeController.index
);

router.get(
  '/:id',
  ExternalDocumentTypeController.show
);

router.post(
  '/',
  requireModulePermission('MASTER_EXTERNAL_DOCUMENT_TYPE', 'create'),
  ExternalDocumentTypeController.store
);

router.put(
  '/:id',
  requireModulePermission('MASTER_EXTERNAL_DOCUMENT_TYPE', 'update'),
  ExternalDocumentTypeController.update
);

router.patch(
  '/:id/status',
  requireModulePermission('MASTER_EXTERNAL_DOCUMENT_TYPE', 'deactivate'),
  ExternalDocumentTypeController.updateStatus
);

module.exports = router;