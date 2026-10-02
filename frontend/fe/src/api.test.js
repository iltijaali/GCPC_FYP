import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, clearToken, messageFrom, setToken, setUnauthorizedHandler } from './api';

const respond = (status, body) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
  });

describe('messageFrom', () => {
  it('reads DRF detail, field and non-field errors', () => {
    expect(messageFrom({ detail: 'Invalid token' })).toBe('Invalid token');
    expect(messageFrom({ non_field_errors: ['Invalid credentials'] })).toBe('Invalid credentials');
    expect(messageFrom({ username: ['already exists.'], email: ['Enter a valid email.'] })).toBe(
      'username: already exists. email: Enter a valid email.',
    );
    expect(messageFrom({ new_password: ['Too short.'] })).toBe('new password: Too short.');
  });

  it('falls back for empty or unusable bodies', () => {
    expect(messageFrom(null, 'fallback')).toBe('fallback');
    expect(messageFrom({}, 'fallback')).toBe('fallback');
    expect(messageFrom('<html>' + 'x'.repeat(500), 'fallback')).toBe('fallback');
  });
});

describe('request', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('sends the MyToken header and JSON body', async () => {
    setToken('abc_123');
    fetchMock.mockReturnValue(respond(200, { ok: true }));
    await api.post('/cart-items/', { product: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/cart-items/');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('MyToken abc_123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"product":3}');
  });

  it('does not attach the token when auth is off', async () => {
    setToken('abc_123');
    fetchMock.mockReturnValue(respond(200, {}));
    await api.post('/login/', { a: 1 }, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('passes FormData through untouched so the browser sets the multipart boundary', async () => {
    fetchMock.mockReturnValue(respond(201, {}));
    const body = new FormData();
    body.append('shop_name', 'x');
    await api.post('/complaints/', body);
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(body);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('throws an ApiError carrying the server message and status', async () => {
    fetchMock.mockReturnValue(respond(400, { username: ['A user with that username already exists.'] }));
    await expect(api.post('/register/', {}, { auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'username: A user with that username already exists.',
    });
  });

  it('returns null for 204 responses', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error('empty')) }));
    expect(await api.del('/cart-items/1/')).toBeNull();
  });

  it('reports network failures with a friendly message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await api.get('/products/').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/cannot reach the server/i);
  });

  it('calls the unauthorized handler when the token is rejected or expired', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setToken('stale');
    fetchMock.mockReturnValue(respond(403, { detail: 'Token has expired' }));
    await expect(api.get('/cart/')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the handler only once when several requests fail with the same bad token', async () => {
    const handler = vi.fn(() => clearToken()); // what AuthProvider does
    setUnauthorizedHandler(handler);
    setToken('stale');
    fetchMock.mockReturnValue(respond(403, { detail: 'Invalid token' }));
    await Promise.allSettled([api.get('/cart-history/'), api.get('/notifications/'), api.get('/cart/')]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there was no token to expire', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockReturnValue(respond(403, { detail: 'Authentication credentials were not provided.' }));
    await expect(api.get('/cart/')).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not treat other 403s or login failures as a session expiry', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockReturnValue(respond(403, { detail: 'You do not have permission to perform this action.' }));
    await expect(api.get('/x/')).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockReturnValue(respond(403, { detail: 'Invalid token' }));
    await expect(api.post('/login/', {}, { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('buildQuery', () => {
  it('builds a query string and skips empty values', async () => {
    const { buildQuery } = await import('./api');
    expect(buildQuery({ status: 'Pending', search: '', page: 2, emailed: undefined, days: null })).toBe('?status=Pending&page=2');
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ search: 'a b&c' })).toBe('?search=a+b%26c');
  });
});
