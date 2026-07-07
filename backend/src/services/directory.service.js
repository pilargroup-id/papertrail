const axios = require('axios');
const config = require('../config');

function createHttpError(message, statusCode = 500, code = null, payload = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.payload = payload;
  return err;
}

function getAxiosErrorCode(err) {
  return err.response?.data?.code || err.code || null;
}

function getAxiosErrorMessage(err, fallbackMessage) {
  return err.response?.data?.message || err.message || fallbackMessage;
}

async function fetchDirectoryResource(resource, { token, params } = {}) {
  const url = `${config.pilargroup.url}/api/internal/directory/${resource}`;

  try {
    return await axios.get(url, {
      timeout: 10_000,
      params,
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': config.pilargroup.internalSyncSecret,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    throw createHttpError(
      getAxiosErrorMessage(err, `Failed to fetch directory ${resource}`),
      err.response?.status || 500,
      getAxiosErrorCode(err) || 'DIRECTORY_FETCH_FAILED',
      err.response?.data || null
    );
  }
}

module.exports = {
  fetchDirectoryResource,
};
