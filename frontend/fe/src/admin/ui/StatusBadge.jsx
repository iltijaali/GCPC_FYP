import { STATUS_META } from '../statusMeta';

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return <span className="adm-badge">{status}</span>;
  const { Icon, color } = meta;
  return (
    <span className="adm-badge" title={meta.hint}>
      <span className="adm-dot" style={{ background: color }} aria-hidden="true" />
      <Icon aria-hidden="true" size={13} />
      {status}
    </span>
  );
}
