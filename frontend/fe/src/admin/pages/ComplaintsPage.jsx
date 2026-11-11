import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCheck, FiDownload, FiExternalLink, FiMail, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { API_URL, api, buildQuery, download } from '../../api';
import { useToast } from '../../context/useToast';
import ComplaintMap from '../charts/ComplaintMap';
import { fmtDateTime, timeAgo } from '../format';
import { STATUS_META, STATUSES } from '../statusMeta';
import { useDebounced } from '../useDebounced';
import { useFetch } from '../useFetch';
import DataTable from '../ui/DataTable';
import { SearchBox, SelectFilter } from '../ui/Filters';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import Pagination from '../ui/Pagination';
import StatusBadge from '../ui/StatusBadge';

export default function ComplaintsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: params.get('status') || '', emailed: '', days: '', search: '' });
  const [ordering, setOrdering] = useState('-submitted_date');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const search = useDebounced(filters.search);

  const query = { status: filters.status, emailed: filters.emailed, days: filters.days, search, ordering };
  const { data, loading, error, reload, mutate } = useFetch('/dashboard/complaints/', { ...query, page, page_size: pageSize });

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error, toast]);

  // /admin/complaints?open=12 (from the overview) opens that complaint straight away
  const openId = params.get('open');
  useEffect(() => {
    if (!openId) return;
    api.get(`/dashboard/complaints/${openId}/`).then(setSelected).catch((e) => toast.error(e.message));
    setParams((p) => {
      p.delete('open');
      return p;
    }, { replace: true });
  }, [openId, setParams, toast]);

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const replaceRow = useCallback((complaint) => {
    mutate((d) => ({ ...d, results: d.results.map((r) => (r.id === complaint.id ? complaint : r)) }));
    setSelected((s) => (s && s.id === complaint.id ? complaint : s));
  }, [mutate]);

  const exportCsv = async () => {
    try {
      await download(`/dashboard/complaints/export/${buildQuery(query)}`, 'complaints.csv');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columns = [
    {
      key: 'shop', header: 'Shop', sortKey: 'shop_name',
      render: (c) => (<><p className="font-medium">{c.shop_name}</p><p className="muted text-[12.5px]">{c.shopkeeper_name}</p></>),
    },
    { key: 'reporter', header: 'Reported by', render: (c) => c.user.full_name || c.user.username },
    { key: 'location', header: 'Location', render: (c) => <span className="ink-2">{c.location}</span> },
    {
      key: 'submitted', header: 'Submitted', sortKey: 'submitted_date',
      render: (c) => (<><p>{timeAgo(c.submitted_date)}</p><p className="muted text-[12.5px]">{fmtDateTime(c.submitted_date)}</p></>),
    },
    { key: 'status', header: 'Status', sortKey: 'status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'email', header: 'DC email', render: (c) => <EmailState complaint={c} /> },
    { key: 'open', header: '', align: 'right', render: (c) => <button type="button" className="adm-btn adm-btn-sm" onClick={() => setSelected(c)}>View</button> },
  ];

  return (
    <>
      <PageHeader title="Complaints" subtitle="Review reports from citizens, update their status and make sure the DC was told.">
        <button type="button" className="adm-btn" onClick={exportCsv}><FiDownload aria-hidden="true" /> Export CSV</button>
      </PageHeader>

      <div className="adm-card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <SearchBox value={filters.search} onChange={(search) => update({ search })} placeholder="Search shop, location, reporter…" label="Search complaints" />
          <SelectFilter label="Status" value={filters.status} onChange={(status) => update({ status })} options={[['', 'All'], ...STATUSES.map((s) => [s, s])]} />
          <SelectFilter label="DC email" value={filters.emailed} onChange={(emailed) => update({ emailed })} options={[['', 'All'], ['true', 'Sent'], ['false', 'Not sent']]} />
          <SelectFilter label="Period" value={filters.days} onChange={(days) => update({ days })} options={[['', 'All time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} />
        </div>
        <DataTable
          caption="Complaints"
          columns={columns}
          rows={data?.results ?? []}
          loading={loading}
          busy={loading && Boolean(data)}
          ordering={ordering}
          onOrdering={(o) => { setOrdering(o); setPage(1); }}
          onRowClick={setSelected}
          empty="No complaints match these filters."
        />
        <Pagination page={page} pageSize={pageSize} count={data?.count ?? 0} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>

      {selected && <ComplaintDrawer complaint={selected} onClose={() => setSelected(null)} onChanged={replaceRow} onReload={reload} />}
    </>
  );
}

function EmailState({ complaint }) {
  return complaint.dc_notified_at ? (
    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--good-text)' }} title={`Sent ${fmtDateTime(complaint.dc_notified_at)}`}>
      <FiCheck aria-hidden="true" /> Sent
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--bad-text)' }} title="The DC has not been emailed yet">
      <FiAlertCircle aria-hidden="true" /> Not sent
    </span>
  );
}

function ComplaintDrawer({ complaint, onClose, onChanged, onReload }) {
  const toast = useToast();
  const [saving, setSaving] = useState(null);
  const [resending, setResending] = useState(false);
  const photo = complaint.photo && (complaint.photo.startsWith('http') ? complaint.photo : `${API_URL}${complaint.photo}`);
  const hasPin = complaint.latitude != null && complaint.longitude != null;

  const setStatus = async (status) => {
    if (status === complaint.status || saving) return;
    setSaving(status);
    try {
      const updated = await api.patch(`/dashboard/complaints/${complaint.id}/`, { status });
      onChanged(updated);
      toast.success(`Marked as ${status}. ${complaint.user.full_name || complaint.user.username} has been notified.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      onChanged(await api.post(`/dashboard/complaints/${complaint.id}/resend-email/`));
      toast.success(`Emailed to ${complaint.dc_email}.`);
      onReload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal side="right" width={520} title={complaint.shop_name} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={complaint.status} />
          <span className="muted text-[12.5px]">Complaint #{complaint.id} · submitted {fmtDateTime(complaint.submitted_date)}</span>
        </div>

        <section aria-labelledby="status-heading">
          <h3 id="status-heading" className="adm-label">Status</h3>
          <div className="adm-segmented w-full" role="radiogroup" aria-label="Complaint status">
            {STATUSES.map((s) => {
              const { Icon, color } = STATUS_META[s];
              return (
                <button key={s} type="button" role="radio" aria-checked={complaint.status === s} disabled={Boolean(saving)} onClick={() => setStatus(s)} className="flex-1 justify-center">
                  <span className="adm-dot" style={{ background: color }} aria-hidden="true" />
                  <Icon aria-hidden="true" size={13} />
                  {saving === s ? 'Saving…' : s}
                </button>
              );
            })}
          </div>
          <p className="muted mt-2 text-[12.5px]">Changing the status sends the reporter a notification.</p>
        </section>

        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[13.5px]">
          <dt className="muted">Shopkeeper</dt><dd>{complaint.shopkeeper_name}</dd>
          <dt className="muted">Location</dt><dd>{complaint.location}</dd>
          <dt className="muted">Reported by</dt>
          <dd>
            {complaint.user.full_name || complaint.user.username}
            <span className="muted"> · @{complaint.user.username}</span>
            <br />
            <a href={`mailto:${complaint.user.email}`} className="underline" style={{ color: 'var(--accent)' }}>{complaint.user.email}</a>
          </dd>
        </dl>

        <section>
          <h3 className="adm-label">What happened</h3>
          <p className="ink-2 whitespace-pre-wrap">{complaint.description}</p>
        </section>

        {photo && (
          <section>
            <h3 className="adm-label">Photo</h3>
            <a href={photo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] underline" style={{ color: 'var(--accent)' }}>
              Open full size <FiExternalLink aria-hidden="true" />
            </a>
            <img src={photo} alt={`Evidence for the complaint about ${complaint.shop_name}`} className="mt-2 max-h-64 w-full rounded-lg border object-cover" style={{ borderColor: 'var(--border)' }} />
          </section>
        )}

        {hasPin && (
          <section>
            <h3 className="adm-label flex items-center gap-1.5"><FiMapPin aria-hidden="true" /> Pinned location</h3>
            <ComplaintMap height={190} points={[{ id: complaint.id, shop_name: complaint.shop_name, status: complaint.status, latitude: complaint.latitude, longitude: complaint.longitude }]} />
            <a
              href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
              target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] underline" style={{ color: 'var(--accent)' }}
            >
              {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)} <FiExternalLink aria-hidden="true" />
            </a>
          </section>
        )}

        <section className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <h3 className="adm-label flex items-center gap-1.5"><FiMail aria-hidden="true" /> District Commissioner</h3>
          <p className="break-all">{complaint.dc_email}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <EmailState complaint={complaint} />
            <button type="button" className="adm-btn adm-btn-sm" onClick={resend} disabled={resending}>
              <FiRefreshCw aria-hidden="true" className={resending ? 'animate-spin' : ''} /> {resending ? 'Sending…' : complaint.dc_notified_at ? 'Send again' : 'Send now'}
            </button>
          </div>
          {complaint.dc_notified_at && <p className="muted mt-1 text-[12.5px]">Last sent {fmtDateTime(complaint.dc_notified_at)}</p>}
        </section>
      </div>
    </Modal>
  );
}
