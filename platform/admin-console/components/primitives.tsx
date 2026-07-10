'use client';

import * as React from 'react';
import { cn } from '@nordstern/shared-ui';
import { Badge } from '@nordstern/shared-ui';
import { Inbox, Loader2 } from 'lucide-react';

/** Page title + optional right-hand actions. */
export function PageHeader({ title, description, actions }: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A single headline number. `hint` carries the caveat when one applies. */
export function StatCard({ label, value, hint, tone = 'default' }: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warn' | 'destructive';
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-success',
    warn: 'text-warn',
    destructive: 'text-destructive',
  }[tone];
  return (
    <div className="rounded-2xl border border-line bg-background p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-2 text-2xl font-semibold tabular-nums', toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Section({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Bordered surface that wraps a table and gives it horizontal scroll of its own. */
export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-background shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className, align }: {
  children?: React.ReactNode;
  className?: string;
  align?: 'right';
}) {
  return (
    <th className={cn(
      'whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground',
      align === 'right' && 'text-right',
      className,
    )}>
      {children}
    </th>
  );
}

export function Td({ children, className, align, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: 'right';
}) {
  return (
    <td className={cn('px-4 py-3 align-middle', align === 'right' && 'text-right', className)} {...rest}>
      {children}
    </td>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead><tr className="border-b border-line bg-surface/60">{children}</tr></thead>;
}

export function Tr({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b border-line last:border-0', onClick && 'cursor-pointer hover:bg-surface/60')}
    >
      {children}
    </tr>
  );
}

/** Full-width empty row for a table with no rows. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-3 h-8 w-8 opacity-40" />
        {children}
      </td>
    </tr>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="mb-4 rounded-lg bg-destructive-50 px-3 py-2 text-sm text-destructive">{message}</div>;
}

/** Label/value pair for detail panels. */
export function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 text-sm break-words', mono && 'font-mono text-xs')}>{children}</dd>
    </div>
  );
}

/** Pretty-print a JSONB blob (application profile, job payload) without pretending it's structured. */
export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-lg border border-line bg-surface/60 p-3 text-xs leading-relaxed">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

// Map every status enum in the platform onto a badge variant, once.
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'brand' | 'outline' | 'default'> = {
  // applications
  applied: 'brand', approved: 'success', rejected: 'warning',
  // anchors
  draft: 'outline', provisioning: 'brand', active: 'success',
  error: 'warning', suspended: 'warning', removed: 'outline',
  // provisioning jobs
  pending: 'outline', running: 'brand', completed: 'success',
  failed: 'warning', cancelled: 'outline',
  // customer KYC
  unverified: 'outline', declined: 'warning',
  // api keys / users / orgs
  revoked: 'outline',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{status}</Badge>;
}
