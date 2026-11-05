import { useEffect, useId, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Accessible dialog (centered) or drawer (side="right"): Escape and backdrop close it, Tab stays inside,
// and focus returns to whatever opened it.
export default function Modal({ title, onClose, children, footer, side, width = 480 }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  const drawer = side === 'right';
  return (
    <div className="fixed inset-0 z-50 flex" style={{ justifyContent: drawer ? 'flex-end' : 'center', alignItems: drawer ? 'stretch' : 'center', padding: drawer ? 0 : 16 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(8, 12, 30, 0.55)' }} onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="adm-card relative flex max-h-full w-full flex-col"
        style={{ maxWidth: width, borderRadius: drawer ? '14px 0 0 14px' : 14, height: drawer ? '100%' : undefined, outline: 'none' }}
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <h2 id={titleId} className="text-[16px]">{title}</h2>
          <button type="button" className="adm-btn adm-btn-ghost adm-icon-btn" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>{footer}</footer>}
      </div>
    </div>
  );
}
