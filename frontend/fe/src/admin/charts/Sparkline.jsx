// Tiny trend line in the de-emphasis grey; only the latest point is inked.
export default function Sparkline({ values, width = 96, height = 30, label }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pad = 3;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - (v / max) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = values[values.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={label} className="shrink-0">
      <path d={d} fill="none" stroke="var(--axis)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" fill="var(--ink)" stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  );
}
