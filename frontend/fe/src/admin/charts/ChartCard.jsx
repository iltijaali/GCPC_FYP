import { useId, useState } from 'react';
import { FiBarChart2, FiList } from 'react-icons/fi';

// Frame for every chart: title, optional legend, and the table-view twin that makes the
// numbers reachable without hovering or seeing colour.
export default function ChartCard({ title, subtitle, legend, table, children, className = '', busy = false, actions }) {
  const [view, setView] = useState('chart');
  const id = useId();
  return (
    <section className={`adm-card adm-card-pad ${className}`} aria-labelledby={id}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={id} className="text-[15px]">{title}</h3>
          {subtitle && <p className="muted mt-0.5 text-[12.5px]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <div className="adm-segmented" role="group" aria-label={`${title} view`}>
              <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')} title="Chart view">
                <FiBarChart2 aria-hidden="true" /> <span className="sr-only">Chart</span>
              </button>
              <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} title="Table view">
                <FiList aria-hidden="true" /> <span className="sr-only">Table</span>
              </button>
            </div>
          )}
        </div>
      </header>
      {view === 'chart' && legend}
      <div className={busy ? 'adm-refetching' : ''}>
        {view === 'chart' || !table ? children : <TableView table={table} caption={title} />}
      </div>
    </section>
  );
}

function TableView({ table, caption }) {
  return (
    <div className="adm-table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
      <table className="adm-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : ''} scope="col" style={{ position: 'sticky', top: 0 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={row.key ?? i}>
              {table.columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'num' : ''}>{row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
