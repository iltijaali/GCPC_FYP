import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminRoute from './admin/AdminRoute';
import ColumnChart from './admin/charts/ColumnChart';
import StatTile from './admin/charts/StatTile';
import ComplaintsPage from './admin/pages/ComplaintsPage';
import Overview from './admin/pages/Overview';
import ProductsPage from './admin/pages/ProductsPage';
import UsersPage from './admin/pages/UsersPage';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import { jsonResponse, mockApi, renderApp } from './test/helpers';

// Leaflet needs a real layout engine; the map has its own browser test, so stub it here.
vi.mock('./admin/charts/ComplaintMap', () => ({ default: ({ points }) => <div data-testid="map">{points.length} pins</div> }));

afterEach(() => vi.unstubAllGlobals());

const asAdmin = () => localStorage.setItem('token', 'admin-token');
const getMe = (is_admin = true, username = 'boss') => ({ method: 'POST', path: '/get-me/', respond: () => jsonResponse(200, { username, is_admin }) });
const page = (results, extra = {}) => ({ count: results.length, next: null, previous: null, results, ...extra });

const reporter = { id: 7, username: 'hina', email: 'hina@example.com', full_name: 'Hina Malik' };
const complaint = (id, extra = {}) => ({
  id, user: reporter, shop_name: `Shop ${id}`, shopkeeper_name: 'Keeper', dc_email: 'dc@example.gov.pk', location: 'Main Road',
  description: 'Overcharging customers', photo: null, status: 'Pending', submitted_date: '2026-10-01T10:00:00Z',
  latitude: null, longitude: null, dc_notified_at: null, ...extra,
});

function statsFixture(days = 30, overrides = {}) {
  const by_day = Array.from({ length: days }, (_, i) => ({
    date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, count: i === days - 1 ? 3 : 0,
    pending: i === days - 1 ? 2 : 0, in_progress: i === days - 1 ? 1 : 0, resolved: 0,
  }));
  return {
    range: { days, start: '2026-09-01', end: '2026-09-30' },
    kpis: {
      complaints: { value: days === 7 ? 2 : 12, previous: 6, change_pct: 100 },
      orders: { value: 8, previous: 10, change_pct: -20 },
      order_value: { value: 4500, previous: 4000, change_pct: 12.5 },
      open_complaints: 33, open_by_status: { Pending: 19, 'In Progress': 14 },
      resolution_rate: 30, users: 13, admins: 1, products: 20,
    },
    complaints_by_day: by_day,
    orders_by_day: by_day.map((d) => ({ date: d.date, count: d.count, value: d.count * 100 })),
    complaints_by_status: [{ status: 'Pending', count: 4 }, { status: 'In Progress', count: 3 }, { status: 'Resolved', count: 5 }],
    email_delivery: { emailed: 9, total: 12 },
    top_products: [{ id: 1, name: 'Banana', category: 'Fruit', units: 85, value: 12750 }],
    recent_complaints: [complaint(1)],
    map_points: [{ id: 1, shop_name: 'Shop 1', status: 'Pending', latitude: 31.7, longitude: 73.9 }],
    ...overrides,
  };
}

