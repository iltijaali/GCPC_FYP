import { useEffect, useState } from 'react';
import { useToast } from '../../context/useToast';
import { fmtInt, fmtRs } from '../charts/chartUtils';
import { fmtDateTime, timeAgo } from '../format';
import { useDebounced } from '../useDebounced';
import { useFetch } from '../useFetch';
import DataTable from '../ui/DataTable';
import { SearchBox, SelectFilter } from '../ui/Filters';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import Pagination from '../ui/Pagination';

export default function OrdersPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ days: '', search: '' });
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const search = useDebounced(filters.search);
  const { data, loading, error } = useFetch('/dashboard/orders/', { days: filters.days, search, ordering, page, page_size: pageSize });

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error, toast]);

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const columns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-medium">#{o.id}</span> },
    { key: 'customer', header: 'Customer', render: (o) => (<><p>{o.user.full_name || o.user.username}</p><p className="muted text-[12.5px]">{o.user.email}</p></>) },
    { key: 'date', header: 'Date', sortKey: 'created_at', render: (o) => (<><p>{timeAgo(o.created_at)}</p><p className="muted text-[12.5px]">{fmtDateTime(o.created_at)}</p></>) },
    { key: 'items', header: 'Items', align: 'right', render: (o) => fmtInt(o.item_count) },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <strong>{fmtRs(o.total)}</strong> },
    { key: 'view', header: '', align: 'right', render: (o) => <button type="button" className="adm-btn adm-btn-sm" onClick={() => setSelected(o)}>Details</button> },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="Carts that customers have saved. Totals use today's prices." />
      <div className="adm-card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={filters.search} onChange={(s) => update({ search: s })} placeholder="Search customer or product…" label="Search orders" />
          <SelectFilter label="Period" value={filters.days} onChange={(days) => update({ days })} options={[['', 'All time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} />
        </div>
        <DataTable
          caption="Orders"
          columns={columns}
          rows={data?.results ?? []}
          loading={loading}
          busy={loading && Boolean(data)}
          ordering={ordering}
          onOrdering={(o) => { setOrdering(o); setPage(1); }}
          onRowClick={setSelected}
          empty="No orders match these filters."
        />
        <Pagination page={page} pageSize={pageSize} count={data?.count ?? 0} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {selected && (
        <Modal title={`Order #${selected.id}`} onClose={() => setSelected(null)} width={560}>
          <p className="muted mb-4">
            {selected.user.full_name || selected.user.username} · {selected.user.email} · {fmtDateTime(selected.created_at)}
          </p>
          <table className="adm-table">
            <caption className="sr-only">Items in order {selected.id}</caption>
            <thead>
              <tr><th scope="col">Product</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Price</th><th scope="col" className="num">Total</th></tr>
            </thead>
            <tbody>
              {selected.items.map((line) => (
                <tr key={line.product}>
                  <td>{line.product} <span className="muted text-[12px]">· {line.category}</span></td>
                  <td className="num">{line.quantity}</td>
                  <td className="num">{fmtRs(line.unit_price)}</td>
                  <td className="num">{fmtRs(line.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="num"><strong>Order total</strong></td><td className="num"><strong>{fmtRs(selected.total)}</strong></td></tr>
            </tfoot>
          </table>
        </Modal>
      )}
    </>
  );
}
