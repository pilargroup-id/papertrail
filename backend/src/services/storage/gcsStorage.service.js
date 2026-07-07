const {
  bucket,
  signedUploadExpiresMinutes,
  signedDownloadExpiresMinutes,
} = require('../../config/storage.config');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function generateSignedUploadUrl(objectPath, mimeType) {
  const expiresAt = addMinutes(new Date(), signedUploadExpiresMinutes);

  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType: mimeType,
  });

  return {
    url,
    expiresAt,
  };
}

async function generateSignedDownloadUrl(objectPath) {
  const expiresAt = addMinutes(new Date(), signedDownloadExpiresMinutes);

  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
  });

  return {
    url,
    expiresAt,
  };
}

async function objectExists(objectPath) {
  const [exists] = await bucket.file(objectPath).exists();
  return exists;
}

async function deleteObjectIfExists(objectPath) {
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();

  if (!exists) {
    return false;
  }

  await file.delete();

  return true;
}

module.exports = {
  generateSignedUploadUrl,
  generateSignedDownloadUrl,
  objectExists,
  deleteObjectIfExists,
};