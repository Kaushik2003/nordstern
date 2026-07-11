'use client';

import * as React from 'react';
import { Badge } from '@nordstern/shared-ui';
import { Lock, PlugZap } from 'lucide-react';
import type { NavState } from '@/lib/nav';

// Scaffolding for pages whose data is NOT reachable yet.
//
// Rule: an unwired page must LOOK unwired. No placeholder numbers, no lorem rows, no
// synthetic charts — AGENTS.md §6.6 forbids wiring synthetic data to a surface that reads
// as live, and a screenshot of this console must never be mistaken for a working system.
// These components render the intended shape of the page with its values struck out.

export function StateBadge({ state }: { state: NavState }) {
  if (state === 'live') return null;
  return state === 'unwired'
    ? <Badge variant="warning" className="gap-1"><PlugZap className="h-3 w-3" />Not wired</Badge>
    : <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />No backend</Badge>;
}

/** The banner that explains WHY a page is empty and what would light it up. */
export function ScaffoldNotice({ state, source, needs }: {
  state: Exclude<NavState, 'live'>;
  /** Where the data actually lives today. */
  source: string;
  /** What has to be built to reach it. */
  needs: string;
}) {
  const unwired = state === 'unwired';
  return (
    <div className={`mb-6 rounded-xl border p-4 ${unwired ? 'border-warn/30 bg-warn-50' : 'border-line bg-surface'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${unwired ? 'text-warn' : 'text-muted-foreground'}`}>
          {unwired ? <PlugZap className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </div>
        <div className="text-sm">
          <div className="font-medium">
            {unwired
              ? 'This data exists, but the admin console cannot reach it yet.'
              : 'Nothing persists this data yet — this page is a design placeholder.'}
          </div>
          <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">Lives in:</span> {source}</div>
            <div><span className="font-medium text-foreground">Needs:</span> {needs}</div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing below is real data. Roadmap: <code className="font-mono">docs/Admin_Guide/ADMIN_CONSOLE_ROADMAP.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}

/** A card describing a panel that will exist here, with its fields named but unfilled. */
export function PlannedPanel({ title, description, fields }: {
  title: string;
  description: string;
  fields: string[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-background p-4">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <dl className="mt-3 space-y-1.5">
        {fields.map((f) => (
          <div key={f} className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-1.5 last:border-0">
            <dt className="text-xs text-muted-foreground">{f}</dt>
            {/* An em-dash, never a number: the value is unknown, not zero. */}
            <dd className="font-mono text-xs text-subtle">—</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The columns a table will have, rendered empty. Communicates shape without inventing rows. */
export function PlannedTable({ columns, note }: { columns: string[]; note: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-line bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center text-sm text-subtle">
                {note}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
