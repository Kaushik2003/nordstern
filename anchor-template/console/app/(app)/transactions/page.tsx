'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Undo2, Loader2 } from 'lucide-react';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { num, dateTime, shortId, txStatus, legAmount } from '@/lib/format';
import { ExplorerLink } from '@/components/explorer-link';
import { DetailPanel, PanelSection, PanelRow, panelContentClass } from '@/components/detail-panel';
import { cn } from '@/lib/cn';

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

  // Keep the last selection mounted through the slide-out so the panel doesn't flash empty.
  const shownRef = useRef<Tx | null>(null);
  if (selected) shownRef.current = selected;
  const tx = selected ?? shownRef.current;

  return (
    <div className={cn('space-y-5', panelContentClass(!!selected))}>
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

      <div data-panel-keep>
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
                      const active = selected?.id === t.id;
                      return (
                        <TR key={t.id}
                          onClick={() => setSelected(active ? null : t)}
                          className={cn('cursor-pointer transition-colors', active ? 'bg-brand/[0.07] hover:bg-brand/[0.09]' : 'hover:bg-surface')}>
                          <TD className={cn('relative pl-4 capitalize', active && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand-700')}>{t.kind}</TD>
                          <TD><Badge tone={st.tone}>{st.label}</Badge></TD>
                          <TD className="tabular-nums">{legAmount(t.kind, 'in', t.amountIn)}</TD>
                          <TD className="tabular-nums">{legAmount(t.kind, 'out', t.amountOut)}</TD>
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
      </div>

      {tx && <TxDetail tx={tx} open={!!selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TxDetail({ tx, open, onClose }: { tx: Tx; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);
  const st = txStatus(tx.status);
  const actionable = st.stuck || tx.status.startsWith('pending');

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
    <DetailPanel
      open={open}
      onClose={onClose}
      title={<span className="capitalize">{tx.kind === 'deposit' ? 'On-ramp' : 'Off-ramp'}</span>}
      subtitle={<span className="font-mono">{shortId(tx.id, 8)}</span>}
      badge={<Badge tone={st.tone}>{st.label}</Badge>}
      footer={
        actionable ? (
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
        ) : (
          <p className="text-xs text-subtle">No actions available — this transaction is in a terminal state.</p>
        )
      }
    >
      {note && (
        <div className={`mb-2 rounded-lg px-3 py-2 text-sm ${note.tone === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
          {note.msg}
        </div>
      )}

      {/* Overview — the headline amounts */}
      <PanelSection title="Overview">
        <PanelRow label="Amount in" value={<span className="tabular-nums">{legAmount(tx.kind, 'in', tx.amountIn)}</span>} />
        <PanelRow label="Amount out" value={<span className="tabular-nums">{legAmount(tx.kind, 'out', tx.amountOut)}</span>} />
        <PanelRow label="Expected" value={<span className="tabular-nums">{legAmount(tx.kind, tx.kind === 'deposit' ? 'out' : 'in', tx.amountExpected)}</span>} />
      </PanelSection>

      {/* Identity — who / where */}
      <PanelSection title="Identity">
        <PanelRow label="Destination" value={<ExplorerLink kind="account" value={tx.destination} className="font-mono text-xs">{shortId(tx.destination, 8)}</ExplorerLink>} />
        <PanelRow label="Memo" value={<span className="font-mono text-xs">{tx.memo ?? '—'}</span>} />
      </PanelSection>

      {/* Activity — the on-chain + time trail */}
      <PanelSection title="Activity">
        <PanelRow label="Started" value={dateTime(tx.startedAt)} />
        <PanelRow label="Completed" value={dateTime(tx.completedAt)} />
        <PanelRow label="Stellar tx" value={<ExplorerLink kind="tx" value={tx.stellarTx} className="font-mono text-xs">{shortId(tx.stellarTx, 8)}</ExplorerLink>} />
        <PanelRow label="Transaction ID" value={<span className="font-mono text-[11px]">{tx.id}</span>} />
      </PanelSection>
    </DetailPanel>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-subtle">Loading…</div>}>
      <TransactionsInner />
    </Suspense>
  );
}
