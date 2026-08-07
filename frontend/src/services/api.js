const DEFAULT_API_BASE_URL = '/api';
const PILARGROUP_API_BASE_URL_ENV_KEY = 'VITE_PILARGROUP_API_BASE_URL';
const AUTH_TOKEN_STORAGE_KEYS = [
  'papertrail.auth.token',
  'token',
  'authToken',
  'access_token',
];
const AUTH_TOKEN_URL_PARAM = 'token';

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');
const shouldUseStoredAuthToken = () =>
  import.meta.env.VITE_USE_STORED_AUTH_TOKEN !== 'false';
const getApiBaseUrl = () =>
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
const getPilarGroupApiBaseUrl = () =>
  normalizeBaseUrl(import.meta.env[PILARGROUP_API_BASE_URL_ENV_KEY] || getApiBaseUrl());

const normalizeAuthToken = (value) => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (typeof parsedValue === 'string') {
      return normalizeAuthToken(parsedValue);
    }

    if (parsedValue && typeof parsedValue === 'object') {
      return normalizeAuthToken(
        parsedValue.token ||
          parsedValue.authToken ||
          parsedValue.access_token ||
          parsedValue.accessToken ||
          parsedValue.bearer,
      );
    }
  } catch {
    // Stored tokens are often plain strings, so JSON parse failures are expected.
  }

  return rawValue.replace(/^Bearer\s+/i, '').trim() || null;
};

const isBinaryBody = (value) => {
  if (!value) {
    return false;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return true;
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return true;
  }

  return ArrayBuffer.isView(value);
};

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storageAreas = [window.localStorage, window.sessionStorage];

    for (const storage of storageAreas) {
      for (const storageKey of AUTH_TOKEN_STORAGE_KEYS) {
        const token = normalizeAuthToken(storage.getItem(storageKey));

        if (token) {
          return token;
        }
      }
    }

    return normalizeAuthToken(window.__PAPERTRAIL_AUTH_TOKEN__ || window.__AUTH_TOKEN__);
  } catch {
    return null;
  }
};

// PilarGroup portal hands off auth by redirecting here with ?token=..., since
// papertrail.pilargroup.id is a separate subdomain and can't read the portal's storage/cookies directly.
const captureAuthTokenFromUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const url = new URL(window.location.href);
    const tokenFromUrl = normalizeAuthToken(url.searchParams.get(AUTH_TOKEN_URL_PARAM));

    if (!tokenFromUrl) {
      return;
    }

    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS[0], tokenFromUrl);

    url.searchParams.delete(AUTH_TOKEN_URL_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore malformed URLs or storage access errors (e.g. private browsing).
  }
};

captureAuthTokenFromUrl();

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, item);
        }
      });

      return;
    }

    searchParams.append(key, value);
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
};

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.data = options.data ?? null;
  }
}

let authToken = null;
let authTokenGetter = null;

const resolveToken = (tokenFromRequest) => {
  const requestToken = normalizeAuthToken(tokenFromRequest);

  if (requestToken) {
    return requestToken;
  }

  if (typeof authTokenGetter === 'function') {
    const getterToken = normalizeAuthToken(authTokenGetter());

    if (getterToken) {
      return getterToken;
    }
  }

  return normalizeAuthToken(authToken) || (shouldUseStoredAuthToken() ? getStoredAuthToken() : null);
};

const uploadFileToSignedUrl = async (
  uploadUrl,
  file,
  {
    method = 'PUT',
    headers = {},
    signal,
  } = {},
) => {
  const response = await fetch(uploadUrl, {
    method,
    headers,
    body: file,
    signal,
  });

  if (!response.ok) {
    throw new ApiError('Failed to upload file to storage', {
      status: response.status,
    });
  }

  return true;
};

const createResource = (path) => ({
  list: (params, options) => api.get(path, { ...options, params }),
  detail: (id, params, options) =>
    api.get(`${path}/${id}`, { ...options, params }),
  create: (data, options) => api.post(path, data, options),
  update: (id, data, options) => api.put(`${path}/${id}`, data, options),
  updateStatus: (id, is_active, options) => api.patch(`${path}/${id}/status`, { is_active }, options),
  remove: (id, options) => api.delete(`${path}/${id}`, options),
});

const createReadOnlyResource = (path, baseUrlGetter = getApiBaseUrl) => ({
  list: (params, options) =>
    api.get(path, {
      ...options,
      params,
      baseUrl: baseUrlGetter(),
    }),
});

const normalizePayloadItems = (payload, key) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }

  return payload === undefined ? [] : [payload];
};

const getResponseData = (response) => response?.data?.data ?? response?.data ?? response ?? {};

const getResponseItems = (response) => {
  const data = getResponseData(response);

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
};

