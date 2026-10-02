import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip';
import { fmtInt, fmtPct } from './chartUtils';
import { useWidth } from './useWidth';

// One horizontal stacked bar for part-to-whole (e.g. complaints by status), with a 2px surface gap between
// segments and a labelled list underneath: the list is the direct-label channel, so colour is never alone.
// segments: [{ key, label, value, color }]
export default function PartToWholeBar({ segments, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef, 320);
  const [active, setActive] = useState(null);
  const [pointer, setPointer] = useState(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const pct = (v) => (total ? (v / total) * 100 : 0);
  const seg = active != null ? segments[active] : null;

  return (
    <div ref={wrapRef} className="adm-chart relative">
      <div
        className="flex h-[14px] w-full overflow-hidden rounded-[4px]"
        role="img"
        aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
        style={{ background: total ? 'transparent' : 'var(--surface-2)' }}
        onPointerLeave={() => setActive(null)}
      >
        {segments.filter((s) => s.value > 0).map((s) => (
          <div
            key={s.key}
            style={{ flex: s.value, background: s.color, marginRight: 2, opacity: seg && seg.key !== s.key ? 0.55 : 1 }}
            onPointerMove={(e) => {
              const box = wrapRef.current.getBoundingClientRect();
              setActive(segments.findIndex((x) => x.key === s.key));
              setPointer({ x: e.clientX - box.left, y: e.clientY - box.top + 14 });
            }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2" aria-label="Breakdown">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-[13px]">
            <span className="adm-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="ink-2 flex-1">{s.label}</span>
            <strong className="num">{fmtInt(s.value)}</strong>
            <span className="muted num w-12 text-right">{fmtPct(pct(s.value))}</span>
          </li>
        ))}
      </ul>
      {seg && (
        <ChartTooltip x={pointer?.x} y={pointer?.y} containerWidth={width} title={seg.label}
          rows={[{ label: 'Complaints', color: seg.color, value: fmtInt(seg.value) }, { label: 'Share', value: fmtPct(pct(seg.value)) }]} />
      )}
    </div>
  );
}
