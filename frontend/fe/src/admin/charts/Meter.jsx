import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

// A ratio against a limit. The track is a lighter step of the fill's own hue so state reads across the bar;
// severity changes the fill and always adds an icon + words (never colour alone).
export default function Meter({ value, total, label, goodAt = 80, warnAt = 50 }) {
  const pct = total ? Math.round((value / total) * 100) : null;
  const level = pct == null ? 'none' : pct >= goodAt ? 'good' : pct >= warnAt ? 'warn' : 'bad';
  const fill = level === 'bad' ? 'var(--danger)' : level === 'warn' ? 'var(--s-progress)' : 'var(--s-pending)';
  const text = { good: 'On track', warn: 'Needs attention', bad: 'Most emails not delivered', none: 'Nothing to measure yet' }[level];
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
        <span className="ink-2">{label}</span>
        <strong className="num">{pct == null ? '–' : `${pct}%`} <span className="muted font-normal">({value} of {total})</span></strong>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
        aria-valuetext={pct == null ? 'no data' : `${pct}% (${value} of ${total})`}
        style={{ height: 10, borderRadius: 5, background: `color-mix(in srgb, ${fill} 20%, transparent)`, overflow: 'hidden' }}
      >
        <div style={{ width: `${pct ?? 0}%`, height: '100%', background: fill, borderRadius: 5 }} />
      </div>
      <p className="muted mt-1.5 flex items-center gap-1.5 text-[12.5px]">
        {level === 'good' ? <FiCheckCircle aria-hidden="true" /> : level !== 'none' ? <FiAlertTriangle aria-hidden="true" /> : null}
        {text}
      </p>
    </div>
  );
}
