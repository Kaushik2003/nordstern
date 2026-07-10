'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { inr, usdc, num } from '@/lib/format';

interface Summary {
  treasury: { usdc: string | null; xlm: string | null };
  counts: { total: number; deposits: number; withdrawals: number; completed: number; pending: number };
  volume: { inrCollected: string; usdcDeposited: string; usdcWithdrawn: string; inrPaidOut: string };
}
interface Tx { kind: string; status: string }
interface Case { status: string; severity: string }

const isOpen = (s: string) => ['open', 'reviewing', 'flagged', 'pending'].includes(s);

export default function ReportsPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => bizGet<Summary>('/admin/summary') });
  const txns = useQuery({ queryKey: ['transactions'], queryFn: () => bizGet<{ transactions: Tx[] }>('/admin/transactions') });
  const cases = useQuery({ queryKey: ['compliance'], queryFn: () => bizGet<{ cases: Case[] }>('/admin/compliance/cases') });

  const s = summary.data;
  const allTx = txns.data?.transactions ?? [];
  const failedPayouts = allTx.filter((t) => t.kind === 'withdrawal' && (t.status === 'error' || t.status === 'expired')).length;
  const allCases = cases.data?.cases ?? [];
  const openCases = allCases.filter((c) => isOpen(c.status)).length;
  const filed = allCases.filter((c) => c.status === 'filed').length;

  const loading = summary.isLoading || txns.isLoading;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
          <p className="text-sm text-subtle">Live operational figures, computed from your real transactions and cases.</p>
        </div>
        <div className="text-right">
          <Button variant="outline" size="sm" disabled title="CSV export is not supported by the backend yet"><Download className="h-4 w-4" /> Export CSV</Button>
          <p className="mt-1 max-w-[12rem] text-[11px] text-subtle">Export needs a backend endpoint that doesn&apos;t exist yet — disabled rather than faked.</p>
        </div>
      </div>

      <Section title="Volume">
        <Row label="INR collected (on-ramp)" value={inr(s?.volume.inrCollected)} loading={loading} />
        <Row label="USDC delivered" value={usdc(s?.volume.usdcDeposited)} loading={loading} />
        <Row label="USDC received (off-ramp)" value={usdc(s?.volume.usdcWithdrawn)} loading={loading} />
        <Row label="INR paid out" value={inr(s?.volume.inrPaidOut)} loading={loading} />
      </Section>

      <Section title="Transactions">
        <Row label="Deposits" value={String(s?.counts.deposits ?? 0)} loading={loading} />
        <Row label="Withdrawals" value={String(s?.counts.withdrawals ?? 0)} loading={loading} />
        <Row label="Completed" value={`${s?.counts.completed ?? 0} / ${s?.counts.total ?? 0}`} loading={loading} />
        <Row label="In progress" value={String(s?.counts.pending ?? 0)} loading={loading} />
        <Row label="Failed payouts" value={String(failedPayouts)} loading={txns.isLoading} />
      </Section>

      <Section title="Treasury (current float)">
        <Row label="USDC balance" value={usdc(s?.treasury.usdc)} loading={loading} />
        <Row label="XLM balance" value={num(s?.treasury.xlm)} loading={loading} />
        <p className="pt-1 text-xs text-subtle">Historical treasury movement isn&apos;t stored yet — only the current float is shown.</p>
      </Section>

      <Section title="Compliance">
        <Row label="Open cases" value={String(openCases)} loading={cases.isLoading} />
        <Row label="Filed (STR)" value={String(filed)} loading={cases.isLoading} />
        <Row label="Total cases" value={String(allCases.length)} loading={cases.isLoading} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-1.5 last:border-0">
      <span className="text-subtle">{label}</span>
      {loading ? <Skeleton className="h-4 w-16" /> : <span className="font-medium text-ink">{value}</span>}
    </div>
  );
}
