const express = require('express');
const frpController = require('../../controllers/frp/frp.controller');
const frpAttachmentController = require('../../controllers/frp/frpAttachment.controller');
const { maxAttachmentFileSizeMb } = require('../../config/storage.config');

const router = express.Router();
const rawAttachmentUpload = express.raw({
  type: '*/*',
  limit: `${maxAttachmentFileSizeMb}mb`,
});

router.get('/', frpController.list);
router.get('/:id', frpController.detail);

router.post('/', frpController.create);
router.put('/:id', frpController.update);

router.post('/:id/attachments/sign-upload', frpAttachmentController.signUploadUrls);
router.post('/:id/attachments/confirm', frpAttachmentController.confirmUploads);
router.put(
  '/:id/attachments/:attachmentId/upload',
  rawAttachmentUpload,
  frpAttachmentController.uploadPendingAttachment
);
router.post('/:id/attachments/:attachmentId/cancel', frpAttachmentController.cancelUpload);
router.get('/:id/attachments/:attachmentId/download-url', frpAttachmentController.downloadUrl);

router.post('/:id/approve', frpController.approve);
router.post('/:id/reject', frpController.reject);
router.post('/:id/revert', frpController.revert);

module.exports = router;
