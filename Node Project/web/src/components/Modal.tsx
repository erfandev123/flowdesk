import { useEffect, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button[data-autofocus]',
      );
      target?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-brand-950/45 backdrop-blur-[2px] animate-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${widths[size]} bg-surface rounded-t-2xl sm:rounded-2xl shadow-pop
          max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-rise border border-line`}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="text-sm text-ink-soft mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 w-9 h-9 grid place-items-center rounded-lg text-ink-soft
              hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-5 scrollbar-thin flex-1">{children}</div>
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-wrap gap-2 justify-end bg-canvas/60 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
