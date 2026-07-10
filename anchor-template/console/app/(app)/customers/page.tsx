'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Ban } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { num, dateTime, shortId, legAmount } from '@/lib/format';
import { ExplorerLink } from '@/components/explorer-link';
import { DetailPanel, PanelSection, PanelRow, panelContentClass } from '@/components/detail-panel';
import { cn } from '@/lib/cn';

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

  const shownRef = useRef<Customer | null>(null);
  if (selected) shownRef.current = selected;
  const cust = selected ?? shownRef.current;

  return (
    <div className={cn('space-y-5', panelContentClass(!!selected))}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Customers</h1>
        <p className="text-sm text-subtle">Accounts that have transacted with your anchor, with real activity and KYC status.</p>
      </div>

      <div className="flex items-center rounded-lg border border-input bg-background px-3">
        <Search className="h-4 w-4 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by account…" className="w-full bg-transparent px-2 py-2 text-sm text-ink outline-none" />
      </div>

      <div data-panel-keep>
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
                    {rows.map((u) => {
                      const active = selected?.id === u.id;
                      return (
                        <TR key={u.id}
                          onClick={() => setSelected(active ? null : u)}
                          className={cn('cursor-pointer transition-colors', active ? 'bg-brand/[0.07] hover:bg-brand/[0.09]' : 'hover:bg-surface')}>
                          <TD className={cn('relative pl-4', active && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand-700')}>
                            <ExplorerLink kind="account" value={u.account} className="font-mono text-xs">{shortId(u.account, 8)}</ExplorerLink>
                          </TD>
                          <TD><Badge tone={kycTone(u.kycStatus)}>{u.kycStatus ?? 'unknown'}</Badge></TD>
                          <TD>{u.txCount}</TD>
                          <TD>{num(u.completedVolume)}</TD>
                          <TD className="text-subtle">{dateTime(new Date(u.lastSeen).toISOString())}</TD>
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

      {cust && <CustomerDetail c={cust} open={!!selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerDetail({ c, open, onClose }: { c: Customer; open: boolean; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['transactions'], queryFn: () => bizGet<{ transactions: Tx[] }>('/admin/transactions') });
  const theirTxns = (data?.transactions ?? []).filter((t) => t.destination === c.account);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title="Customer"
      subtitle={<span className="font-mono">{shortId(c.account, 10)}</span>}
      badge={<Badge tone={kycTone(c.kycStatus)}>{c.kycStatus ?? 'unknown'}</Badge>}
      footer={
        <div>
          {/* Freeze has no backend on the money server yet — disabled and labeled, not faked. */}
          <Button variant="outline" size="sm" disabled title="Account freeze is not yet supported by the backend">
            <Ban className="h-4 w-4" /> Freeze account
          </Button>
          <p className="mt-1.5 text-[11px] text-subtle">Account freeze requires a backend control that doesn&apos;t exist yet.</p>
        </div>
      }
    >
      {/* Overview */}
      <PanelSection title="Overview">
        <PanelRow label="Transactions" value={String(c.txCount)} />
        <PanelRow label="Completed volume" value={<span className="tabular-nums">{num(c.completedVolume)}</span>} />
        <PanelRow label="First seen" value={dateTime(new Date(c.firstSeen).toISOString())} />
        <PanelRow label="Last active" value={dateTime(new Date(c.lastSeen).toISOString())} />
      </PanelSection>

      {/* Identity */}
      <PanelSection title="Identity">
        <PanelRow label="KYC status" value={<Badge tone={kycTone(c.kycStatus)}>{c.kycStatus ?? 'unknown'}</Badge>} />
        <PanelRow label="Wallet" value={<ExplorerLink kind="account" value={c.account} className="font-mono text-xs">{shortId(c.account, 8)}</ExplorerLink>} />
      </PanelSection>

      {/* Activity */}
      <PanelSection title="Activity">
        {!theirTxns.length ? (
          <p className="py-1 text-[13px] text-subtle">No transactions to this account.</p>
        ) : (
          <div className="space-y-1.5">
            {theirTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]">
                <span className="capitalize text-ink">{t.kind === 'deposit' ? 'On-ramp' : 'Off-ramp'}</span>
                <span className="tabular-nums text-subtle">{legAmount(t.kind, 'in', t.amountIn) !== '—' ? legAmount(t.kind, 'in', t.amountIn) : legAmount(t.kind, 'out', t.amountOut)}</span>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </DetailPanel>
  );
}
