import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';
import { fmtCompact, fmtInt, labelEvery, niceTicks, roundedTop } from './chartUtils';
import { useWidth } from './useWidth';

const M = { l: 44, r: 8, t: 10, b: 28 };
const GAP = 2; // surface-coloured gap between touching marks

// Columns per day. Stacked by default (one segment per series); with a single series it is a plain column chart.
// data: [{ key, label, title, values: { [seriesKey]: number } }], series: [{ key, label, color }]
export default function ColumnChart({ data, series, stacked = true, height = 240, valueFormat = fmtInt, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);
  const [pointer, setPointer] = useState(null);

  const n = data.length;
  const plotW = Math.max(10, width - M.l - M.r);
  const plotH = height - M.t - M.b;
  const totalOf = (d) => (stacked ? series.reduce((s, x) => s + (d.values[x.key] || 0), 0) : Math.max(0, ...series.map((x) => d.values[x.key] || 0)));
  const maxValue = Math.max(0, ...data.map(totalOf));
  const { max: yMax, ticks } = niceTicks(maxValue, 4);
  const band = plotW / Math.max(n, 1);
  const barW = Math.min(24, Math.max(2, band - GAP));
  const baseline = M.t + plotH;
  const yOf = (v) => baseline - (v / yMax) * plotH;
  const every = labelEvery(band);

  const indexAt = (x) => Math.min(n - 1, Math.max(0, Math.floor((x - M.l) / band)));
  const show = (i, x, y) => {
    setActive(i);
    setPointer({ x, y });
  };
  const onMove = (e) => {
    const box = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    show(indexAt(x), x, e.clientY - box.top);
  };
  const onKey = (e) => {
    if (!n) return;
    const keys = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in keys || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.min(n - 1, Math.max(0, (active ?? n) + keys[e.key]));
      show(next, M.l + next * band + band / 2, yOf(totalOf(data[next])));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const d = active != null ? data[active] : null;
  const rows = d
    ? [
        ...series.map((s) => ({ label: s.label, color: s.color, value: valueFormat(d.values[s.key] || 0) })),
        ...(stacked && series.length > 1 ? [{ label: 'Total', value: valueFormat(totalOf(d)) }] : []),
      ]
    : [];

  return (
    <div
      ref={wrapRef}
      className="adm-chart relative"
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Use the left and right arrow keys to read each day, or switch to the table view.`}
      onKeyDown={onKey}
      onFocus={() => active == null && n && show(n - 1, M.l + (n - 1) * band + band / 2, yOf(totalOf(data[n - 1])))}
      onBlur={() => setActive(null)}
    >
      <svg width={width} height={height} role="presentation" onPointerLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={M.l + plotW} y1={yOf(t)} y2={yOf(t)} stroke="var(--grid)" strokeWidth="1" />
            <text x={M.l - 8} y={yOf(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="num">{fmtCompact(t)}</text>
          </g>
        ))}
        <line x1={M.l} x2={M.l + plotW} y1={baseline} y2={baseline} stroke="var(--axis)" strokeWidth="1" />

        {active != null && <rect x={M.l + active * band} y={M.t} width={band} height={plotH} fill="var(--hover)" rx="4" />}

        {data.map((day, i) => {
          const cx = M.l + i * band + band / 2;
          const segs = stacked
            ? series.map((s) => ({ s, v: day.values[s.key] || 0 })).filter((x) => x.v > 0)
            : series.map((s, k) => ({ s, v: day.values[s.key] || 0, k })).filter((x) => x.v > 0);
          let cum = 0;
          return (
            <g key={day.key}>
              {segs.map((seg, j) => {
                const h = Math.max(1, (seg.v / yMax) * plotH);
                const top = baseline - cum - h;
                const isTop = j === segs.length - 1;
                const drawH = j > 0 && stacked ? Math.max(1, h - GAP) : h; // gap sits between segments
                const y = stacked ? top : baseline - h;
                const x = stacked ? cx - barW / 2 : cx - barW / 2;
                cum += h;
                return (
                  <path
                    key={seg.s.key}
                    d={isTop ? roundedTop(x, y, barW, drawH) : `M${x},${y}h${barW}v${drawH}h${-barW}Z`}
                    style={{ fill: seg.s.color }}
                    opacity={active == null || active === i ? 1 : 0.55}
                  />
                );
              })}
              {i % every === 0 && (
                <text x={cx} y={baseline + 17} textAnchor="middle" fontSize="11" fill="var(--muted)">{day.label}</text>
              )}
            </g>
          );
        })}

        {/* the whole column is the hit target, not just the painted pixels */}
        <rect x={M.l} y={M.t} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} />
        {maxValue === 0 && (
          <text x={M.l + plotW / 2} y={M.t + plotH / 2} textAnchor="middle" fontSize="13" fill="var(--muted)">No data in this period</text>
        )}
      </svg>
      {d && <ChartTooltip x={pointer?.x} y={pointer?.y} containerWidth={width} title={d.title} rows={rows} />}
      <div className="sr-only" aria-live="polite">{d ? `${d.title}: ${rows.map((r) => `${r.label} ${r.value}`).join(', ')}` : ''}</div>
    </div>
  );
}
