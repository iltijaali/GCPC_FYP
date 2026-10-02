import { FiSearch } from 'react-icons/fi';

// One filter row above the content it scopes.
export function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <label className="relative block min-w-[220px] flex-1 sm:max-w-[320px]">
      <span className="sr-only">{label || placeholder}</span>
      <FiSearch className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
      <input type="search" className="adm-input w-full" style={{ paddingLeft: 36 }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2">
      <span className="muted text-[12.5px]">{label}</span>
      <select className="adm-select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}
