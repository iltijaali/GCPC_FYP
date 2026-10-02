export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export function fmtCompact(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(Math.round(v * 10) / 10);
}

export const fmtRs = (n) => `Rs ${fmtInt(n)}`;
export const fmtPct = (n) => `${(Math.round(n * 10) / 10).toString()}%`;

// Round the axis to clean numbers (0 / 10 / 20 ...).
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: top, ticks };
}

const parse = (iso) => new Date(`${iso}T00:00:00Z`);
export const fmtDay = (iso) => parse(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const fmtDayLong = (iso) =>
  parse(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Bar with a 4px rounded data-end and a square baseline (vertical: grows up from the baseline).
export function roundedTop(x, y, w, h, r = 4) {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rad}Q${x},${y} ${x + rad},${y}H${x + w - rad}Q${x + w},${y} ${x + w},${y + rad}V${y + h}Z`;
}

// Horizontal bar: square at the left baseline, rounded at the right data-end.
export function roundedRight(x, y, w, h, r = 4) {
  const rad = Math.max(0, Math.min(r, h / 2, w));
  return `M${x},${y}H${x + w - rad}Q${x + w},${y} ${x + w},${y + rad}V${y + h - rad}Q${x + w},${y + h} ${x + w - rad},${y + h}H${x}Z`;
}

// Pick which x labels to print so they never collide (min ~64px apart).
export const labelEvery = (band, minPx = 64) => Math.max(1, Math.ceil(minPx / Math.max(band, 1)));
