'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Ban } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { num, dateTime, shortId } from '@/lib/format';

// Real, transaction-derived customers (see backend /users). We show only what we truly
// know; contact identity, tiers and account-freeze have no backend and are not faked.
interface Customer { id: string; account: string; txCount: number; completedVolume: number; firstSeen: number; lastSeen: number; kycStatus: string | null }
interface Tx { id: string; kind: string; status: string; amountIn: string | null; amountOut: string | null; destination: string | null; startedAt: string | null }

const kycTone = (s: string | null): BadgeTone => (s == null ? 'neutral' : s === 'approved' || s === 'verified' ? 'success' : s === 'declined' ? 'danger' : 'warning');

export default function CustomersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => bizGet<{ users: Customer[] }>('/admin/users'), refetchInterval: 30000 });
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const rows = (data?.users ?? []).filter((u) => !q || u.account.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Customers</h1>
        <p className="text-sm text-subtle">Accounts that have transacted with your anchor, with real activity and KYC status.</p>
      </div>

      <div className="flex items-center rounded-lg border border-input bg-background px-3">
        <Search className="h-4 w-4 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by account…" className="w-full bg-transparent px-2 py-2 text-sm text-ink outline-none" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[0,1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <p className="p-8 text-center text-sm text-subtle">{q ? 'No customers match.' : 'No customers yet. Accounts appear here after their first transaction.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead><TR className="border-line"><TH className="pl-4">Account</TH><TH>KYC</TH><TH>Transactions</TH><TH>Volume</TH><TH>Last active</TH></TR></THead>
                <TBody>
                  {rows.map((u) => (
                    <TR key={u.id} className="cursor-pointer hover:bg-surface" onClick={() => setSelected(u)}>
                      <TD className="pl-4 font-mono text-xs">{shortId(u.account, 8)}</TD>
                      <TD><Badge tone={kycTone(u.kycStatus)}>{u.kycStatus ?? 'unknown'}</Badge></TD>
                      <TD>{u.txCount}</TD>
                      <TD>{num(u.completedVolume)}</TD>
                      <TD className="text-subtle">{dateTime(new Date(u.lastSeen).toISOString())}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <CustomerDrawer c={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerDrawer({ c, onClose }: { c: Customer; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['transactions'], queryFn: () => bizGet<{ transactions: Tx[] }>('/admin/transactions') });
  const theirTxns = (data?.transactions ?? []).filter((t) => t.destination === c.account);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-canvas p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Customer</h2>
          <button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>

        <p className="break-all font-mono text-xs text-subtle">{c.account}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="KYC status" value={<Badge tone={kycTone(c.kycStatus)}>{c.kycStatus ?? 'unknown'}</Badge>} />
          <Metric label="Transactions" value={String(c.txCount)} />
          <Metric label="Completed volume" value={num(c.completedVolume)} />
          <Metric label="First seen" value={dateTime(new Date(c.firstSeen).toISOString())} />
        </div>

        <h3 className="mt-6 text-sm font-semibold text-ink">Transactions</h3>
        {!theirTxns.length ? (
          <p className="mt-2 text-sm text-subtle">No transactions to this account.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {theirTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="capitalize text-ink">{t.kind}</span>
                <span className="text-subtle">{num(t.amountIn ?? t.amountOut)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Freeze has no backend on the money server yet — disabled and labeled, not faked. */}
        <div className="mt-6 border-t border-line pt-4">
          <Button variant="outline" size="sm" disabled title="Account freeze is not yet supported by the backend">
            <Ban className="h-4 w-4" /> Freeze account
          </Button>
          <p className="mt-1.5 text-xs text-subtle">Account freeze requires a backend control that doesn&apos;t exist yet (see audit doc).</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface p-3"><p className="text-xs text-subtle">{label}</p><div className="mt-0.5 text-sm font-semibold text-ink">{value}</div></div>;
}
