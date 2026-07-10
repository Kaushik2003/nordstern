'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, FileWarning, X, Loader2 } from 'lucide-react';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { inr, dateTime } from '@/lib/format';

interface Case {
  id: string;
  user: { id: string; name: string; initials: string; status: string; risk: string; txCount: number };
  reason: string;
  severity: string;
  assignee: string | null;
  status: string;
  at: number;
  amount: number;
  relatedTx: number;
  note: string | null;
}

const sevTone = (s: string): BadgeTone => (s === 'high' ? 'danger' : s === 'med' ? 'warning' : 'neutral');
const isOpen = (s: string) => s === 'open' || s === 'reviewing' || s === 'flagged' || s === 'pending';
const statusTone = (s: string): BadgeTone => (s === 'cleared' ? 'success' : s === 'filed' ? 'info' : 'warning');

type Filter = 'open' | 'cleared' | 'filed' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Pending review' }, { key: 'cleared', label: 'Cleared' }, { key: 'filed', label: 'Filed (STR)' }, { key: 'all', label: 'All' },
];

export default function CompliancePage() {
  const { data, isLoading } = useQuery({ queryKey: ['compliance'], queryFn: () => bizGet<{ cases: Case[] }>('/admin/compliance/cases'), refetchInterval: 30000 });
  const [filter, setFilter] = useState<Filter>('open');
  const [selected, setSelected] = useState<Case | null>(null);

  const all = data?.cases ?? [];
  const rows = all.filter((c) => filter === 'all' ? true : filter === 'open' ? isOpen(c.status) : c.status === filter);
  const openCount = all.filter((c) => isOpen(c.status)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Compliance</h1>
        <p className="text-sm text-subtle">Review flagged customers and file or clear cases. {openCount > 0 && <span className="font-medium text-[var(--color-warning)]">{openCount} awaiting review.</span>}</p>
      </div>

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.key ? 'bg-surface text-ink' : 'text-subtle hover:bg-surface'}`}>{f.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !rows.length ? (
        <Card><CardContent className="py-10 text-center text-sm text-subtle">No cases in this view. Flagged customers will appear here for review.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <Card key={c.id} className="cursor-pointer transition-colors hover:bg-surface" onClick={() => setSelected(c)}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-subtle">{c.user.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{c.user.name}</span>
                    <Badge tone={sevTone(c.severity)}>{c.severity}</Badge>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="truncate text-sm text-subtle">{c.reason}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-medium text-ink">{inr(c.amount)}</p>
                  <p className="text-xs text-subtle">{dateTime(new Date(c.at).toISOString())}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && <CaseDrawer c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CaseDrawer({ c, onClose }: { c: Case; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(c.note ?? '');
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const useResolve = (status: 'cleared' | 'filed') =>
    useMutation({
      mutationFn: () => bizPost(`/admin/compliance/cases/${c.id}/resolve`, { status, note }),
      onSuccess: () => { setMsg({ tone: 'success', text: status === 'cleared' ? 'Case cleared.' : 'Filed with FIU-IND.' }); qc.invalidateQueries({ queryKey: ['compliance'] }); },
      onError: (e) => setMsg({ tone: 'danger', text: e instanceof ApiError ? e.message : 'Failed' }),
    });
  const clear = useResolve('cleared');
  const file = useResolve('filed');
  const open = isOpen(c.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Case {c.id}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 flex items-center gap-2"><Badge tone={sevTone(c.severity)}>{c.severity} severity</Badge><Badge tone={statusTone(c.status)}>{c.status}</Badge></div>

        <dl className="space-y-2.5 text-sm">
          <Field label="Customer" value={c.user.name} />
          <Field label="Reason" value={c.reason} />
          <Field label="Amount" value={inr(c.amount)} />
          <Field label="Related transactions" value={String(c.relatedTx)} />
          <Field label="Customer tx count" value={String(c.user.txCount)} />
          <Field label="Assignee" value={c.assignee ?? '—'} />
          <Field label="Opened" value={dateTime(new Date(c.at).toISOString())} />
        </dl>

        <div className="mt-5">
          <label className="text-sm font-medium text-ink">Resolution note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={!open} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" placeholder="Document your review decision…" />
        </div>

        {msg && <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.tone === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>{msg.text}</div>}

        {open ? (
          <div className="mt-6 flex gap-2 border-t border-line pt-4">
            <Button variant="brand" size="sm" disabled={clear.isPending} onClick={() => clear.mutate()}>{clear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Clear case</Button>
            <Button variant="destructive" size="sm" disabled={file.isPending} onClick={() => { if (confirm('File a suspicious transaction report with FIU-IND?')) file.mutate(); }}>{file.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileWarning className="h-4 w-4" />} File STR</Button>
          </div>
        ) : (
          <p className="mt-6 border-t border-line pt-4 text-xs text-subtle">This case is resolved{c.note ? `: ${c.note}` : '.'}</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><dt className="shrink-0 text-subtle">{label}</dt><dd className="text-right font-medium text-ink">{value}</dd></div>;
}
