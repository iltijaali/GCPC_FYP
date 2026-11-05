import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';
import { roundedRight } from './chartUtils';
import { useWidth } from './useWidth';

const ROW = 34;
const BAR = 16;      // thin bars: well under the 24px cap
const VALUE_W = 64;  // room for the value at the bar tip

// Ranked horizontal bars. One series = one colour for every bar (never a value ramp on nominal categories).
// data: [{ key, label, value, detail: [{label, value}] }]
export default function HBarChart({ data, color, valueFormat, seriesLabel, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef, 360);
  const [active, setActive] = useState(null);
  const [pointer, setPointer] = useState(null);

  const labelW = Math.min(150, Math.max(70, Math.max(0, ...data.map((d) => d.label.length)) * 6.6 + 8));
  const plotW = Math.max(40, width - labelW - VALUE_W - 8);
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = Math.max(data.length, 1) * ROW + 4;
  const clip = (text) => (text.length > 20 ? `${text.slice(0, 19)}…` : text);

  const show = (i, e) => {
    const box = wrapRef.current.getBoundingClientRect();
    setActive(i);
    setPointer({ x: e.clientX - box.left, y: e.clientY - box.top });
  };

  if (!data.length) return <p className="muted py-10 text-center">No orders in this period.</p>;
  const d = active != null ? data[active] : null;

  return (
    <div ref={wrapRef} className="adm-chart relative" role="group" aria-label={`${ariaLabel}. Switch to the table view for the exact numbers.`}>
      <svg width={width} height={height} role="presentation" onPointerLeave={() => setActive(null)}>
        {data.map((row, i) => {
          const y = i * ROW + 2;
          const w = Math.max(2, (row.value / max) * plotW);
          return (
            <g
              key={row.key}
              tabIndex={0}
              role="img"
              aria-label={`${row.label}: ${valueFormat(row.value)} ${seriesLabel}`}
              onPointerMove={(e) => show(i, e)}
              onFocus={() => {
                setActive(i);
                setPointer({ x: labelW + w, y: y + ROW / 2 });
              }}
              onBlur={() => setActive(null)}
            >
              {/* full-row hit area */}
              <rect x="0" y={y} width={width} height={ROW} fill={active === i ? 'var(--hover)' : 'transparent'} rx="6" />
              <text x="6" y={y + ROW / 2} dy="0.32em" fontSize="12.5" fill="var(--ink-2)">
                <title>{row.label}</title>
                {clip(row.label)}
              </text>
              <path d={roundedRight(labelW, y + (ROW - BAR) / 2, w, BAR)} style={{ fill: color }} opacity={active == null || active === i ? 1 : 0.55} />
              <text x={labelW + w + 8} y={y + ROW / 2} dy="0.32em" fontSize="12.5" fontWeight="600" fill="var(--ink)" className="num">{valueFormat(row.value)}</text>
            </g>
          );
        })}
      </svg>
      {d && <ChartTooltip x={pointer?.x} y={pointer?.y} containerWidth={width} title={d.label} rows={d.detail} />}
    </div>
  );
}
