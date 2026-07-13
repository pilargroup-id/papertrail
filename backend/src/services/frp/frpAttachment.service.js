const { randomUUID } = require('crypto');
const path = require('path');

const frpModel = require('../../models/frp/frp.model');
const frpAttachmentModel = require('../../models/frp/frpAttachment.model');
const { resolveFrpDocumentTypeSnapshots } = require('../master/masterSnapshot.service');
const {
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
  objectExists,
  uploadObject,
  deleteObjectIfExists,
} = require('../storage/gcsStorage.service');

const {
  bucketName,
  maxAttachmentFiles,
  maxAttachmentFileSizeMb,
} = require('../../config/storage.config');

function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function isUserInItDepartment(user = {}) {
  const directClass = String(user.department_class || '').toUpperCase();
  const directName = String(user.department || '').toUpperCase();
  const directCode = String(user.department_code || '').toUpperCase();

  if (directClass === 'IT' || directName === 'IT' || directCode === 'SIT') {
    return true;
  }

  const departments = Array.isArray(user.departments) ? user.departments : [];

  return departments.some((department) => {
    const departmentClass = String(department.class || '').toUpperCase();
    const departmentName = String(department.name || '').toUpperCase();
    const departmentCode = String(department.code || '').toUpperCase();

    return departmentClass === 'IT' || departmentName === 'IT' || departmentCode === 'SIT';
  });
}

function canManageAttachment(user = {}, frp = {}) {
  if (isUserInItDepartment(user)) {
    return true;
  }

  return String(frp.requested_by_user_id || '') === String(user.id || '');
}

function getYearMonthParts(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return {
    year,
    month,
  };
}

function getFileExtension(originalFileName, mimeType) {
  const ext = path.extname(originalFileName || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9.]/g, '');

  if (ext) {
    return ext;
  }

  if (mimeType === 'application/pdf') {
    return '.pdf';
  }

  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return '.xlsx';
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx';
  }

  return '.bin';
}

function buildAttachmentFileName(frp, sequenceNumber, originalFileName, mimeType) {
  const sequence = String(sequenceNumber).padStart(2, '0');
  const ext = getFileExtension(originalFileName, mimeType);

  return `${frp.frp_number}-${sequence}${ext}`;
}

function buildObjectPath(frp, sequenceNumber, originalFileName, mimeType) {
  const { year, month } = getYearMonthParts(new Date());

  const fileName = buildAttachmentFileName(
    frp,
    sequenceNumber,
    originalFileName,
    mimeType
  );

  return `frp/${year}/${month}/${fileName}`;
}

function validateFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Files are required');
  }

  if (files.length > maxAttachmentFiles) {
    throw new Error(`Maximum ${maxAttachmentFiles} files are allowed`);
  }

  const maxSize = maxAttachmentFileSizeMb * 1024 * 1024;

  files.forEach((file, index) => {
    if (!file.document_type_id) {
      throw new Error(`Document type is required on file ${index + 1}`);
    }

    if (!normalizeString(file.original_file_name)) {
      throw new Error(`Original file name is required on file ${index + 1}`);
    }

    if (!normalizeString(file.mime_type)) {
      throw new Error(`MIME type is required on file ${index + 1}`);
    }

    const fileSize = Number(file.file_size || 0);

    if (fileSize <= 0) {
      throw new Error(`File size is required on file ${index + 1}`);
    }

    if (fileSize > maxSize) {
      throw new Error(`File ${index + 1} exceeds maximum size ${maxAttachmentFileSizeMb} MB`);
    }
  });
}

