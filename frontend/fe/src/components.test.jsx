import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import Cart from './components/CartPage';
import ComplaintsForm from './components/ComplaintForm';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ProtectedRoute from './ProtectedRoute';
import { jsonResponse, mockApi, renderApp } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

describe('ProtectedRoute', () => {
  const page = <ProtectedRoute element={<p>secret page</p>} />;
  const authPage = <Route path="/auth" element={<p>login screen</p>} />;

  it('redirects to /auth without a token', async () => {
    mockApi([]);
    renderApp(page, { route: '/cart', extraRoutes: authPage });
    expect(await screen.findByText('login screen')).toBeTruthy();
    expect(screen.queryByText('secret page')).toBeNull();
  });

  it('shows the page for a valid token', async () => {
    localStorage.setItem('token', 'good');
    mockApi([{ method: 'POST', path: '/get-me/', respond: () => jsonResponse(200, { username: 'demo' }) }]);
    renderApp(page, { route: '/cart', extraRoutes: authPage });
    expect(await screen.findByText('secret page')).toBeTruthy();
  });

  it('clears a rejected token and redirects', async () => {
    localStorage.setItem('token', 'stale');
    mockApi([{ method: 'POST', path: '/get-me/', respond: () => jsonResponse(400, { error: 'Invalid token.' }) }]);
    renderApp(page, { route: '/cart', extraRoutes: authPage });
    expect(await screen.findByText('login screen')).toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('AuthForm', () => {
  it('logs in, stores the token and sends the credentials', async () => {
    const fetchMock = mockApi([
      {
        method: 'POST',
        path: '/login/',
        respond: () => jsonResponse(200, { token: 'tok_1', username: 'demo', token_expiry: 'x' }),
      },
    ]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.type(screen.getByLabelText(/email address or username/i), 'demo');
    await userEvent.type(screen.getByLabelText('Password'), 'Demo@1234');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok_1'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      username_or_email: 'demo',
      password: 'Demo@1234',
    });
  });

  it('shows the real server message when login fails', async () => {
    mockApi([
      { method: 'POST', path: '/login/', respond: () => jsonResponse(400, { non_field_errors: ['Invalid credentials'] }) },
    ]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.type(screen.getByLabelText(/email address or username/i), 'demo');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Invalid credentials')).toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows the field error when registration fails and blocks short passwords', async () => {
    mockApi([
      {
        method: 'POST',
        path: '/register/',
        respond: () => jsonResponse(400, { username: ['A user with that username already exists.'] }),
      },
    ]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByLabelText('Full Name'), 'Demo User');
    await userEvent.type(screen.getByLabelText('User Name'), 'demo');
    await userEvent.type(screen.getByLabelText('Email Address'), 'demo@example.com');
    await userEvent.type(screen.getByLabelText('Password'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeTruthy();

    await userEvent.type(screen.getByLabelText('Password'), '456');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText(/username: A user with that username already exists/)).toBeTruthy();
  });
});

describe('ForgotPasswordPage', () => {
  it('walks through the 3 steps and returns to /auth (not /login)', async () => {
    mockApi([
      { method: 'POST', path: '/request-reset-password/', respond: () => jsonResponse(200, {}) },
      { method: 'POST', path: '/verify-otp/', respond: () => jsonResponse(200, {}) },
      { method: 'POST', path: '/reset-password/', respond: () => jsonResponse(200, {}) },
    ]);
    renderApp(<ForgotPasswordPage />, {
      route: '/forgot-password',
      extraRoutes: <Route path="/auth" element={<p>login screen</p>} />,
    });
    await userEvent.type(screen.getByLabelText('Email Address'), 'a@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    await userEvent.type(await screen.findByLabelText(/OTP sent to/), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
    await userEvent.type(await screen.findByLabelText('New Password'), 'brand-new-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(await screen.findByText('login screen')).toBeTruthy();
  });
});

describe('Cart', () => {
  const cartWith = (quantity) => [
    {
      id: 7,
      saved: false,
      total_price: 200 * quantity,
      products: [{ id: 11, product: 'Orange', quantity, total_price: 200 * quantity }],
    },
  ];

  it('commits a valid quantity on blur but rejects 0 without calling the API', async () => {
    let quantity = 2;
    const fetchMock = mockApi([
      { method: 'GET', path: '/cart/', respond: () => jsonResponse(200, cartWith(quantity)) },
      {
        method: 'PATCH',
        path: '/cart-items/11/',
        respond: (body) => {
          quantity = body.quantity;
          return jsonResponse(200, {});
        },
      },
    ]);
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');

    input.focus();
    fireEvent.change(input, { target: { value: '0' } });
    await userEvent.tab();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
    expect(input.value).toBe('2');

    input.focus();
    fireEvent.change(input, { target: { value: '5' } });
    await userEvent.tab();
    await waitFor(() => expect(screen.getByText('Total: 1000.00 Rs')).toBeTruthy());
    const patches = fetchMock.mock.calls.filter(([, i]) => i?.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(JSON.parse(patches[0][1].body)).toEqual({ quantity: 5 });
  });
});


describe('ForgotPasswordPage errors and resend', () => {
  it('shows the server message for a wrong or expired OTP and can request a new code', async () => {
    const fetchMock = mockApi([
      { method: 'POST', path: '/request-reset-password/', respond: () => jsonResponse(200, {}) },
      {
        method: 'POST',
        path: '/verify-otp/',
        respond: () => jsonResponse(400, { non_field_errors: ['Invalid OTP. 4 attempts left.'] }),
      },
    ]);
    renderApp(<ForgotPasswordPage />, { route: '/forgot-password' });
    await userEvent.type(screen.getByLabelText('Email Address'), 'a@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    await userEvent.type(await screen.findByLabelText(/OTP sent to/), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
    expect(await screen.findByText('Invalid OTP. 4 attempts left.')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(await screen.findByText('We sent you a new code.')).toBeTruthy();
    const resets = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/request-reset-password/'));
    expect(resets).toHaveLength(2);
  });

  it('tells the user when they must wait before asking for another code', async () => {
    mockApi([
      {
        method: 'POST',
        path: '/request-reset-password/',
        respond: () => jsonResponse(400, { email: ['An OTP was sent recently. Please wait 42 seconds before requesting another.'] }),
      },
    ]);
    renderApp(<ForgotPasswordPage />, { route: '/forgot-password' });
    await userEvent.type(screen.getByLabelText('Email Address'), 'a@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    expect(await screen.findByText(/Please wait 42 seconds/)).toBeTruthy();
  });
});

describe('Complaints page', () => {
  const complaint = (id, extra) => ({
    id, shop_name: `Shop ${id}`, shopkeeper_name: 'K', dc_email: 'dc@example.gov.pk', location: 'L',
    description: 'D', status: 'Pending', photo: null, submitted_date: '2026-09-30T10:00:00Z', ...extra,
  });

  it('says whether each complaint was emailed to the DC', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/complaints/',
        respond: () => jsonResponse(200, [
          complaint(1, { dc_notified_at: '2026-09-30T10:00:05Z' }),
          complaint(2, { submitted_date: '2026-09-29T10:00:00Z', dc_notified_at: null }),
        ]),
      },
    ]);
    renderApp(<ComplaintsForm />, { route: '/complaints' });
    await userEvent.click(await screen.findByRole('button', { name: /Shop 1/ }));
    expect(screen.getByText(/Yes, on/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Shop 2/ }));
    expect(await screen.findByText(/Not yet \(it is being sent/)).toBeTruthy();
  });
});
