import { useEffect, useState } from 'react';
import { FiShield, FiUser } from 'react-icons/fi';
import { api } from '../../api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import { fmtInt } from '../charts/chartUtils';
import { initials } from '../format';
import { useDebounced } from '../useDebounced';
import { useFetch } from '../useFetch';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataTable from '../ui/DataTable';
import { SearchBox, SelectFilter } from '../ui/Filters';
import PageHeader from '../ui/PageHeader';
import Pagination from '../ui/Pagination';

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [filters, setFilters] = useState({ role: '', search: '' });
  const [ordering, setOrdering] = useState('username');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounced(filters.search);
  const { data, loading, error, reload } = useFetch('/dashboard/users/', { role: filters.role, search, ordering, page, page_size: pageSize });

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error, toast]);

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const changeRole = async () => {
    setBusy(true);
    try {
      await api.patch(`/dashboard/users/${target.id}/`, { is_admin: !target.is_admin });
      toast.success(target.is_admin ? `${target.username} is no longer an admin.` : `${target.username} is now an admin.`);
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'user', header: 'User', sortKey: 'username',
      render: (u) => (
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }} aria-hidden="true">{initials(u.full_name || u.username)}</span>
          <span><p className="font-medium">{u.full_name || u.username}</p><p className="muted text-[12.5px]">@{u.username} · {u.email}</p></span>
        </span>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (u) => (u.is_admin ? <span className="adm-badge" style={{ color: 'var(--accent)' }}><FiShield aria-hidden="true" size={13} /> Admin</span> : <span className="adm-badge"><FiUser aria-hidden="true" size={13} /> User</span>),
    },
    { key: 'complaints', header: 'Complaints', sortKey: 'complaints', align: 'right', render: (u) => fmtInt(u.complaints) },
    { key: 'orders', header: 'Orders', sortKey: 'orders', align: 'right', render: (u) => fmtInt(u.orders) },
    {
      key: 'action', header: '', align: 'right',
      render: (u) =>
        u.username === me.username ? (
          <span className="muted text-[12.5px]">You</span>
        ) : (
          <button type="button" className="adm-btn adm-btn-sm" onClick={() => setTarget(u)}>{u.is_admin ? 'Remove admin' : 'Make admin'}</button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who has registered, and who can use this dashboard." />
      <div className="adm-card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={filters.search} onChange={(s) => update({ search: s })} placeholder="Search name, username or email…" label="Search users" />
          <SelectFilter label="Role" value={filters.role} onChange={(role) => update({ role })} options={[['', 'Everyone'], ['admin', 'Admins'], ['user', 'Users']]} />
        </div>
        <DataTable
          caption="Users"
          columns={columns}
          rows={data?.results ?? []}
          loading={loading}
          busy={loading && Boolean(data)}
          ordering={ordering}
          onOrdering={(o) => { setOrdering(o); setPage(1); }}
          empty="No users match these filters."
        />
        <Pagination page={page} pageSize={pageSize} count={data?.count ?? 0} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {target && (
        <ConfirmDialog
          busy={busy}
          danger={target.is_admin}
          title={target.is_admin ? `Remove admin access from ${target.username}?` : `Make ${target.username} an admin?`}
          message={
            target.is_admin
              ? 'They will immediately lose access to this dashboard.'
              : 'They will be able to see every complaint, order and user, change complaint statuses and edit product prices.'
          }
          confirmLabel={target.is_admin ? 'Remove admin' : 'Make admin'}
          onConfirm={changeRole}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
