// One tooltip for every chart: a title, then a row per series with the value leading.
// Labels are rendered as text by React, never as HTML.
export default function ChartTooltip({ x, y, containerWidth, title, rows }) {
  if (x == null) return null;
  const flip = x > containerWidth * 0.62;
  return (
    <div
      className="adm-tooltip"
      role="presentation"
      style={{ top: Math.max(4, y), left: flip ? undefined : x + 14, right: flip ? containerWidth - x + 14 : undefined }}
    >
      {title && <div className="tt-title">{title}</div>}
      {rows.map((row) => (
        <div className="tt-row" key={row.label}>
          <span className="ink-2">
            {row.color && <span className="tt-key" style={{ background: row.color }} />}
            {row.label}
          </span>
          <span className="tt-val">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
