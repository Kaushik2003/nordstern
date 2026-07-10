'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Undo2, X, Loader2 } from 'lucide-react';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { num, dateTime, shortId, txStatus } from '@/lib/format';

interface Tx {
  id: string;
  kind: string;
  status: string;
  amountIn: string | null;
  amountOut: string | null;
  amountExpected: string | null;
  memo: string | null;
  destination: string | null;
  stellarTx: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

type Filter = 'all' | 'deposit' | 'withdrawal' | 'pending';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'pending', label: 'In progress' },
];

function TransactionsInner() {
  const params = useSearchParams();
  const initial = (params.get('filter') as Filter) ?? 'all';
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.key === initial) ? initial : 'all');
  const [selected, setSelected] = useState<Tx | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => bizGet<{ transactions: Tx[] }>('/admin/transactions'),
    refetchInterval: 15000,
  });

  const all = data?.transactions ?? [];
  const rows = all.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return txStatus(t.status).stuck || t.status.startsWith('pending');
    return t.kind === filter;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Transactions</h1>
          <p className="text-sm text-subtle">Every deposit and withdrawal, live from the Anchor Platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.key ? 'bg-surface text-ink' : 'text-subtle hover:bg-surface'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <p className="p-8 text-center text-sm text-subtle">No transactions in this view yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR className="border-line">
                    <TH className="pl-4">Kind</TH><TH>Status</TH><TH>In</TH><TH>Out</TH><TH>Memo</TH><TH>Started</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((t) => {
                    const st = txStatus(t.status);
                    return (
                      <TR key={t.id} className="cursor-pointer hover:bg-surface" onClick={() => setSelected(t)}>
                        <TD className="pl-4 capitalize">{t.kind}</TD>
                        <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                        <TD>{num(t.amountIn)}</TD>
                        <TD>{num(t.amountOut)}</TD>
                        <TD className="font-mono text-xs text-subtle">{shortId(t.memo, 6)}</TD>
                        <TD className="text-subtle">{dateTime(t.startedAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <TxDrawer tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TxDrawer({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);
  const st = txStatus(tx.status);

  // A money action; refreshes the ledger + dashboard on success.
  const useAction = (action: 'retry' | 'refund') =>
    useMutation({
      mutationFn: () => bizPost(`/admin/transactions/${tx.id}/${action}`),
      onSuccess: () => {
        setNote({ tone: 'success', msg: `${action === 'retry' ? 'Retry' : 'Refund'} submitted.` });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['summary'] });
      },
      onError: (e) => setNote({ tone: 'danger', msg: e instanceof ApiError ? e.message : `${action} failed` }),
    });
  const retry = useAction('retry');
  const refund = useAction('refund');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink capitalize">{tx.kind}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4"><Badge tone={st.tone}>{st.label}</Badge></div>

        <dl className="space-y-2.5 text-sm">
          <Field label="Transaction ID" value={<span className="font-mono text-xs">{tx.id}</span>} />
          <Field label="Amount in" value={num(tx.amountIn)} />
          <Field label="Amount out" value={num(tx.amountOut)} />
          <Field label="Expected" value={num(tx.amountExpected)} />
          <Field label="Memo" value={<span className="font-mono text-xs">{tx.memo ?? '—'}</span>} />
          <Field label="Destination" value={<span className="font-mono text-xs">{shortId(tx.destination, 8)}</span>} />
          <Field label="Stellar tx" value={<span className="font-mono text-xs">{shortId(tx.stellarTx, 8)}</span>} />
          <Field label="Started" value={dateTime(tx.startedAt)} />
          <Field label="Completed" value={dateTime(tx.completedAt)} />
        </dl>

        {note && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${note.tone === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
            {note.msg}
          </div>
        )}

        {/* Money actions — only meaningful on a non-terminal transaction. */}
        {st.stuck || tx.status.startsWith('pending') ? (
          <div className="mt-6 space-y-2 border-t border-line pt-4">
            <p className="text-xs text-subtle">Operator actions</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={retry.isPending}
                onClick={() => { if (confirm('Re-drive this transaction? Safe to retry — the money path is idempotent.')) retry.mutate(); }}>
                {retry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retry
              </Button>
              <Button variant="destructive" size="sm" disabled={refund.isPending}
                onClick={() => { if (confirm('Refund this transaction? This returns funds to the sender and cannot be undone.')) refund.mutate(); }}>
                {refund.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Refund
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-line pt-4 text-xs text-subtle">No actions available — this transaction is in a terminal state.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-subtle">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-subtle">Loading…</div>}>
      <TransactionsInner />
    </Suspense>
  );
}
