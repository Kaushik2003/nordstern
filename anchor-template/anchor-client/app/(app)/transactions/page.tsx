'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Receipt, ArrowDownToLine, ArrowUpFromLine, ChevronRight, RefreshCw, Search, ArrowUpRight } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Badge, Skeleton, Table, Th, Td, type Tone } from '@/components/ui';
import { myTransactions, type CustomerTx } from '@/lib/anchor';
import { inr, dateTime } from '@/lib/format';

type Filter = 'all' | 'buy' | 'sell' | 'pending';

const PHASE: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning' },
  payment_received: { label: 'Received', tone: 'info' },
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
  const [query, setQuery] = useState('');

  async function load() {
    setError('');
    try { setTxns(await myTransactions()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); setTxns([]); }
  }
  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const byFilter = (txns ?? []).filter((t) =>
      filter === 'all' ? true : filter === 'pending' ? !['completed', 'failed', 'refunded'].includes(t.phase) : t.kind === filter,
    );
    const q = query.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter((t) =>
      [t.reference, t.assetCode, t.kind, t.assetAmount, t.inrAmount, PHASE[t.phase]?.label]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [txns, filter, query]);

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Activity</h1>
          <p className="mt-1 text-sm text-muted">Every buy and sell with {brand.name}.</p>
        </div>
        <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {(['all', 'buy', 'sell', 'pending'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${filter === f ? 'bg-ink text-white' : 'text-muted hover:bg-surface'}`}>
              {f === 'all' ? 'All' : f === 'pending' ? 'In progress' : f}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reference, amount…"
            className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
        </div>
      </div>

      {error && <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

      {txns === null ? (
        <Card><div className="space-y-px p-2">{[0, 1, 2, 3].map((i) => <div key={i} className="p-3"><Skeleton className="h-9 w-full" /></div>)}</div></Card>
      ) : !rows.length ? (
        <Card><CardBody className="flex flex-col items-center gap-2 py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface"><Receipt className="h-8 w-8 text-faint" /></div>
          <p className="mt-1 text-lg font-semibold text-ink">{filter === 'all' && !query ? 'No transactions yet' : 'Nothing matches'}</p>
          <p className="max-w-sm text-sm text-muted">{filter === 'all' && !query ? `Your activity will appear here after your first purchase.` : 'Try a different filter or search.'}</p>
          {filter === 'all' && !query && <Link href="/buy" className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-[var(--color-brand-ink)] transition hover:opacity-90">Buy your first {brand.assetCode} <ArrowUpRight className="h-4 w-4" /></Link>}
        </CardBody></Card>
      ) : (
        <>
          {/* Desktop table (lg+) */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th><Th>Type</Th><Th>Asset</Th><Th className="text-right">Amount</Th>
                    <Th>Status</Th><Th>Reference</Th><Th className="w-10"></Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const p = PHASE[t.phase] ?? { label: t.phase, tone: 'neutral' as Tone };
                    const Icon = t.kind === 'buy' ? ArrowDownToLine : ArrowUpFromLine;
                    return (
                      <tr key={t.id} className="group cursor-pointer transition hover:bg-surface/50"
                        onClick={() => { window.location.href = `/transactions/${t.id}`; }}>
                        <Td className="whitespace-nowrap text-muted">{dateTime(t.createdAt)}</Td>
                        <Td>
                          <span className="inline-flex items-center gap-2 font-medium">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/12"><Icon className="h-3.5 w-3.5 text-brand-deep" /></span>
                            {t.kind === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </Td>
                        <Td className="font-medium">{t.assetCode ?? brand.assetCode}</Td>
                        <Td className="text-right">
                          <span className="font-semibold text-ink">{t.assetAmount ?? '—'} {t.assetCode ?? brand.assetCode}</span>
                          <span className="block text-xs text-muted">{inr(t.inrAmount)}</span>
                        </Td>
                        <Td><Badge tone={p.tone}>{p.label}</Badge></Td>
                        <Td className="font-mono text-xs text-muted">{t.reference ?? t.id.slice(0, 8).toUpperCase()}</Td>
                        <Td><ChevronRight className="h-4 w-4 text-faint transition group-hover:text-ink" /></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>

          {/* Mobile cards (below lg) */}
          <div className="space-y-2 lg:hidden">
            {rows.map((t) => {
              const p = PHASE[t.phase] ?? { label: t.phase, tone: 'neutral' as Tone };
              const Icon = t.kind === 'buy' ? ArrowDownToLine : ArrowUpFromLine;
              return (
                <Link key={t.id} href={`/transactions/${t.id}`}>
                  <Card className="transition hover:border-brand">
                    <CardBody className="flex items-center gap-3 p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/12"><Icon className="h-5 w-5 text-brand-deep" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{t.kind === 'buy' ? 'Bought' : 'Sold'} {t.assetAmount ?? ''} {t.assetCode ?? brand.assetCode}</p>
                        <p className="text-xs text-muted">{dateTime(t.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{inr(t.inrAmount)}</p>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
