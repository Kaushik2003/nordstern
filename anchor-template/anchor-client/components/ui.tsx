import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

// ── Button ────────────────────────────────────────────────────────────────────
// `brand`   — solid accent, dark ink text (accessible on any anchor accent).
// `gradient`— accent → darkened-accent with white text; the premium hero CTA. The
//             `to` stop is a color-mix toward black so white text stays legible for
//             ANY per-anchor accent colour, not just the default purple.
type BtnVariant = 'brand' | 'gradient' | 'outline' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg' | 'block';
const BTN: Record<BtnVariant, string> = {
  brand: 'bg-brand text-[var(--color-brand-ink)] hover:opacity-90',
  gradient:
    'bg-[linear-gradient(to_right,var(--color-brand),color-mix(in_srgb,var(--color-brand)_45%,#000))] text-white shadow-[0_10px_24px_-10px_color-mix(in_srgb,var(--color-brand)_70%,transparent)] hover:brightness-[1.04] active:scale-[0.99]',
  outline: 'border border-line bg-canvas text-ink hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-ink',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
};
const SIZE: Record<BtnSize, string> = {
  sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base', block: 'h-12 w-full px-6 text-base',
};
export function Button({ variant = 'brand', size = 'md', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50', BTN[variant], SIZE[size], className)} {...p} />;
}

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('rounded-2xl border border-line bg-canvas', className)} {...p} />;
export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5', className)} {...p} />;

// ── Badge (status tones) ────────────────────────────────────────────────────────
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
};
export const Badge = ({ tone = 'neutral', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) =>
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', TONE[tone], className)} {...p} />;

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) =>
    <input ref={ref} className={cn('h-12 w-full rounded-xl border border-line bg-canvas px-4 text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30', className)} {...p} />,
);
Input.displayName = 'Input';

// ── Desktop building blocks ─────────────────────────────────────────────────────

// A KPI tile for the dashboard stat row. Label on top, big value, optional sublabel/icon.
export function StatTile({ label, value, sub, icon, className }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-line bg-canvas p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {sub != null && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

// Section title + optional trailing action (e.g. "View all").
export function SectionHeader({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

// Minimal desktop table primitives — bordered card wrapper, sticky header row.
export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) =>
  <table className={cn('w-full border-collapse text-sm', className)} {...p} />;
export const Th = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) =>
  <th className={cn('border-b border-line px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint', className)} {...p} />;
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) =>
  <td className={cn('border-b border-line px-4 py-3 align-middle text-ink', className)} {...p} />;

// ── Skeleton / Spinner ───────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) =>
  <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />;
export const Spinner = ({ className }: { className?: string }) =>
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;

// ══════════════════════════════════════════════════════════════════════════════
//  Console-grade primitives (nord-v2 design language). Softer floating cards,
//  tighter type, CSS-only staggered reveal. Reused by the migrated screens and
//  available to the remaining ones. Additive — nothing above changed shape.
// ══════════════════════════════════════════════════════════════════════════════

// CSS-only staggered load-in. `style={reveal(0.1)}` on any element cascades it in.
// Server-safe (no client hook), honors reduced-motion via the global media query.
export const reveal = (delay: number): React.CSSProperties => ({
  animation: `console-reveal 0.5s var(--ease-out-expo) ${delay}s backwards`,
});

// Soft floating panel — the default surface for the console. Rounder + softer than
// the flat `Card` above; opt into a lift on hover for interactive tiles.
export function Panel({ hover, className, style, children, ...p }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-mock border border-black/[0.05] bg-canvas shadow-[0_1px_2px_rgba(24,22,54,0.04),0_10px_30px_-20px_rgba(24,22,54,0.16)]',
        hover && 'transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgba(24,22,54,0.05),0_22px_48px_-24px_rgba(34,24,78,0.24)]',
        className,
      )}
      {...p}
    >
      {children}
    </div>
  );
}

// Panel title row with optional trailing meta/action.
export function PanelHead({ title, meta, className }: { title: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
      {meta}
    </div>
  );
}

// KPI tile — the dashboard's headline metric. `accent` renders the value in the
// money-up colour; `badge` shows a small status pill in the corner.
export function Kpi({ label, value, sub, icon, accent, badge, badgeClass, style }: {
  label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode;
  accent?: boolean; badge?: React.ReactNode; badgeClass?: string; style?: React.CSSProperties;
}) {
  return (
    <Panel hover style={style} className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-medium text-muted">{label}</p>
        {badge
          ? <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', badgeClass ?? 'bg-surface-2 text-muted')}>{badge}</span>
          : icon && <span className="text-brand-700">{icon}</span>}
      </div>
      <p className={cn('mt-3.5 text-[27px] font-semibold leading-none tracking-[-0.02em] tabular-nums sm:text-[29px]', accent ? 'text-[var(--color-up)]' : 'text-ink')}>{value}</p>
      {sub != null && <p className="mt-2.5 text-[11.5px] text-subtle">{sub}</p>}
    </Panel>
  );
}

// Large action card (Buy / Sell) with an optional "verify first" lock.
export function ActionCard({ href, icon, title, desc, cta, locked, style }: {
  href: string; icon: React.ReactNode; title: string; desc: string; cta: string; locked?: boolean; style?: React.CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={style}
      className="group block rounded-mock border border-black/[0.05] bg-canvas p-6 shadow-[0_1px_2px_rgba(24,22,54,0.04),0_10px_30px_-20px_rgba(24,22,54,0.16)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgba(24,22,54,0.05),0_22px_48px_-24px_rgba(34,24,78,0.24)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand group-hover:text-white">{icon}</span>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            <LockIcon /> Verify first
          </span>
        )}
      </div>
      <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-transform group-hover:translate-x-0.5">
        {cta} <ArrowIcon />
      </span>
    </Link>
  );
}

// Empty-state block for lists with no rows yet.
export function EmptyState({ icon, title, desc, action, className }: {
  icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-14 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-surface text-subtle">{icon}</span>
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{desc}</p>
      </div>
      {action}
    </div>
  );
}

// Labeled provider chip — the trust rail under the login card / on verify.
export function ProviderChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-mock border border-line bg-canvas px-4 py-3 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// Tiny inline icons so this module stays free of per-consumer lucide imports.
const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