const hasHeader = (headers, headerName) =>
  Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase());

const getSignedUploadHeaders = (uploadItem, file, uploadOptions = {}) => {
  const headers = {
    ...(uploadOptions?.headers || {}),
    ...(uploadItem?.headers || {}),
  };

  if (!hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] =
      uploadItem?.mime_type || file?.type || 'application/octet-stream';
  }

  return headers;
};

const createFrpResource = (path) => ({
  ...createResource(path),
  approve: (id, data = {}, options) => api.post(`${path}/${id}/approve`, data, options),
  reject: (id, data = {}, options) => api.post(`${path}/${id}/reject`, data, options),
  revert: (id, data = {}, options) => api.post(`${path}/${id}/revert`, data, options),
  attachments: {
    signUpload: (id, files, options) =>
      api.post(
        `${path}/${id}/attachments/sign-upload`,
        {
          files: normalizePayloadItems(files, 'files'),
        },
        options,
      ),
    confirm: (id, attachments, options) =>
      api.post(
        `${path}/${id}/attachments/confirm`,
        {
          attachments: normalizePayloadItems(attachments, 'attachments'),
        },
        options,
      ),
    cancel: (id, attachmentId, options) =>
      api.post(`${path}/${id}/attachments/${attachmentId}/cancel`, undefined, options),
    downloadUrl: (id, attachmentId, options) =>
      api.get(`${path}/${id}/attachments/${attachmentId}/download-url`, options),
    uploadViaBackend: (id, attachmentId, file, options) =>
      api.put(`${path}/${id}/attachments/${attachmentId}/upload`, file, {
        ...options,
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(options?.headers || {}),
        },
      }),
    uploadToStorage: uploadFileToSignedUrl,
    upload: async (
      id,
      {
        file,
        documentTypeId,
        checksum = null,
        signal,
        signOptions,
        uploadOptions,
        confirmOptions,
      },
    ) => {
      if (!file) {
        throw new ApiError('File is required for FRP attachment upload');
      }

      if (documentTypeId === undefined || documentTypeId === null || documentTypeId === '') {
        throw new ApiError('documentTypeId is required for FRP attachment upload');
      }

      const signResponse = await api.frp.attachments.signUpload(
        id,
        {
          document_type_id: documentTypeId,
          original_file_name: file?.name,
          mime_type: file?.type,
          file_size: file?.size,
        },
        {
          ...signOptions,
          signal: signOptions?.signal ?? signal,
        },
      );

      const uploadItem = getResponseItems(signResponse)[0];

      if (!uploadItem?.upload_url) {
        throw new ApiError('Failed to generate upload URL', {
          data: signResponse,
        });
      }

      try {
        await uploadFileToSignedUrl(uploadItem.upload_url, file, {
          method: uploadItem.method || uploadOptions?.method || 'PUT',
          headers: getSignedUploadHeaders(uploadItem, file, uploadOptions),
          signal: uploadOptions?.signal ?? signal,
        });
      } catch {
        await api.frp.attachments.uploadViaBackend(id, uploadItem.attachment_id, file, {
          signal,
        });
      }

      const confirmResponse = await api.frp.attachments.confirm(
        id,
        {
          attachment_id: uploadItem.attachment_id,
          checksum,
        },
        {
          ...confirmOptions,
          signal: confirmOptions?.signal ?? signal,
        },
      );

      return {
        signResponse,
        uploadItem,
        confirmResponse,
        confirmedAttachment: getResponseItems(confirmResponse)[0] ?? null,
      };
    },
  },
});

const createRpResource = (path) => ({
  ...createFrpResource(path),
  requesterManagerApprove: (id, data = {}, options) =>
    api.post(`${path}/${id}/requester-manager-approve`, data, options),
  destinationCheck: (id, data = {}, options) =>
    api.post(`${path}/${id}/destination-check`, data, options),
  destinationManagerApprove: (id, data = {}, options) =>
    api.post(`${path}/${id}/destination-manager-approve`, data, options),
  approveByStatus: (id, status, data = {}, options) => {
    const normalizedStatus = String(status ?? '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .toUpperCase();

    if (normalizedStatus === 'PENDING_DESTINATION_MANAGER') {
      return api.post(`${path}/${id}/destination-manager-approve`, data, options);
    }

    return api.post(`${path}/${id}/requester-manager-approve`, data, options);
  },
  approve: (id, data = {}, options) =>
    api.post(`${path}/${id}/requester-manager-approve`, data, options),
});

const request = async (
  path,
  {
    method = 'GET',
    params,
    data,
    headers = {},
    token,
    signal,
    responseType = 'json',
    baseUrl,
  } = {},
) => {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl || getApiBaseUrl());

  const url = `${resolvedBaseUrl}${path.startsWith('/') ? path : `/${path}`}${buildQueryString(params)}`;
  const resolvedToken = resolveToken(token);

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };
  const shouldSendRawBody = data instanceof FormData || isBinaryBody(data);

  if (data !== undefined && !shouldSendRawBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (resolvedToken) {
    requestHeaders.Authorization = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body:
      data === undefined
        ? undefined
        : shouldSendRawBody
          ? data
          : JSON.stringify(data),
    signal,
  });

  let responseData = null;

  if (response.status !== 204) {
    if (responseType === 'text') {
      responseData = await response.text();
    } else {
      const rawText = await response.text();
      responseData = rawText ? JSON.parse(rawText) : null;
    }
  }

  if (!response.ok) {
    const message =
      responseData?.message ||
      response.statusText ||
      'Terjadi kesalahan saat menghubungi server';

    throw new ApiError(message, {
      status: response.status,
      data: responseData,
    });
  }

  return responseData;
};

