const DEFAULT_API_BASE_URL = '/api';
const PILARGROUP_API_BASE_URL_ENV_KEY = 'VITE_PILARGROUP_API_BASE_URL';
const AUTH_TOKEN_STORAGE_KEYS = [
  'papertrail.auth.token',
  'token',
  'authToken',
  'access_token',
];

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

    return normalizeAuthToken(window.__ITEMBASE_AUTH_TOKEN__ || window.__AUTH_TOKEN__);
  } catch {
    return null;
  }
};

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

  if (data !== undefined && !(data instanceof FormData)) {
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
        : data instanceof FormData
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

  userModulePermissions: createResource('/master/user-module-permissions'),

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
