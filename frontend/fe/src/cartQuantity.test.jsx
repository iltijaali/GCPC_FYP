import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cart from './components/CartPage';
import { jsonResponse, mockApi, renderApp } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

const PRICE = 200;
const cartWith = (quantity) => [{
  id: 7, saved: false, total_price: PRICE * quantity,
  products: [{ id: 11, product: 'Orange', quantity, total_price: PRICE * quantity }],
}];

// A tiny fake server: one cart line whose quantity PATCH really changes; every call is recorded in `log`.
function fakeServer({ patchDelay = 0, failPatch = false } = {}) {
  const state = { quantity: 2 };
  const log = [];
  const fetchMock = mockApi([
    { method: 'GET', path: '/cart/', respond: () => jsonResponse(200, cartWith(state.quantity)) },
    {
      method: 'PATCH', path: '/cart-items/11/',
      respond: async (body) => {
        log.push(`patch:${body.quantity}:start`);
        if (patchDelay) await new Promise((r) => setTimeout(r, patchDelay));
        if (failPatch) { log.push('patch:failed'); return jsonResponse(400, { quantity: ['Not allowed.'] }); }
        state.quantity = body.quantity;
        log.push(`patch:${body.quantity}:done`);
        return jsonResponse(200, {});
      },
    },
    { method: 'POST', path: '/cart/7/save_cart/', respond: () => { log.push('save'); return jsonResponse(200, { status: 'cart saved' }); } },
  ]);
  return { state, log, fetchMock, patches: () => fetchMock.mock.calls.filter(([, i]) => i?.method === 'PATCH') };
}

const total = (n) => `Total: ${(PRICE * n).toFixed(2)} Rs`;

describe('cart quantity box', () => {
  it('updates the total on its own after an arrow-style change, without leaving the box', async () => {
    const server = fakeServer();
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    input.focus();                                           // clicking the arrows focuses the box and leaves it focused
    fireEvent.change(input, { target: { value: '3' } });     // what a click on the up arrow does
    expect(input.value).toBe('3');
    await waitFor(() => expect(screen.getByText(total(3))).toBeTruthy(), { timeout: 3000 });
    expect(server.patches()).toHaveLength(1);
    expect(JSON.parse(server.patches()[0][1].body)).toEqual({ quantity: 3 });
    expect(document.activeElement).toBe(input);              // and the box was never taken away from the user
  });

  it('turns a burst of quick clicks into ONE save of the last value', async () => {
    const server = fakeServer();
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    input.focus();
    for (const v of ['3', '4', '5']) fireEvent.change(input, { target: { value: v } });
    await waitFor(() => expect(screen.getByText(total(5))).toBeTruthy(), { timeout: 3000 });
    expect(server.patches()).toHaveLength(1);
    expect(JSON.parse(server.patches()[0][1].body)).toEqual({ quantity: 5 });
  });

  it('does not save a half-typed value like an empty box or 0, and does not disturb the typing', async () => {
    const server = fakeServer();
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    input.focus();
    fireEvent.change(input, { target: { value: '' } });
    await new Promise((r) => setTimeout(r, 800));            // longer than the auto-save delay
    expect(server.patches()).toHaveLength(0);
    expect(input.value).toBe('');                            // left alone, so the user can keep typing
    fireEvent.change(input, { target: { value: '0' } });
    await new Promise((r) => setTimeout(r, 800));
    expect(server.patches()).toHaveLength(0);
    await userEvent.tab();                                   // leaving the box puts the real quantity back
    await waitFor(() => expect(input.value).toBe('2'), { timeout: 3000 });
    expect(server.patches()).toHaveLength(0);
  });

  it('saves immediately when you leave the box, without waiting for the delay', async () => {
    const server = fakeServer();
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    vi.useFakeTimers();                                       // from here on the clock only moves when the test says so
    try {
      input.focus();
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.blur(input);
      await vi.advanceTimersByTimeAsync(0);                   // no time has passed, yet the save has already been sent
      expect(server.patches()).toHaveLength(1);
      expect(JSON.parse(server.patches()[0][1].body)).toEqual({ quantity: 6 });
      await vi.advanceTimersByTimeAsync(5000);                // the cancelled auto-save timer must not send a second one
      expect(server.patches()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() => expect(screen.getByText(total(6))).toBeTruthy(), { timeout: 3000 });
  });

  it('Save Cart waits for a quantity change that is still on its way', async () => {
    const server = fakeServer({ patchDelay: 150 });
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    input.focus();
    fireEvent.change(input, { target: { value: '4' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save Cart' }));   // blurs the box, then clicks
    await waitFor(() => expect(server.log).toContain('save'), { timeout: 3000 });
    expect(server.log).toEqual(['patch:4:start', 'patch:4:done', 'save']);     // the change is stored BEFORE the cart is saved
  });

  it('shows the real quantity again if the save fails', async () => {
    const server = fakeServer({ failPatch: true });
    renderApp(<Cart />, { route: '/cart' });
    const input = await screen.findByLabelText('Quantity of Orange');
    input.focus();
    fireEvent.change(input, { target: { value: '9' } });
    expect(await screen.findByText(/Not allowed\./, {}, { timeout: 3000 })).toBeTruthy();
    await waitFor(() => expect(input.value).toBe('2'), { timeout: 3000 });
    expect(screen.getByText(total(2))).toBeTruthy();
    expect(server.patches()).toHaveLength(1);
  });
});
