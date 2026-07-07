const R = require('../../utils/response.util');
const frpAttachmentService = require('../../services/frp/frpAttachment.service');

async function signUploadUrls(req, res, next) {
  try {
    const result = await frpAttachmentService.signUploadUrls(
      req.params.id,
      req.body,
      req.user
    );

    return R.ok(res, result, 'FRP attachment upload URLs generated');
  } catch (error) {
    next(error);
  }
}

async function confirmUploads(req, res, next) {
  try {
    const result = await frpAttachmentService.confirmUploads(
      req.params.id,
      req.body,
      req.user
    );

    return R.ok(res, result, 'FRP attachments confirmed');
  } catch (error) {
    next(error);
  }
}

async function cancelUpload(req, res, next) {
  try {
    const result = await frpAttachmentService.cancelUpload(
      req.params.id,
      req.params.attachmentId,
      req.user
    );

    return R.ok(res, result, 'FRP attachment canceled');
  } catch (error) {
    next(error);
  }
}

async function downloadUrl(req, res, next) {
  try {
    const result = await frpAttachmentService.getDownloadUrl(
      req.params.id,
      req.params.attachmentId,
      req.user
    );

    return R.ok(res, result, 'FRP attachment download URL generated');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signUploadUrls,
  confirmUploads,
  cancelUpload,
  downloadUrl,
};