describe('AdminRoute', () => {
  const ui = () => render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin/*" element={<AdminRoute><p>the dashboard</p></AdminRoute>} />
            <Route path="/auth" element={<p>login screen</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  );

  it('sends logged-out visitors to log in', async () => {
    mockApi([]);
    ui();
    expect(await screen.findByText('login screen')).toBeTruthy();
  });

  it('tells a normal user why they cannot enter, without showing the dashboard', async () => {
    asAdmin();
    mockApi([getMe(false, 'alice')]);
    ui();
    expect(await screen.findByText('Administrators only')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.queryByText('the dashboard')).toBeNull();
  });

  it('lets an admin through', async () => {
    asAdmin();
    mockApi([getMe(true)]);
    ui();
    expect(await screen.findByText('the dashboard')).toBeTruthy();
  });
});

describe('StatTile', () => {
  it('colours a rise as bad when up is bad, and says so in words for screen readers', () => {
    render(<StatTile label="Complaints" value="12" goodWhen="down" delta={{ value: 12, previous: 6, change_pct: 100 }} periodLabel="vs previous 30 days" />);
    expect(screen.getByText('+100%')).toBeTruthy();
    expect(screen.getByText(/worsening/)).toBeTruthy();
    expect(screen.getByText('vs previous 30 days')).toBeTruthy();
  });

  it('treats the same rise as good when up is good, and handles a missing previous period', () => {
    const { rerender } = render(<StatTile label="Orders" value="8" goodWhen="up" delta={{ value: 8, previous: 4, change_pct: 100 }} />);
    expect(screen.getByText(/improving/)).toBeTruthy();
    rerender(<StatTile label="Orders" value="8" delta={{ value: 8, previous: 0, change_pct: null }} />);
    expect(screen.getByText('No earlier data')).toBeTruthy();
  });
});

describe('ColumnChart', () => {
  const data = [
    { key: 'a', label: 'Sep 1', title: 'Mon, Sep 1', values: { Pending: 2, Resolved: 1 } },
    { key: 'b', label: 'Sep 2', title: 'Tue, Sep 2', values: { Pending: 0, Resolved: 4 } },
  ];
  const series = [{ key: 'Pending', label: 'Pending', color: 'red' }, { key: 'Resolved', label: 'Resolved', color: 'green' }];

  it('can be read with the keyboard: arrows move between days and announce every series', async () => {
    render(<ColumnChart data={data} series={series} ariaLabel="Complaints per day" />);
    const chart = screen.getByRole('group', { name: /Complaints per day/ });
    await userEvent.tab();   // keyboard users reach the chart with Tab
    expect(chart.querySelector('[aria-live]').textContent).toBe('Tue, Sep 2: Pending 0, Resolved 4, Total 4');
    await userEvent.keyboard('{ArrowLeft}');
    expect(chart.querySelector('[aria-live]').textContent).toBe('Mon, Sep 1: Pending 2, Resolved 1, Total 3');
    await userEvent.keyboard('{Escape}');
    expect(chart.querySelector('[aria-live]').textContent).toBe('');
  });

  it('says so when there is nothing to plot', () => {
    render(<ColumnChart data={data.map((d) => ({ ...d, values: {} }))} series={series} ariaLabel="Empty" />);
    expect(screen.getByText('No data in this period')).toBeTruthy();
  });
});

describe('Overview', () => {
  const routes = (extra = []) => [
    getMe(true),
    { method: 'GET', path: '/dashboard/stats/?days=30', respond: () => jsonResponse(200, statsFixture(30)) },
    ...extra,
  ];

  it('shows the numbers from the API, with legends that double as direct labels', async () => {
    asAdmin();
    mockApi(routes());
    renderApp(<Overview />, { route: '/admin' });
    expect(await screen.findByText('33')).toBeTruthy();               // hero: open complaints
    expect(screen.getByText(/19 pending · 14 in progress/)).toBeTruthy();
    expect(screen.getByText('Rs 4,500')).toBeTruthy();
    const legend = screen.getAllByRole('list', { name: 'Legend' })[0];
    expect(legend.textContent).toContain('Pending4');
    expect(legend.textContent).toContain('Resolved5');
    expect(screen.getByRole('meter', { name: 'Emailed to the DC' }).getAttribute('aria-valuenow')).toBe('75');
  });

  it('every chart has a table view with the same numbers', async () => {
    asAdmin();
    mockApi(routes());
    renderApp(<Overview />, { route: '/admin' });
    await screen.findByText('33');
    const card = screen.getByRole('region', { name: 'Complaints per day' });
    await userEvent.click(within(card).getByRole('button', { name: 'Table' }));
    expect(within(card).getAllByRole('row')).toHaveLength(31);        // header + 30 days
    const totals = within(card).getAllByRole('row').slice(1).map((r) => Number(r.lastChild.textContent));
    expect(totals.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('labels never run ahead of the data when the range changes', async () => {
    asAdmin();
    let release;
    const slow = new Promise((resolve) => { release = resolve; });
    mockApi(routes([{ method: 'GET', path: '/dashboard/stats/?days=7', respond: () => slow.then(() => jsonResponse(200, statsFixture(7))) }]));
    renderApp(<Overview />, { route: '/admin' });
    await screen.findByText('Complaints, last 30 days');
    await userEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(screen.getByRole('button', { name: 'Last 7 days' }).getAttribute('aria-pressed')).toBe('true');   // instant feedback
    expect(screen.getByText('Complaints, last 30 days')).toBeTruthy();                                       // still the 30-day data
    release();
    expect(await screen.findByText('Complaints, last 7 days')).toBeTruthy();                                // label and data switch together
  });

  it('reports a failed load instead of staying blank', async () => {
    asAdmin();
    mockApi([getMe(true), { method: 'GET', path: /stats/, respond: () => jsonResponse(500, { detail: 'boom' }) }]);
    renderApp(<Overview />, { route: '/admin' });
    expect(await screen.findByText('The dashboard data could not be loaded.')).toBeTruthy();
  });
});

describe('ComplaintsPage', () => {
  const list = [complaint(1), complaint(2, { status: 'Resolved', dc_notified_at: '2026-10-01T10:05:00Z' })];

  it('filters through the API and shows who reported what', async () => {
    asAdmin();
    const fetchMock = mockApi([getMe(true), { method: 'GET', path: /^\/dashboard\/complaints\/\?/, respond: () => jsonResponse(200, page(list)) }]);
    renderApp(<ComplaintsPage />, { route: '/admin/complaints' });
    expect(await screen.findByText('Shop 1')).toBeTruthy();
    expect(screen.getAllByText('Hina Malik')).toHaveLength(2);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Resolved');
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('status=Resolved'))).toBe(true));
  });

  it('changes a status from the drawer and tells the admin the reporter was notified', async () => {
    asAdmin();
    const fetchMock = mockApi([
      getMe(true),
      { method: 'GET', path: /^\/dashboard\/complaints\/\?/, respond: () => jsonResponse(200, page(list)) },
      { method: 'PATCH', path: '/dashboard/complaints/1/', respond: (body) => jsonResponse(200, complaint(1, { status: body.status })) },
    ]);
    renderApp(<ComplaintsPage />, { route: '/admin/complaints' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'View' }))[0]);
    const drawer = await screen.findByRole('dialog');
    await userEvent.click(within(drawer).getByRole('radio', { name: /Resolved/ }));
    expect(await screen.findByText(/Marked as Resolved\. Hina Malik has been notified\./)).toBeTruthy();
    expect(within(drawer).getByRole('radio', { name: /Resolved/ }).getAttribute('aria-checked')).toBe('true');
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ status: 'Resolved' });
  });

  it('shows the server message when the DC email cannot be sent', async () => {
    asAdmin();
    mockApi([
      getMe(true),
      { method: 'GET', path: /^\/dashboard\/complaints\/\?/, respond: () => jsonResponse(200, page(list)) },
      { method: 'POST', path: '/dashboard/complaints/1/resend-email/', respond: () => jsonResponse(502, { detail: 'The email could not be sent. Check the email settings on the server.' }) },
    ]);
    renderApp(<ComplaintsPage />, { route: '/admin/complaints' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'View' }))[0]);
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));
    expect(await screen.findByText(/could not be sent/)).toBeTruthy();
  });

  it('closes the drawer with Escape', async () => {
    asAdmin();
    mockApi([getMe(true), { method: 'GET', path: /^\/dashboard\/complaints\/\?/, respond: () => jsonResponse(200, page(list)) }]);
    renderApp(<ComplaintsPage />, { route: '/admin/complaints' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'View' }))[0]);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ProductsPage', () => {
  const products = [
    { id: 1, name: 'Apple', category: 'Fruit', price: '280.00', date_updated: '2026-10-01', in_open_carts: 0, in_saved_orders: 3 },
    { id: 2, name: 'Mint', category: 'Other', price: '30.00', date_updated: '2026-10-01', in_open_carts: 1, in_saved_orders: 0 },
  ];
  const listRoute = { method: 'GET', path: /^\/dashboard\/products\/\?/, respond: () => jsonResponse(200, page(products)) };

  it('shows field errors from the server next to the field', async () => {
    asAdmin();
    mockApi([getMe(true), listRoute, { method: 'POST', path: '/dashboard/products/', respond: () => jsonResponse(400, { name: ['A fruit called "Apple" already exists.'] }) }]);
    renderApp(<ProductsPage />, { route: '/admin/products' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add product' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Apple');
    await userEvent.type(within(dialog).getByLabelText('Price (Rs)'), '150');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add product' }));
    const message = await within(dialog).findByText(/already exists/);
    expect(within(dialog).getByLabelText('Name').getAttribute('aria-describedby')).toBe(message.id);
    expect(within(dialog).getByLabelText('Name').getAttribute('aria-invalid')).toBe('true');
  });

  it('warns before deleting a product that is in saved orders, without calling the API', async () => {
    asAdmin();
    const fetchMock = mockApi([getMe(true), listRoute]);
    renderApp(<ProductsPage />, { route: '/admin/products' });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Apple' }));
    expect(await screen.findByText(/appears in 3 saved order line\(s\), so it cannot be deleted/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false);
  });

  it('deletes an unused product after confirmation', async () => {
    asAdmin();
    const fetchMock = mockApi([getMe(true), listRoute, { method: 'DELETE', path: '/dashboard/products/2/', respond: () => jsonResponse(204, undefined) }]);
    renderApp(<ProductsPage />, { route: '/admin/products' });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Mint' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete product' }));
    expect(await screen.findByText('Deleted Mint.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === 'DELETE' && String(u).endsWith('/dashboard/products/2/'))).toBe(true);
  });
});

describe('UsersPage', () => {
  const users = [
    { id: 1, username: 'boss', email: 'boss@example.com', full_name: 'The Boss', is_admin: true, complaints: 0, orders: 0 },
    { id: 2, username: 'hina', email: 'hina@example.com', full_name: 'Hina Malik', is_admin: false, complaints: 4, orders: 9 },
  ];
  const listRoute = { method: 'GET', path: /^\/dashboard\/users\/\?/, respond: () => jsonResponse(200, page(users)) };

  beforeEach(asAdmin);

  it('never offers a role change on your own row', async () => {
    mockApi([getMe(true, 'boss'), listRoute]);
    renderApp(<UsersPage />, { route: '/admin/users' });
    await screen.findByText('Hina Malik');
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /admin/i })).toHaveLength(1);   // only hina's "Make admin"
  });

  it('asks for confirmation, then promotes', async () => {
    const fetchMock = mockApi([getMe(true, 'boss'), listRoute, { method: 'PATCH', path: '/dashboard/users/2/', respond: () => jsonResponse(200, { ...users[1], is_admin: true }) }]);
    renderApp(<UsersPage />, { route: '/admin/users' });
    await userEvent.click(await screen.findByRole('button', { name: 'Make admin' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/see every complaint, order and user/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);   // nothing yet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Make admin' }));
    expect(await screen.findByText('hina is now an admin.')).toBeTruthy();
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ is_admin: true });
  });
});
