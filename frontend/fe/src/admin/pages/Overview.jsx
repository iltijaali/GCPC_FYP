import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiFlag, FiRefreshCw, FiShoppingBag, FiTag, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { useToast } from '../../context/useToast';
import { fmtCompact, fmtDay, fmtDayLong, fmtInt, fmtPct, fmtRs } from '../charts/chartUtils';
import ChartCard from '../charts/ChartCard';
import ColumnChart from '../charts/ColumnChart';
import ComplaintMap from '../charts/ComplaintMap';
import HBarChart from '../charts/HBarChart';
import Legend from '../charts/Legend';
import LineAreaChart from '../charts/LineAreaChart';
import Meter from '../charts/Meter';
import PartToWholeBar from '../charts/PartToWholeBar';
import StatTile from '../charts/StatTile';
import { timeAgo } from '../format';
import { STATUS_META, STATUSES } from '../statusMeta';
import StatusBadge from '../ui/StatusBadge';
import PageHeader from '../ui/PageHeader';
import { useFetch } from '../useFetch';

const RANGES = [7, 30, 90];
const COMMERCE = 'var(--s-commerce)';

export default function Overview() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('days'));
  const days = RANGES.includes(requested) ? requested : 30;
  const { data, loading, error, reload } = useFetch('/dashboard/stats/', { days });

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error, toast]);

  // Labels follow the data that is actually on screen (the old data stays visible while a new range loads),
  // so a number and its label can never disagree. The buttons still react instantly to the click.
  const shown = data?.range.days ?? days;
  const period = `vs previous ${shown} days`;
  const busy = loading && Boolean(data);

  const view = useMemo(() => {
    if (!data) return null;
    const label = (d) => fmtDay(d.date);
    const complaintsByDay = data.complaints_by_day.map((d) => ({
      key: d.date,
      label: label(d),
      title: fmtDayLong(d.date),
      values: { Pending: d.pending, 'In Progress': d.in_progress, Resolved: d.resolved },
    }));
    const ordersByDay = data.orders_by_day.map((d) => ({ key: d.date, label: label(d), title: fmtDayLong(d.date), values: { orders: d.count } }));
    const valueByDay = data.orders_by_day.map((d) => ({ key: d.date, label: label(d), title: fmtDayLong(d.date), value: d.value }));
    const statusTotals = Object.fromEntries(data.complaints_by_status.map((s) => [s.status, s.count]));
    return { complaintsByDay, ordersByDay, valueByDay, statusTotals };
  }, [data]);

  const setDays = (value) => setParams(value === 30 ? {} : { days: value }, { replace: true });

  return (
    <>
      <PageHeader title="Overview" subtitle="How complaints, orders and prices are doing across the platform.">
        <div className="adm-segmented" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>Last {r} days</button>
          ))}
        </div>
        <button type="button" className="adm-btn adm-icon-btn" onClick={reload} aria-label="Refresh" title="Refresh">
          <FiRefreshCw aria-hidden="true" className={busy ? 'animate-spin' : ''} />
        </button>
      </PageHeader>

      {!data ? (
        <p className="muted py-20 text-center" role="status">{error ? 'The dashboard data could not be loaded.' : 'Loading the dashboard…'}</p>
      ) : (
        <div className="space-y-4" aria-busy={busy}>
          {/* ---- headline numbers ---- */}
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${busy ? 'adm-refetching' : ''}`}>
            <div className="sm:col-span-2">
              <StatTile
                hero
                icon={FiAlertCircle}
                label="Open complaints"
                value={fmtInt(data.kpis.open_complaints)}
                foot={`${fmtInt(data.kpis.open_by_status.Pending)} pending · ${fmtInt(data.kpis.open_by_status['In Progress'])} in progress · all time`}
              >
                <div className="space-y-3">
                  {/* the split of what is still open; the counts are written out in the line below */}
                  <div aria-hidden="true" className="flex h-2 w-full max-w-[440px] overflow-hidden rounded">
                    {[['Pending', 'var(--s-pending)'], ['In Progress', 'var(--s-progress)']].filter(([k]) => data.kpis.open_by_status[k] > 0).map(([k, color]) => (
                      <div key={k} style={{ flex: data.kpis.open_by_status[k], background: color, marginRight: 2 }} />
                    ))}
                  </div>
                  <Link to="/admin/complaints?status=Pending" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                    Review pending complaints <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </StatTile>
            </div>
            <StatTile
              icon={FiFlag}
              label={`Complaints, last ${shown} days`}
              value={fmtInt(data.kpis.complaints.value)}
              delta={data.kpis.complaints}
              goodWhen="down"
              periodLabel={period}
              spark={data.complaints_by_day.map((d) => d.count)}
              sparkLabel="Complaints per day"
            />
            <StatTile
              icon={FiCheckCircle}
              label="Resolution rate"
              value={data.kpis.resolution_rate == null ? '–' : fmtPct(data.kpis.resolution_rate)}
              foot={`of complaints in the last ${shown} days`}
            />
            <StatTile
              icon={FiShoppingBag}
              label={`Orders, last ${shown} days`}
              value={fmtInt(data.kpis.orders.value)}
              delta={data.kpis.orders}
              periodLabel={period}
              spark={data.orders_by_day.map((d) => d.count)}
              sparkLabel="Orders per day"
            />
            <StatTile
              icon={FiTrendingUp}
              label="Order value"
              value={fmtRs(data.kpis.order_value.value)}
              delta={data.kpis.order_value}
              periodLabel={period}
              spark={data.orders_by_day.map((d) => d.value)}
              sparkLabel="Order value per day"
              foot="at current prices"
            />
            <StatTile icon={FiUsers} label="Registered users" value={fmtInt(data.kpis.users)} foot={`${data.kpis.admins} admin${data.kpis.admins === 1 ? '' : 's'}`} />
            <StatTile icon={FiTag} label="Products listed" value={fmtInt(data.kpis.products)} foot="fruits, vegetables and more" />
          </div>

          {/* ---- complaints ---- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              busy={busy}
              title="Complaints per day"
              subtitle={`Submitted in the last ${shown} days, split by their current status`}
              legend={
                <Legend
                  items={STATUSES.map((s) => ({ key: s, label: s, color: STATUS_META[s].color, value: fmtInt(view.statusTotals[s] || 0) }))}
                />
              }
              table={{
                columns: [{ key: 'date', label: 'Date' }, ...STATUSES.map((s) => ({ key: s, label: s, align: 'right' })), { key: 'total', label: 'Total', align: 'right' }],
                rows: data.complaints_by_day.map((d) => ({
                  key: d.date, date: fmtDayLong(d.date), Pending: d.pending, 'In Progress': d.in_progress, Resolved: d.resolved, total: d.count,
                })),
              }}
            >
              <ColumnChart
                data={view.complaintsByDay}
                series={STATUSES.map((s) => ({ key: s, label: s, color: STATUS_META[s].color }))}
                ariaLabel={`Complaints per day over the last ${shown} days, stacked by status`}
              />
            </ChartCard>

            <ChartCard
              busy={busy}
              title="Complaints by status"
              subtitle={`Last ${shown} days`}
              table={{
                columns: [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Complaints', align: 'right' }],
                rows: data.complaints_by_status.map((s) => ({ key: s.status, status: s.status, count: s.count })),
              }}
            >
              <PartToWholeBar
                ariaLabel="Complaints by status"
                segments={STATUSES.map((s) => ({ key: s, label: s, value: view.statusTotals[s] || 0, color: STATUS_META[s].color }))}
              />
              <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <Meter label="Emailed to the DC" value={data.email_delivery.emailed} total={data.email_delivery.total} />
              </div>
            </ChartCard>
          </div>

          {/* ---- commerce ---- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              busy={busy}
              title="Orders per day"
              subtitle="Saved carts, by the day they were created"
              table={{
                columns: [{ key: 'date', label: 'Date' }, { key: 'orders', label: 'Orders', align: 'right' }],
                rows: data.orders_by_day.map((d) => ({ key: d.date, date: fmtDayLong(d.date), orders: d.count })),
              }}
            >
              <ColumnChart
                data={view.ordersByDay}
                series={[{ key: 'orders', label: 'Orders', color: COMMERCE }]}
                stacked={false}
                height={276}
                ariaLabel={`Orders per day over the last ${shown} days`}
              />
            </ChartCard>

            <ChartCard
              busy={busy}
              title="Order value per day"
              subtitle="At today's prices, in Rs"
              table={{
                columns: [{ key: 'date', label: 'Date' }, { key: 'value', label: 'Value (Rs)', align: 'right' }],
                rows: data.orders_by_day.map((d) => ({ key: d.date, date: fmtDayLong(d.date), value: fmtInt(d.value) })),
              }}
            >
              <LineAreaChart
                data={view.valueByDay}
                color={COMMERCE}
                seriesLabel="Order value"
                valueFormat={fmtRs}
                height={276}
                ariaLabel={`Order value per day over the last ${shown} days`}
              />
            </ChartCard>

            <ChartCard
              busy={busy}
              title="Top products"
              subtitle={`Units ordered in the last ${shown} days`}
              table={{
                columns: [
                  { key: 'name', label: 'Product' }, { key: 'category', label: 'Category' },
                  { key: 'units', label: 'Units', align: 'right' }, { key: 'value', label: 'Value (Rs)', align: 'right' },
                ],
                rows: data.top_products.map((p) => ({ key: p.id, name: p.name, category: p.category, units: fmtInt(p.units), value: fmtInt(p.value) })),
              }}
            >
              <HBarChart
                color={COMMERCE}
                seriesLabel="units"
                valueFormat={fmtCompact}
                ariaLabel={`Top ${data.top_products.length} products by units ordered`}
                data={data.top_products.map((p) => ({
                  key: p.id,
                  label: p.name,
                  value: p.units,
                  detail: [
                    { label: 'Units', value: fmtInt(p.units) },
                    { label: 'Value', value: fmtRs(p.value) },
                    { label: 'Category', value: p.category },
                  ],
                }))}
              />
            </ChartCard>
          </div>

          {/* ---- where and what ---- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              busy={busy}
              title="Complaint locations"
              subtitle={`${data.map_points.length} complaint${data.map_points.length === 1 ? '' : 's'} with a map pin, last ${shown} days`}
              legend={
                <Legend items={STATUSES.map((s) => ({
                  key: s, label: s, color: STATUS_META[s].color,
                  value: fmtInt(data.map_points.filter((p) => p.status === s).length),
                }))} />
              }
              table={{
                columns: [{ key: 'shop', label: 'Shop' }, { key: 'status', label: 'Status' }, { key: 'lat', label: 'Latitude', align: 'right' }, { key: 'lng', label: 'Longitude', align: 'right' }],
                rows: data.map_points.map((p) => ({ key: p.id, shop: p.shop_name, status: p.status, lat: p.latitude.toFixed(4), lng: p.longitude.toFixed(4) })),
              }}
            >
              <ComplaintMap points={data.map_points} />
            </ChartCard>

            <section className={`adm-card ${busy ? 'adm-refetching' : ''}`} aria-labelledby="recent-heading">
              <header className="flex items-center justify-between px-5 pb-2 pt-4">
                <h3 id="recent-heading" className="text-[15px]">Latest complaints</h3>
                <Link to="/admin/complaints" className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                  View all <FiArrowRight aria-hidden="true" />
                </Link>
              </header>
              <ul>
                {data.recent_complaints.map((c) => (
                  <li key={c.id} className="border-t" style={{ borderColor: 'var(--grid)' }}>
                    <Link to={`/admin/complaints?open=${c.id}`} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-[var(--hover)]">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.shop_name}</p>
                        <p className="muted truncate text-[12.5px]">{c.user.full_name || c.user.username} · {timeAgo(c.submitted_date)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
                {!data.recent_complaints.length && <li className="muted px-5 py-8 text-center">No complaints yet.</li>}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
