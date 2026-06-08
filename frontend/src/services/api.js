import { resolveApiUrl } from './network';

/**
 * Custom Error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base utility to handle fetch requests
 */
async function fetchWithConfig(url, config = {}) {
  try {
    const response = await fetch(resolveApiUrl(url), {
      credentials: 'include',
      ...config,
    });
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      // Return text or blob depending on what's needed, for now text
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(data?.error || data?.message || data || response.statusText, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors
    throw new ApiError(error.message || 'Network Error', 0, null);
  }
}

/**
 * Main API service for connecting frontend to backend.
 * Provides simplified get, post, put, delete methods.
 */
export const api = {
  /**
   * Perform a GET request
   * @param {string} endpoint - The URL endpoint (e.g., '/api/data')
   * @param {object} options - Fetch options
   */
  get: (endpoint, options = {}) => {
    return fetchWithConfig(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * Perform a POST request
   * @param {string} endpoint - The URL endpoint
   * @param {object} data - The JSON payload (optional)
   * @param {object} options - Fetch options
   */
  post: (endpoint, data = {}, options = {}) => {
    return fetchWithConfig(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Perform a PUT request
   * @param {string} endpoint - The URL endpoint
   * @param {object} data - The JSON payload
   * @param {object} options - Fetch options
   */
  put: (endpoint, data = {}, options = {}) => {
    return fetchWithConfig(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Perform a DELETE request
   * @param {string} endpoint - The URL endpoint
   * @param {object} options - Fetch options
   */
  delete: (endpoint, options = {}) => {
    return fetchWithConfig(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
};

export default api;
