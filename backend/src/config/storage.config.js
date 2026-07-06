const path = require('path');
const { Storage } = require('@google-cloud/storage');

const keyPath = process.env.GCP_KEY_PATH || './credentials/even-gearbox-255203-10881c36321f.json';
const bucketName = process.env.GCP_BUCKET_NAME || 'papertrail';

const signedUploadExpiresMinutes = parseInt(
  process.env.GCP_SIGNED_UPLOAD_EXPIRES_MINUTES,
  10
) || 15;

const signedDownloadExpiresMinutes = parseInt(
  process.env.GCP_SIGNED_DOWNLOAD_EXPIRES_MINUTES,
  10
) || 10;

const maxAttachmentFiles = parseInt(
  process.env.GCP_MAX_ATTACHMENT_FILES,
  10
) || 10;

const maxAttachmentFileSizeMb = parseInt(
  process.env.GCP_MAX_ATTACHMENT_FILE_SIZE_MB,
  10
) || 10;

const storage = new Storage({
  keyFilename: path.resolve(process.cwd(), keyPath),
});

const bucket = storage.bucket(bucketName);

module.exports = {
  storage,
  bucket,
  bucketName,
  signedUploadExpiresMinutes,
  signedDownloadExpiresMinutes,
  maxAttachmentFiles,
  maxAttachmentFileSizeMb,
};