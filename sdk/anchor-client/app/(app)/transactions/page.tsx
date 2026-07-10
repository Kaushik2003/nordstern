'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, ArrowDownToLine, ArrowUpFromLine, ChevronRight, RefreshCw } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Badge, Skeleton, type Tone } from '@/components/ui';
import { myTransactions, type CustomerTx } from '@/lib/anchor';
import { inr, dateTime } from '@/lib/format';

type Filter = 'all' | 'buy' | 'sell' | 'pending';

const PHASE: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning' },
  processing: { label: 'Processing', tone: 'info' },
  completing: { label: 'Almost done', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export default function HistoryPage() {
  const brand = useBrand();
  const [txns, setTxns] = useState<CustomerTx[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    setError('');
    try { setTxns(await myTransactions()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); setTxns([]); }
  }
  useEffect(() => { void load(); }, []);

  const rows = (txns ?? []).filter((t) =>
    filter === 'all' ? true : filter === 'pending' ? !['completed', 'failed', 'refunded'].includes(t.phase) : t.kind === filter,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Activity</h1>
        <button onClick={load} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="flex gap-1">
        {(['all', 'buy', 'sell', 'pending'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${filter === f ? 'bg-surface text-ink' : 'text-muted hover:bg-surface'}`}>
            {f === 'all' ? 'All' : f === 'pending' ? 'In progress' : f}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

      {txns === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !rows.length ? (
        <Card><CardBody className="flex flex-col items-center gap-2 py-16 text-center">
          <Receipt className="h-9 w-9 text-faint" />
          <p className="font-medium text-ink">{filter === 'all' ? 'No activity yet' : 'Nothing here'}</p>
          <p className="max-w-xs text-sm text-muted">{filter === 'all' ? `Your buys and sells with ${brand.name} will appear here.` : 'Try a different filter.'}</p>
        </CardBody></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => {
            const p = PHASE[t.phase] ?? { label: t.phase, tone: 'neutral' as Tone };
            const Icon = t.kind === 'buy' ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <Link key={t.id} href={`/transactions/${t.id}`}>
                <Card className="transition hover:border-brand">
                  <CardBody className="flex items-center gap-3 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15"><Icon className="h-5 w-5 text-brand-deep" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{t.kind === 'buy' ? 'Bought' : 'Sold'} {t.assetAmount ?? ''} {t.assetCode ?? brand.assetCode}</p>
                      <p className="text-xs text-muted">{dateTime(t.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{inr(t.inrAmount)}</p>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-faint" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
