'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Activity } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { useAnchor } from '@/components/anchor-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { num, inr, usdc, healthTone } from '@/lib/format';

// Real anchor data from this anchor's business-server (/biz/admin/summary). Treasury from
// Horizon, transaction counts/volume from the Anchor Platform, health checked live.
interface Summary {
  network: string;
  asset: { code: string; issuer: string; id: string };
  treasury: { address: string; usdc: string | null; xlm: string | null };
  counts: { total: number; deposits: number; withdrawals: number; completed: number; pending: number };
  volume: { inrCollected: string; usdcDeposited: string; usdcWithdrawn: string; inrPaidOut: string };
  fiat: { pendingDeposits: string | null; dailyInflow: string | null };
  health: Record<string, string>;
}

export default function OverviewPage() {
  const { name, loading } = useAnchor();
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: () => bizGet<Summary>('/admin/summary'),
    refetchInterval: 15000,
  });

  const busy = loading || isLoading;
  const pending = data?.counts.pending ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Overview</h1>
          <p className="text-sm text-subtle">
            Operating <span className="font-medium text-ink">{name}</span>
            {data && <> — issuing <span className="font-medium text-ink">{data.asset.code}</span> on {data.network}.</>}
          </p>
        </div>
        {data && <HealthStrip health={data.health} />}
      </div>

      {error ? (
        <Card><CardContent className="py-6 text-sm text-subtle">Live data unavailable — the anchor may still be warming up, or your session lacks operator access to this anchor.</CardContent></Card>
      ) : (
        <>
          {/* Attention banner — the first thing an operator should see each morning. */}
          {pending > 0 && (
            <Link href="/transactions?filter=pending" className="block">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                <span className="font-medium text-[var(--color-warning)]">
                  {pending} transaction{pending === 1 ? '' : 's'} in progress
                </span>
                <span className="text-[var(--color-warning)]/80">— review in Transactions →</span>
              </div>
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Treasury (USDC float)" value={<>{num(data?.treasury.usdc)} <span className="text-sm font-medium text-subtle">USDC</span></>} sub={`${num(data?.treasury.xlm)} XLM for fees`} icon={Wallet} loading={busy} />
            <Stat label="In progress" value={pending} sub={pending ? 'needs monitoring' : 'all settled'} icon={Activity} loading={busy} accent={pending > 0 ? 'danger' : 'default'} />
            <Stat label="Deposits (on-ramp)" value={data?.counts.deposits ?? 0} sub={`${inr(data?.volume.inrCollected)} collected`} icon={ArrowDownToLine} loading={busy} />
            <Stat label="Withdrawals (off-ramp)" value={data?.counts.withdrawals ?? 0} sub={`${inr(data?.volume.inrPaidOut)} paid out`} icon={ArrowUpFromLine} loading={busy} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">On-ramp volume</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="INR collected" value={inr(data?.volume.inrCollected)} />
                <Row label="USDC delivered" value={usdc(data?.volume.usdcDeposited)} />
                <Row label="Pending deposits" value={inr(data?.fiat.pendingDeposits)} />
                <Row label="Today's inflow" value={inr(data?.fiat.dailyInflow)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Off-ramp volume</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="USDC received" value={usdc(data?.volume.usdcWithdrawn)} />
                <Row label="INR paid out" value={inr(data?.volume.inrPaidOut)} />
                <Row label="Completed" value={`${data?.counts.completed ?? 0} / ${data?.counts.total ?? 0}`} />
                <Row label="Treasury account" value={<span className="font-mono text-xs">{data?.treasury.address ? `${data.treasury.address.slice(0, 6)}…${data.treasury.address.slice(-4)}` : '—'}</span>} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-1.5 last:border-0">
      <span className="text-subtle">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function HealthStrip({ health }: { health: Record<string, string> }) {
  const label: Record<string, string> = { databaseStatus: 'DB', horizonConnectivity: 'Horizon', workerStatus: 'Workers' };
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(health).map(([k, v]) => (
        <Badge key={k} tone={healthTone(v)} title={`${k}: ${v}`}>{label[k] ?? k}: {v}</Badge>
      ))}
    </div>
  );
}
