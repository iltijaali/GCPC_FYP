import { FiArrowDown, FiArrowUp, FiInbox } from 'react-icons/fi';

// columns: [{ key, header, render(row), sortKey?, align?: 'right', width? }]
// ordering: '-submitted_date' style string; onOrdering(newOrdering) is called when a sortable header is clicked.
export default function DataTable({ columns, rows, rowKey = (r) => r.id, loading, ordering, onOrdering, onRowClick, empty, caption, busy }) {
  const sortFor = (col) => {
    if (!col.sortKey) return undefined;
    if (ordering === col.sortKey) return 'ascending';
    if (ordering === `-${col.sortKey}`) return 'descending';
    return 'none';
  };
  const toggle = (col) => onOrdering(ordering === col.sortKey ? `-${col.sortKey}` : col.sortKey);

  return (
    <div className={`adm-table-wrap ${busy ? 'adm-refetching' : ''}`}>
      <table className="adm-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={col.align === 'right' ? 'num' : ''} style={{ width: col.width }} aria-sort={sortFor(col)}>
                {col.sortKey ? (
                  <button type="button" className="adm-sort" onClick={() => toggle(col)}>
                    {col.header}
                    {sortFor(col) === 'ascending' && <FiArrowUp aria-hidden="true" />}
                    {sortFor(col) === 'descending' && <FiArrowDown aria-hidden="true" />}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'adm-row' : ''}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
              onClick={onRowClick ? (e) => !e.target.closest('button,a,input,select') && onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'num' : ''}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="muted flex flex-col items-center gap-2 py-12 text-center" role={loading ? 'status' : undefined}>
          <FiInbox size={26} aria-hidden="true" />
          <p>{loading ? 'Loading…' : empty || 'Nothing to show.'}</p>
        </div>
      )}
    </div>
  );
}
