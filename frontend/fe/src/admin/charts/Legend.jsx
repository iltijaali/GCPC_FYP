// Legend for two or more series. Each entry can carry its total, which doubles as a direct label.
export default function Legend({ items }) {
  return (
    <ul className="adm-legend mb-3" aria-label="Legend">
      {items.map((item) => (
        <li key={item.key ?? item.label} className="adm-legend-item">
          <span className="adm-swatch" style={{ background: item.color }} aria-hidden="true" />
          <span>{item.label}</span>
          {item.value != null && <strong className="num" style={{ color: 'var(--ink)' }}>{item.value}</strong>}
        </li>
      ))}
    </ul>
  );
}
