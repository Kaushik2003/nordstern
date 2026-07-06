import Link from 'next/link';
import React, { ReactNode } from 'react';

// ─── Logo ──────────────────────────────────────────────────────────────────────
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/anchor" className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <img src="/logo.png" alt="NordStern" className="h-10 w-10 object-contain rounded-[10px]" />
      <span className="text-xl font-semibold tracking-tight text-ink">NordStern</span>
    </Link>
  );
}

// ─── Button ─────────────────────────────────────────────────────────────────────
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const BTN: Record<string, string> = {
  primary: 'bg-ink text-white hover:bg-[#222222] active:bg-[#000000] shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
  outline: 'border border-line text-ink bg-white hover:bg-surface-2 active:bg-[#e5e7eb]',
  ghost:   'text-muted hover:text-ink hover:bg-surface-2 active:bg-[#e5e7eb]',
  danger:  'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
};
const SIZE: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm', // Taller, premium feel
};

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────────
export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white border border-line rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${className}`} {...rest}>{children}</div>;
}

// ─── Badge ──────────────────────────────────────────────────────────────────────
type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'muted';
const TONE: Record<Tone, string> = {
  brand:   'bg-brand/10 text-brand-deep ring-brand/20',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  danger:  'bg-danger/10 text-danger ring-danger/20',
  muted:   'bg-surface-2 text-muted ring-line',
};
export function Badge({ tone = 'muted', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase ring-1 ring-inset ${TONE[tone]} ${className}`}>{children}</span>;
}

const STACK_TONE: Record<string, Tone> = {
  active: 'success', provisioning: 'warning', pending: 'muted',
  error: 'danger', suspended: 'warning', removed: 'muted',
};
export function StackBadge({ status }: { status: string }) {
  return <Badge tone={STACK_TONE[status] ?? 'muted'}>{status === 'active' ? '● Live' : status}</Badge>;
}

// ─── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent ${className}`} />;
}

// ─── Field ──────────────────────────────────────────────────────────────────────
export function Field({
  label, type = 'text', value, onChange, placeholder, required, className = '', helperText
}: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean, className?: string, helperText?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder-faint outline-none transition-all duration-200 hover:border-line-strong focus:border-brand focus:ring-[3px] focus:ring-brand/20 shadow-sm"
      />
      {helperText && <span className="mt-1.5 block text-xs text-muted">{helperText}</span>}
    </label>
  );
}

// ─── Radio Card ─────────────────────────────────────────────────────────────────
export function RadioCard({
  checked, onChange, icon, title, description, className = ''
}: { checked: boolean; onChange: () => void; icon?: ReactNode; title: string; description?: string; className?: string }) {
  return (
    <label className={`relative flex cursor-pointer rounded-[16px] border p-5 transition-all duration-200 hover:bg-[#FAFAFA] ${checked ? 'border-brand ring-1 ring-brand bg-brand/5 shadow-sm' : 'border-line bg-white'} ${className}`}>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <div className="flex w-full items-start gap-4">
        {icon && <div className={`mt-0.5 shrink-0 transition-colors ${checked ? 'text-brand-deep' : 'text-faint'}`}>{icon}</div>}
        <div className="flex-1">
          <div className={`font-medium text-sm transition-colors ${checked ? 'text-brand-deep' : 'text-ink'}`}>{title}</div>
          {description && <div className="mt-1 text-xs text-muted leading-relaxed">{description}</div>}
        </div>
        <div className={`shrink-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors ${checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-2'}`}>
          {checked && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
        </div>
      </div>
    </label>
  );
}

// ─── Segmented Control ──────────────────────────────────────────────────────────
export function SegmentedControl({
  options, value, onChange, className = ''
}: { options: string[]; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`inline-flex rounded-xl bg-surface-2 p-1 border border-line ${className}`}>
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-[8px] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isSelected ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/5' : 'text-muted hover:text-ink hover:bg-surface'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
