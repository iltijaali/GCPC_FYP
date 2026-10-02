import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { api } from '../../api';
import { useToast } from '../../context/useToast';
import { fmtInt } from '../charts/chartUtils';
import { fmtDate } from '../format';
import { useDebounced } from '../useDebounced';
import { useFetch } from '../useFetch';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable from '../ui/DataTable';
import { SearchBox, SelectFilter } from '../ui/Filters';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import Pagination from '../ui/Pagination';

const CATEGORIES = ['Fruit', 'Vegetable', 'Other'];

export default function ProductsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ category: '', search: '' });
  const [ordering, setOrdering] = useState('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState(null);   // null | 'new' | product
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounced(filters.search);

  const { data, loading, error, reload } = useFetch('/dashboard/products/', { category: filters.category, search, ordering, page, page_size: pageSize });

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error, toast]);

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.del(`/dashboard/products/${deleting.id}/`);
      toast.success(`Deleted ${deleting.name}.`);
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(e.message); // e.g. "appears in 3 saved order lines, so it cannot be deleted"
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Product', sortKey: 'name', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Category', sortKey: 'category', render: (p) => <span className="adm-badge">{p.category}</span> },
    { key: 'price', header: 'Price (Rs)', sortKey: 'price', align: 'right', render: (p) => <strong>{fmtInt(p.price)}{Number(p.price) % 1 ? `.${String(p.price).split('.')[1]}` : ''}</strong> },
    { key: 'updated', header: 'Price updated', sortKey: 'date_updated', render: (p) => <span className="ink-2">{fmtDate(p.date_updated)}</span> },
    { key: 'orders', header: 'In orders', align: 'right', render: (p) => <span className="ink-2" title={`${p.in_open_carts} open cart line(s)`}>{fmtInt(p.in_saved_orders)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (p) => (
        <span className="inline-flex gap-1.5">
          <button type="button" className="adm-btn adm-btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><FiEdit2 aria-hidden="true" /> Edit</button>
          <button type="button" className="adm-btn adm-btn-sm adm-icon-btn" style={{ width: 30, color: 'var(--danger)' }} onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}><FiTrash2 aria-hidden="true" /></button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Products" subtitle="Prices shown to every citizen. Changes apply immediately.">
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => setEditing('new')}><FiPlus aria-hidden="true" /> Add product</button>
      </PageHeader>

      <div className="adm-card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={filters.search} onChange={(s) => update({ search: s })} placeholder="Search products…" label="Search products" />
          <SelectFilter label="Category" value={filters.category} onChange={(category) => update({ category })} options={[['', 'All'], ...CATEGORIES.map((c) => [c, c])]} />
        </div>
        <DataTable
          caption="Products"
          columns={columns}
          rows={data?.results ?? []}
          loading={loading}
          busy={loading && Boolean(data)}
          ordering={ordering}
          onOrdering={(o) => { setOrdering(o); setPage(1); }}
          empty="No products match these filters."
        />
        <Pagination page={page} pageSize={pageSize} count={data?.count ?? 0} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          danger
          busy={busy}
          title={`Delete ${deleting.name}?`}
          message={
            deleting.in_saved_orders
              ? `${deleting.name} appears in ${deleting.in_saved_orders} saved order line(s), so it cannot be deleted. Edit it instead.`
              : `This removes ${deleting.name} from the price list${deleting.in_open_carts ? ` and from ${deleting.in_open_carts} open cart(s)` : ''}. This cannot be undone.`
          }
          confirmLabel="Delete product"
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: product?.name ?? '', category: product?.category ?? 'Fruit', price: product?.price ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const body = { name: form.name.trim(), category: form.category, price: form.price };
      if (product) await api.patch(`/dashboard/products/${product.id}/`, body);
      else await api.post('/dashboard/products/', body);
      toast.success(product ? `Saved ${body.name}.` : `Added ${body.name}.`);
      onSaved();
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' && !err.data.detail ? err.data : null;
      if (fieldErrors) setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, [].concat(v).join(' ')])));
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `err-${name}` : undefined });
  return (
    <Modal
      title={product ? `Edit ${product.name}` : 'Add a product'}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button type="button" className="adm-btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="product-form" className="adm-btn adm-btn-primary" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="adm-label" htmlFor="p-name">Name</label>
          <input id="p-name" className="adm-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required autoFocus {...field('name')} />
          {errors.name && <p id="err-name" className="adm-error">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="adm-label" htmlFor="p-category">Category</label>
            <select id="p-category" className="adm-select w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} {...field('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {errors.category && <p id="err-category" className="adm-error">{errors.category}</p>}
          </div>
          <div>
            <label className="adm-label" htmlFor="p-price">Price (Rs)</label>
            <input id="p-price" className="adm-input w-full" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required {...field('price')} />
            {errors.price && <p id="err-price" className="adm-error">{errors.price}</p>}
          </div>
        </div>
        {errors.non_field_errors && <p className="adm-error">{errors.non_field_errors}</p>}
      </form>
    </Modal>
  );
}
