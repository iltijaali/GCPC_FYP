import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';
import { fmtCompact, labelEvery, niceTicks } from './chartUtils';
import { useWidth } from './useWidth';

const M = { l: 48, r: 14, t: 12, b: 28 };

// One series as a 2px line with a ~10% area wash, an end dot, and a crosshair that snaps to the nearest day.
// data: [{ key, label, title, value }]
export default function LineAreaChart({ data, color, seriesLabel, height = 240, valueFormat, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);
  const [pointer, setPointer] = useState(null);

  const n = data.length;
  const plotW = Math.max(10, width - M.l - M.r);
  const plotH = height - M.t - M.b;
  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const { max: yMax, ticks } = niceTicks(maxValue, 4);
  const step = n > 1 ? plotW / (n - 1) : 0;
  const baseline = M.t + plotH;
  const xOf = (i) => M.l + (n > 1 ? i * step : plotW / 2);
  const yOf = (v) => baseline - (v / yMax) * plotH;
  const every = labelEvery(step || plotW);

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${xOf(i)},${yOf(d.value)}`).join('');
  const area = n ? `${line}L${xOf(n - 1)},${baseline}L${xOf(0)},${baseline}Z` : '';

  const show = (i, x, y) => {
    setActive(i);
    setPointer({ x, y });
  };
  const onMove = (e) => {
    const box = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const i = n > 1 ? Math.min(n - 1, Math.max(0, Math.round((x - M.l) / step))) : 0;
    show(i, xOf(i), e.clientY - box.top);
  };
  const onKey = (e) => {
    if (!n) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.min(n - 1, Math.max(0, (active ?? n) + delta));
      show(next, xOf(next), yOf(data[next].value));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const d = active != null ? data[active] : null;
  const last = n ? data[n - 1] : null;

  return (
    <div
      ref={wrapRef}
      className="adm-chart relative"
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Use the left and right arrow keys to read each day, or switch to the table view.`}
      onKeyDown={onKey}
      onFocus={() => active == null && n && show(n - 1, xOf(n - 1), yOf(data[n - 1].value))}
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

        {n > 0 && <path d={area} style={{ fill: color }} opacity="0.10" />}
        {n > 0 && <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

        {data.map((day, i) => i % every === 0 && (
          <text key={day.key} x={xOf(i)} y={baseline + 17} textAnchor="middle" fontSize="11" fill="var(--muted)">{day.label}</text>
        ))}

        {d && <line x1={xOf(active)} x2={xOf(active)} y1={M.t} y2={baseline} stroke="var(--axis)" strokeWidth="1" />}
        {/* end dot (and the active dot) carry a 2px ring in the surface colour */}
        {last && active == null && <circle cx={xOf(n - 1)} cy={yOf(last.value)} r="4" style={{ fill: color }} stroke="var(--surface-1)" strokeWidth="2" />}
        {d && <circle cx={xOf(active)} cy={yOf(d.value)} r="5" style={{ fill: color }} stroke="var(--surface-1)" strokeWidth="2" />}

        <rect x={M.l} y={M.t} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} />
        {maxValue === 0 && (
          <text x={M.l + plotW / 2} y={M.t + plotH / 2} textAnchor="middle" fontSize="13" fill="var(--muted)">No data in this period</text>
        )}
      </svg>
      {d && <ChartTooltip x={pointer?.x} y={pointer?.y} containerWidth={width} title={d.title} rows={[{ label: seriesLabel, color, value: valueFormat(d.value) }]} />}
      <div className="sr-only" aria-live="polite">{d ? `${d.title}: ${seriesLabel} ${valueFormat(d.value)}` : ''}</div>
    </div>
  );
}
