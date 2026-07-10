'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// Enterprise detail panel (Stripe / Linear / Mercury). The main content COMPRESSES to the left
// (see `panelContentClass`) rather than being covered; the panel slides in from the right in
// ~220ms. Closes on ESC and on clicking outside — outside = anywhere not marked
// `data-panel-keep` (the panel itself and the triggering list/table carry that attribute, so
// clicking another row switches the selection instead of closing). The selection state lives in
// the page, so the selected row stays highlighted while open.

export function DetailPanel({
  open, onClose, title, subtitle, badge, footer, children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Portal to <body> so the panel is anchored to the VIEWPORT, not to a transformed ancestor
  // (the page-enter template wrapper would otherwise capture position:fixed and clip the panel).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Click outside (anything not inside a [data-panel-keep] region) closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && !t.closest('[data-panel-keep]')) onClose();
    };
    // Defer so the opening click doesn't immediately close it.
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => { window.clearTimeout(id); document.removeEventListener('mousedown', onDown); };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <aside
      data-panel-keep
      aria-hidden={!open}
      className={cn(
        'fixed right-0 top-0 z-40 flex h-screen flex-col border-l border-line bg-canvas',
        'w-full sm:w-[min(32rem,92vw)] lg:w-[var(--panel-w)]',
        'shadow-[-24px_0_60px_-30px_rgba(24,22,54,0.28)] transition-transform duration-[220ms] ease-out',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
            {badge}
          </div>
          {subtitle && <div className="mt-0.5 truncate text-[12px] text-subtle">{subtitle}</div>}
        </div>
        <button onClick={onClose} aria-label="Close (Esc)" className="-mr-1 shrink-0 rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface hover:text-ink">
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Body — scrolls */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

      {/* Footer (actions) */}
      {footer && <div className="border-t border-line px-5 py-3.5">{footer}</div>}
    </aside>,
    document.body,
  );
}

// Wrap a page in this to get the "content compresses left when a panel is open" behaviour.
// Only compresses on lg+ (mobile shows the panel as a full-width slide-over).
export const panelContentClass = (open: boolean) =>
  cn('transition-[padding] duration-[220ms] ease-out', open && 'lg:pr-[var(--panel-w)]');

// ── Section + row primitives for a clear visual hierarchy inside the panel ──────
export function PanelSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line/70 py-4 first:pt-1 last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-[13px]">
      <span className="shrink-0 text-subtle">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-ink">{value}</span>
    </div>
  );
}
