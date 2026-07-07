import * as React from 'react';
import { cn } from '@/lib/cn';

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'brand' | 'outline' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg' | 'block';
const BTN: Record<BtnVariant, string> = {
  brand: 'bg-brand text-[var(--color-brand-ink)] hover:opacity-90',
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

// ── Skeleton / Spinner ───────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) =>
  <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />;
export const Spinner = ({ className }: { className?: string }) =>
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
