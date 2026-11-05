import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from './components/AuthForm';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import PasswordInput from './components/PasswordInput';
import { jsonResponse, mockApi, renderApp } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

function Harness({ onSubmit = () => {} }) {
  const [value, setValue] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
      <label htmlFor="pw">Password</label>
      <PasswordInput id="pw" name="pw" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" placeholder="secret here" />
      <button type="submit">Send</button>
    </form>
  );
}

describe('PasswordInput', () => {
  it('starts hidden and offers to show', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('pw');
  });

  it('shows and hides the typed text without losing it', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Password');
    await userEvent.type(input, 'my-secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.getAttribute('type')).toBe('text');
    expect(input.value).toBe('my-secret-1');
    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(hide);
    expect(input.getAttribute('type')).toBe('password');
    expect(input.value).toBe('my-secret-1');
  });

  it('never submits the form when toggled, and the form still submits the real value', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Password'), 'abc123');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledWith('abc123');
  });

  it('works from the keyboard: Tab from the field, then Enter or Space', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('Password'));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.keyboard('{Enter}');
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
    await userEvent.keyboard(' ');
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('passes the normal input attributes through', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect(input.getAttribute('placeholder')).toBe('secret here');
    expect(input.getAttribute('name')).toBe('pw');
  });
});

describe('password fields in the app', () => {
  it('login: the toggle works and the typed password is what gets sent', async () => {
    const fetchMock = mockApi([{ method: 'POST', path: '/login/', respond: () => jsonResponse(200, { token: 't', username: 'demo', is_admin: false }) }]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.type(screen.getByLabelText(/email address or username/i), 'demo');
    await userEvent.type(screen.getByLabelText('Password'), 'Demo@1234');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').value).toBe('Demo@1234');
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username_or_email: 'demo', password: 'Demo@1234' });
  });

  it('register: the same field has the toggle', async () => {
    mockApi([]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
  });

  it('a revealed password is hidden again when you switch between Login and Register', async () => {
    mockApi([]);
    renderApp(<AuthForm />, { route: '/auth' });
    await userEvent.type(screen.getByLabelText('Password'), 'visible-now');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');   // hidden again, and cleared
    expect(screen.getByLabelText('Password').value).toBe('');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('reset password: the new-password field has a working toggle', async () => {
    mockApi([
      { method: 'POST', path: '/request-reset-password/', respond: () => jsonResponse(200, {}) },
      { method: 'POST', path: '/verify-otp/', respond: () => jsonResponse(200, {}) },
    ]);
    renderApp(<ForgotPasswordPage />, { route: '/forgot-password' });
    await userEvent.type(screen.getByLabelText('Email Address'), 'a@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    await userEvent.type(await screen.findByLabelText(/OTP sent to/), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
    const field = await screen.findByLabelText('New Password');
    expect(field.getAttribute('type')).toBe('password');
    await userEvent.type(field, 'brand-new-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(field.getAttribute('type')).toBe('text');
    expect(field.value).toBe('brand-new-pass');
  });
});
