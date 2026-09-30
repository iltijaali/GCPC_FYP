// Single place that knows the API address, the token format and how errors look.
const BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'token';

export const API_URL = BASE;

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: the session just won't survive a reload */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Turn a Django REST Framework error body into one readable sentence.
export function messageFrom(data, fallback = 'Something went wrong. Please try again.') {
  if (!data) return fallback;
  if (typeof data === 'string') return data.length < 300 ? data : fallback;
  if (Array.isArray(data)) return data.map((d) => messageFrom(d, '')).filter(Boolean).join(' ') || fallback;
  if (typeof data === 'object') {
    if (data.detail) return messageFrom(data.detail, fallback);
    if (data.error) return messageFrom(data.error, fallback);
    const parts = Object.entries(data).map(([field, value]) => {
      const text = messageFrom(value, '');
      if (!text) return '';
      return field === 'non_field_errors' ? text : `${field.replace(/_/g, ' ')}: ${text}`;
    });
    return parts.filter(Boolean).join(' ') || fallback;
  }
  return fallback;
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const AUTH_FAILURE = /credentials|token|authenticat/i;

export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `MyToken ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, null);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message = messageFrom(data, `Request failed (${response.status}).`);
    const authFailed =
      response.status === 401 || (response.status === 403 && AUTH_FAILURE.test(String(data?.detail ?? '')));
    // Several requests can fail together; only the first one (the token is still stored) ends the session.
    if (auth && authFailed && token && getToken() === token && onUnauthorized) onUnauthorized();
    throw new ApiError(message, response.status, data);
  }
  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