const api = {
  get baseUrl() {
    return getApiBaseUrl();
  },

  get pilarGroupBaseUrl() {
    return getPilarGroupApiBaseUrl();
  },

  setToken(token) {
    authToken = token;
  },

  clearToken() {
    authToken = null;
  },

  setTokenGetter(getter) {
    authTokenGetter = getter;
  },

  request,

  get(path, options) {
    return request(path, { ...options, method: 'GET' });
  },

  post(path, data, options) {
    return request(path, { ...options, method: 'POST', data });
  },

  put(path, data, options) {
    return request(path, { ...options, method: 'PUT', data });
  },

  patch(path, data, options) {
    return request(path, { ...options, method: 'PATCH', data });
  },

  delete(path, options) {
    return request(path, { ...options, method: 'DELETE' });
  },

  // =====================
  // Auth Endpoints
  // =====================
  auth: {
    me: (options) => api.get('/auth/me', options),
  },

  // =====================
  // frp
  // =====================
  frp: createFrpResource('/frp'),


  // =====================
  // rp
  // =====================
  rp: createRpResource('/rp'),

  // =====================
  // Master - Vendor Management
  // =====================
  vendors: createResource('/master/vendors'),
  banks: createResource('/master/banks'),
  vendorBankAccounts: createResource('/master/vendor-bank-accounts'),

  // =====================
  // Master - Budget Management
  // =====================
  budgetTypes: createResource('/master/budget-types'),
  budgets: createResource('/master/budgets'),
  budgetAccessRules: createResource('/master/budget-access-rules'),

  // =====================
  // Master - FRP Configuration
  // =====================
  frpDocumentTypes: createResource('/master/frp-document-types'),
  externalDocumentTypes: createResource('/master/external-document-types'),
  paymentMethods: createResource('/master/payment-methods'),
  currencies: {
    ...createResource('/master/currencies'),
    exchangeRates: {
      latest: (params, options) =>
        api.get('/master/currencies/exchange-rates/latest', { ...options, params }),
      manualCreate: (data, options) =>
        api.post('/master/currencies/exchange-rates', data, options),
    },
  },

  // =====================
  // Master - RP Configuration
  // =====================
  rpDestinationDepartments: createResource('/master/rp-destination-departments'),
  rpCheckerRules: createResource('/master/rp-checker-rules'),
  rpPaymentCategories: createResource('/master/rp-payment-categories'),

  // =====================
  // Master - Permission Management
  // =====================
  permissionModules: {
    list: (params, options) =>
      api.get('/master/permission-modules', { ...options, params }),
    detail: (id, params, options) =>
      api.get(`/master/permission-modules/${id}`, { ...options, params }),
  },

  permissionModulesGroupByUser : {
    list: (params, options) =>
      api.get('/master/user-module-permissions/grouped-by-user', {...options, params }),
    detail: (id, params, options) =>
      api.get(`/master/permission-modules/grouped-by-user/${id}`, { ...options, params }),  
  },

  userModulePermissions: createResource('/master/user-module-permissions'),
  userModulePermissionsGroupByUser: createResource('/master/user-module-permissions/grouped-by-user'),

  // =====================
  // Utility - Business Units (from PilarGroup)
  // =====================
  businessUnits: {
    list: (params, options) =>
      api.get('/directory/business-units', {
        ...options,
        params,
        baseUrl: getPilarGroupApiBaseUrl(),
      }),
    departments: (businessUnitId, params, options) =>
      api.get(`/directory/business-units/${businessUnitId}/departments`, {
        ...options,
        params,
        baseUrl: getPilarGroupApiBaseUrl(),
      }),
  },

  directory: {
    departments: createReadOnlyResource('/internal/directory/departments'),
    companies: createReadOnlyResource('/internal/directory/companies'),
    users: createReadOnlyResource('/internal/directory/users'),
  },
};

export default api;
