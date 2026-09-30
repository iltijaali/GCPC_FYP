import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthProvider from '../context/AuthProvider';
import ToastProvider from '../context/ToastProvider';

export const jsonResponse = (status, body) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
  });

// Route table: [{ method, path, respond(body) }] matched in order against fetch calls.
export function mockApi(routes) {
  const fetchMock = vi.fn((url, init = {}) => {
    const path = String(url).replace('http://localhost:8000/api', '');
    const method = init.method || 'GET';
    const route = routes.find((r) => r.method === method && r.path === path);
    if (!route) return jsonResponse(404, { detail: `unmocked ${method} ${path}` });
    const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    return route.respond(body, init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(ui, { route = '/', extraRoutes = null } = {}) {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="*" element={ui} />
            {extraRoutes}
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  );
}
