import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, pageSize, count, onPage, onPageSize }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = count ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(count, page * pageSize);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px]" style={{ borderColor: 'var(--border)' }} aria-label="Pagination">
      <p className="muted num" aria-live="polite">{count ? `Showing ${from}–${to} of ${count}` : 'No results'}</p>
      <div className="flex items-center gap-3">
        <label className="muted flex items-center gap-2">
          Rows
          <select className="adm-select" style={{ height: 30 }} aria-label="Rows per page" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" className="adm-btn adm-btn-sm adm-icon-btn" style={{ width: 30 }} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <FiChevronLeft aria-hidden="true" />
          </button>
          <span className="num ink-2 px-2">Page {page} of {pages}</span>
          <button type="button" className="adm-btn adm-btn-sm adm-icon-btn" style={{ width: 30 }} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