async function signUploadUrls(frpRequestId, body = {}, user = {}) {
  validateFiles(body.files);

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, frpRequestId, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Attachments can only be added to PENDING FRP');
    }

    if (!canManageAttachment(user, frp)) {
      throw new Error('You do not have permission to add attachments to this FRP');
    }

    const existingAttachmentCount = await frpAttachmentModel.countAttachmentsByFrpRequestId(
      conn,
      frpRequestId
    );

    const documentTypeIds = body.files.map((file) => file.document_type_id);
    const documentSnapshots = await resolveFrpDocumentTypeSnapshots(conn, documentTypeIds);

    const documentMap = new Map();

    documentSnapshots.forEach((document) => {
      documentMap.set(Number(document.document_type_id), document);
    });

    const results = [];

    for (let index = 0; index < body.files.length; index += 1) {
      const file = body.files[index];
      const documentSnapshot = documentMap.get(Number(file.document_type_id));

      if (!documentSnapshot) {
        throw new Error('Document type not found');
      }

      const attachmentId = randomUUID();
      const originalFileName = normalizeString(file.original_file_name);
      const mimeType = normalizeString(file.mime_type);
      const fileSize = Number(file.file_size || 0);
      const sequenceNumber = existingAttachmentCount + index + 1;

      const generatedFileName = buildAttachmentFileName(
        frp,
        sequenceNumber,
        originalFileName,
        mimeType
      );

      const objectPath = buildObjectPath(
        frp,
        sequenceNumber,
        originalFileName,
        mimeType
      );

      const signedUpload = await generateSignedUploadUrl(objectPath, mimeType);

      await frpAttachmentModel.insertPendingAttachment(conn, {
        id: attachmentId,
        frp_request_id: frpRequestId,
        document_type_id: documentSnapshot.document_type_id,
        document_code_snapshot: documentSnapshot.document_code_snapshot,
        document_name_snapshot: documentSnapshot.document_name_snapshot,
        original_file_name: originalFileName,
        file_name: generatedFileName,
        object_path: objectPath,
        bucket_name: bucketName,
        mime_type: mimeType,
        file_size: fileSize,
        signed_url_expires_at: signedUpload.expiresAt,
        uploaded_by_user_id: user.id,
        uploaded_by_username: user.username || null,
        uploaded_by_name: user.name,
      });

      results.push({
        attachment_id: attachmentId,
        document_type_id: documentSnapshot.document_type_id,
        document_code: documentSnapshot.document_code_snapshot,
        document_name: documentSnapshot.document_name_snapshot,
        original_file_name: originalFileName,
        file_name: generatedFileName,
        object_path: objectPath,
        bucket_name: bucketName,
        upload_url: signedUpload.url,
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        expires_at: signedUpload.expiresAt,
      });
    }

    await conn.commit();

    return {
      items: results,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function confirmUploads(frpRequestId, body = {}, user = {}) {
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  if (!attachments.length) {
    throw new Error('Attachments are required');
  }

  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, frpRequestId, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Attachments can only be confirmed on PENDING FRP');
    }

    if (!canManageAttachment(user, frp)) {
      throw new Error('You do not have permission to confirm attachments to this FRP');
    }

    const results = [];

    for (const item of attachments) {
      if (!item.attachment_id) {
        throw new Error('Attachment ID is required');
      }

      const attachment = await frpAttachmentModel.getAttachmentById(
        conn,
        item.attachment_id,
        frpRequestId
      );

      if (!attachment) {
        throw new Error('Attachment not found');
      }

      if (attachment.upload_status !== 'PENDING') {
        throw new Error(`Attachment ${attachment.id} is not pending`);
      }

      const exists = await objectExists(attachment.object_path);

      if (!exists) {
        throw new Error(`Uploaded object not found for attachment ${attachment.id}`);
      }

      await frpAttachmentModel.markAttachmentUploaded(conn, attachment.id, {
        checksum: item.checksum || null,
      });

      results.push({
        attachment_id: attachment.id,
        upload_status: 'UPLOADED',
      });
    }

    await conn.commit();

    return {
      items: results,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function uploadPendingAttachment(frpRequestId, attachmentId, fileBuffer, user = {}) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('Attachment file is required');
  }

  const maxSize = maxAttachmentFileSizeMb * 1024 * 1024;

  if (fileBuffer.length > maxSize) {
    throw new Error(`File exceeds maximum size ${maxAttachmentFileSizeMb} MB`);
  }

  const conn = await frpModel.db.getConnection();

  try {
    const frp = await frpModel.getFrpHeaderById(conn, frpRequestId);

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Attachments can only be uploaded to PENDING FRP');
    }

    if (!canManageAttachment(user, frp)) {
      throw new Error('You do not have permission to upload attachments to this FRP');
    }

    const attachment = await frpAttachmentModel.getAttachmentById(
      conn,
      attachmentId,
      frpRequestId
    );

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.upload_status !== 'PENDING') {
      throw new Error(`Attachment ${attachment.id} is not pending`);
    }

    if (Number(attachment.file_size || 0) !== fileBuffer.length) {
      throw new Error('Attachment file size does not match signed upload metadata');
    }

    await uploadObject(attachment.object_path, fileBuffer, attachment.mime_type);

    return {
      attachment_id: attachment.id,
      object_path: attachment.object_path,
      file_size: fileBuffer.length,
    };
  } finally {
    conn.release();
  }
}

async function cancelUpload(frpRequestId, attachmentId, user = {}) {
  const conn = await frpModel.db.getConnection();

  try {
    await conn.beginTransaction();

    const frp = await frpModel.getFrpHeaderById(conn, frpRequestId, { lock: true });

    if (!frp) {
      throw new Error('FRP request not found');
    }

    if (frp.status !== 'PENDING') {
      throw new Error('Attachments can only be canceled on PENDING FRP');
    }

    if (!canManageAttachment(user, frp)) {
      throw new Error('You do not have permission to cancel attachments on this FRP');
    }

    const attachment = await frpAttachmentModel.getAttachmentById(
      conn,
      attachmentId,
      frpRequestId
    );

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.upload_status === 'CANCELED') {
      throw new Error('Attachment is already canceled');
    }

    const deletedFromStorage = await deleteObjectIfExists(attachment.object_path);

    await frpAttachmentModel.cancelAttachment(conn, attachment.id, user);

    await conn.commit();

    return {
      attachment_id: attachment.id,
      upload_status: 'CANCELED',
      deleted_from_storage: deletedFromStorage,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function getDownloadUrl(frpRequestId, attachmentId, user = {}) {
  const conn = await frpModel.db.getConnection();

  try {
    const detail = await frpModel.getFrpDetail(conn, frpRequestId);

    if (!detail) {
      throw new Error('FRP request not found');
    }

    const attachment = await frpAttachmentModel.getAttachmentById(
      conn,
      attachmentId,
      frpRequestId
    );

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.upload_status !== 'UPLOADED') {
      throw new Error('Attachment is not uploaded');
    }

    const exists = await objectExists(attachment.object_path);

    if (!exists) {
      throw new Error('Attachment object not found in storage');
    }

    const signedDownload = await generateSignedDownloadUrl(attachment.object_path);

    return {
      attachment_id: attachment.id,
      original_file_name: attachment.original_file_name,
      file_name: attachment.file_name,
      mime_type: attachment.mime_type,
      file_size: attachment.file_size,
      download_url: signedDownload.url,
      expires_at: signedDownload.expiresAt,
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  signUploadUrls,
  confirmUploads,
  uploadPendingAttachment,
  cancelUpload,
  getDownloadUrl,
};
