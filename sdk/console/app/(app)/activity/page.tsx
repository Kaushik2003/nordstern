'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Webhook, ScrollText, Radio,
} from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { num, relativeTime, txStatus } from '@/lib/format';

interface Item {
  type: 'deposit' | 'withdrawal' | 'audit' | 'kyc' | 'webhook';
  title: string;
  detail: string | null;
  amountIn: string | null;
  amountOut: string | null;
  status: string;
  actor: string | null;
  at: number;
}

const ICON: Record<Item['type'], React.ComponentType<{ className?: string }>> = {
  deposit: ArrowDownToLine, withdrawal: ArrowUpFromLine, audit: ScrollText, kyc: ShieldCheck, webhook: Webhook,
};

function describe(it: Item): { line: string; tone: BadgeTone; label: string } {
  if (it.type === 'deposit' || it.type === 'withdrawal') {
    const st = txStatus(it.status);
    const amt = it.type === 'deposit' ? it.amountIn : it.amountIn;
    return { line: `${it.title}${amt ? ` · ${num(amt)}` : ''}`, tone: st.tone, label: st.label };
  }
  if (it.type === 'kyc') {
    const s = it.status.toLowerCase();
    const tone: BadgeTone = s === 'approved' || s === 'verified' ? 'success' : s === 'declined' ? 'danger' : 'warning';
    return { line: 'Identity verification', tone, label: it.status };
  }
  if (it.type === 'webhook') {
    const ok = Number(it.status) >= 200 && Number(it.status) < 300;
    return { line: `Webhook · ${it.detail ?? ''}`, tone: ok ? 'success' : 'danger', label: it.status };
  }
  // audit
  return { line: it.detail ?? it.title, tone: 'info', label: it.title };
}

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => bizGet<{ activity: Item[] }>('/admin/activity'),
    refetchInterval: 6000, // live feel
  });
  const items = data?.activity ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Activity</h1>
          <p className="text-sm text-subtle">Everything happening across your anchor, as it happens.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> Live
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !items.length ? (
        <Card><CardContent className="py-10 text-center text-sm text-subtle">No activity yet. Deposits, withdrawals, verifications, and system events will stream here.</CardContent></Card>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => {
            const Icon = ICON[it.type];
            const d = describe(it);
            return (
              <Card key={`${it.at}-${i}`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-subtle">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{d.line}</p>
                    {it.actor && <p className="text-xs text-subtle">by {it.actor}</p>}
                  </div>
                  <Badge tone={d.tone}>{d.label}</Badge>
                  <span className="w-16 shrink-0 text-right text-xs text-subtle">{relativeTime(it.at)}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
