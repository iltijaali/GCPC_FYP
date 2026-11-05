import { FiArrowDownRight, FiArrowUpRight, FiMinus } from 'react-icons/fi';
import Sparkline from './Sparkline';

// label · value · optional delta vs the previous period · optional sparkline.
// goodWhen says which direction is good news: 'up' (orders), 'down' (open complaints) or null (neutral).
export default function StatTile({ label, value, delta, goodWhen = 'up', periodLabel, spark, sparkLabel, hero = false, children, foot, icon: Glyph }) {
  const pct = delta?.change_pct;
  const direction = pct == null || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';
  const tone = direction === 'flat' || !goodWhen ? 'neutral' : direction === goodWhen ? 'good' : 'bad';
  const color = tone === 'good' ? 'var(--good-text)' : tone === 'bad' ? 'var(--bad-text)' : 'var(--muted)';
  const Icon = direction === 'up' ? FiArrowUpRight : direction === 'down' ? FiArrowDownRight : FiMinus;

  return (
    <div className={`adm-card adm-card-pad flex h-full flex-col justify-between gap-3 ${hero ? 'adm-hero' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="ink-2 flex items-center gap-2 text-[13px] font-medium">
            {Glyph && <span className="adm-chip" aria-hidden="true"><Glyph size={15} /></span>}
            {label}
          </p>
          <p className={`mt-1 whitespace-nowrap font-semibold leading-none tracking-tight ${hero ? 'text-[52px]' : 'text-[30px]'}`}>{value}</p>
        </div>
        {spark && <Sparkline values={spark} label={sparkLabel || `${label} trend`} />}
      </div>
      {children}
      <div className="flex min-h-[18px] flex-wrap items-center gap-x-2 text-[12.5px]">
        {delta && (
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color }}>
            <Icon aria-hidden="true" />
            {pct == null ? 'No earlier data' : `${pct > 0 ? '+' : ''}${pct}%`}
            <span className="sr-only">{tone === 'good' ? ' (improving)' : tone === 'bad' ? ' (worsening)' : ''}</span>
          </span>
        )}
        {delta && pct != null && periodLabel && <span className="muted">{periodLabel}</span>}
        {foot && <span className="muted">{foot}</span>}
      </div>
    </div>
  );
}
