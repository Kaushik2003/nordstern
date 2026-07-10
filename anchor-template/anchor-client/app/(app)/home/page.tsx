'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine, ArrowUpFromLine, ChevronRight, Receipt,
  TrendingUp, Wallet, CheckCircle2, ArrowRight, Sparkles, ShieldCheck,
} from 'lucide-react';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import {
  Panel, PanelHead, Kpi, ActionCard, EmptyState, Badge, Skeleton, reveal, type Tone,
} from '@/components/ui';
import { FadeUp } from '@/components/motion';
import { myTransactions, getQuote, type CustomerTx } from '@/lib/anchor';
import { customer as customerApi } from '@/lib/customer';
import { getAccount } from '@/lib/api';
import { inr, dateTime } from '@/lib/format';
import { VerificationCard } from '@/components/ecosystem';
import { useRouter } from 'next/navigation';

const PHASE: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning' },
  payment_received: { label: 'Received', tone: 'info' },
  processing: { label: 'Processing', tone: 'info' },
  completing: { label: 'Almost done', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export default function HomePage() {
  const { customer } = useCustomer();
  const brand = useBrand();
  const router = useRouter();
  const firstName = customer?.fullName?.split(' ')[0] || 'there';
  const verified = customer?.kycStatus === 'approved';

  const [txns, setTxns] = useState<CustomerTx[] | null>(null);
  const [rate, setRate] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<string | null>(null);

  useEffect(() => {
    myTransactions().then(setTxns).catch(() => setTxns([]));
    getQuote(1, 'buy').then((q) => setRate(q.inrPerUnit)).catch(() => {});
    // Holdings = the asset balance across the customer's linked wallets.
    customerApi.wallets().then(async (ws) => {
      if (!ws.length) { setHoldings('0'); return; }
      const bals = await Promise.all(ws.map((w) => getAccount(w.address).catch(() => null)));
      const total = bals.reduce((sum, b) => sum + (b?.anch ? Number(b.anch) : 0), 0);
      setHoldings(String(total));
    }).catch(() => setHoldings(null));
  }, []);

  // This-month volume (completed, INR).
  const now = new Date();
  const monthTx = (txns ?? []).filter((t) => {
    if (t.phase !== 'completed' || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthVolume = monthTx.reduce((s, t) => s + (t.inrAmount ? Number(t.inrAmount) : 0), 0);
  const recent = (txns ?? []).slice(0, 5);
  const hasHoldings = (holdings ? Number(holdings) : 0) > 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-brand-700">Welcome back</p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-ink">Hi, {firstName}</h1>
        </div>
        {verified && (
          <div className="flex gap-2">
            <Link href="/buy" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(to_right,var(--color-brand),color-mix(in_srgb,var(--color-brand)_45%,#000))] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_color-mix(in_srgb,var(--color-brand)_70%,transparent)] transition hover:brightness-[1.04]">
              <ArrowDownToLine className="h-4 w-4" /> Buy {brand.assetCode}
            </Link>
            <Link href="/sell" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-canvas px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface">
              <ArrowUpFromLine className="h-4 w-4" /> Sell
            </Link>
          </div>
        )}
      </FadeUp>

      {/* KYC gate — verification comes before anything else */}
      {!verified && (
        <div style={reveal(0.04)}>
          <VerificationCard status={customer?.kycStatus ?? 'unverified'} onAction={() => router.push('/verify')} />
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          style={reveal(0.06)}
          label="Your holdings" icon={<Wallet className="h-4 w-4" />}
          value={holdings === null ? <Skeleton className="h-7 w-24" /> : `${Number(holdings).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${brand.assetCode}`}
          sub={rate && holdings ? `≈ ${inr(Number(holdings) * Number(rate))}` : `Balance in ${brand.assetCode}`}
        />
        <Kpi
          style={reveal(0.12)}
          label="This month" icon={<TrendingUp className="h-4 w-4" />}
          value={txns === null ? <Skeleton className="h-7 w-24" /> : inr(monthVolume)}
          sub={`${monthTx.length} completed ${monthTx.length === 1 ? 'transaction' : 'transactions'}`}
        />
        <Kpi
          style={reveal(0.18)}
          label="Latest rate" icon={<Sparkles className="h-4 w-4" />}
          value={rate === null ? <Skeleton className="h-7 w-24" /> : inr(rate)}
          sub={`1 ${brand.assetCode} · live`}
        />
        <Kpi
          style={reveal(0.24)}
          label="Identity"
          value={verified ? 'Verified' : 'Unverified'}
          sub={verified ? 'buy & sell unlocked' : 'verify to unlock'}
          badge={verified ? 'Verified' : 'Action'}
          badgeClass={verified ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'}
        />
      </div>

      {/* Body */}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* Left: actions + activity */}
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionCard
              style={reveal(0.3)}
              href={verified ? '/buy' : '/verify'} locked={!verified}
              icon={<ArrowDownToLine className="h-5 w-5" />}
              title={`Buy ${brand.assetCode}`} desc={`Convert INR to ${brand.assetCode} and receive it in your wallet.`}
              cta={verified ? 'Buy now' : 'Verify to unlock'}
            />
            <ActionCard
              style={reveal(0.34)}
              href={verified ? '/sell' : '/verify'} locked={!verified}
              icon={<ArrowUpFromLine className="h-5 w-5" />}
              title={`Sell ${brand.assetCode}`} desc={`Convert ${brand.assetCode} back to INR, paid to your bank.`}
              cta={verified ? 'Sell now' : 'Verify to unlock'}
            />
          </div>

          <Panel style={reveal(0.38)} className="p-5">
            <PanelHead
              title="Recent activity"
              meta={<Link href="/transactions" className="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-800">View all <ChevronRight className="h-4 w-4" /></Link>}
            />
            {txns === null ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !recent.length ? (
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="No transactions yet"
                desc={`Your activity will appear here after your first ${verified ? 'purchase' : 'verification'}.`}
                action={verified
                  ? <Link href="/buy" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-[var(--color-brand-ink)] transition hover:opacity-90">Buy your first {brand.assetCode} <ArrowRight className="h-4 w-4" /></Link>
                  : undefined}
              />
            ) : (
              <div className="-mx-2">
                {recent.map((t, i) => {
                  const p = PHASE[t.phase] ?? { label: t.phase, tone: 'neutral' as Tone };
                  const Icon = t.kind === 'buy' ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <Link key={t.id} href={`/transactions/${t.id}`}
                      className={`flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface/70 ${i > 0 ? 'border-t border-line/70' : ''}`}>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{t.kind === 'buy' ? 'Bought' : 'Sold'} {t.assetAmount ?? ''} {t.assetCode ?? brand.assetCode}</p>
                        <p className="text-xs text-subtle">{dateTime(t.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-ink">{inr(t.inrAmount)}</p>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Right: next steps + rate */}
        <div className="space-y-5">
          <Panel style={reveal(0.34)} className="p-5">
            <PanelHead title="Get started" />
            <div className="-mx-2">
              <Insight done={verified} label="Verify your identity" href="/verify" />
              <Insight done={(txns?.length ?? 0) > 0} label="Make your first purchase" href={verified ? '/buy' : '/verify'} />
              <Insight done={hasHoldings} label="Hold a balance" href={verified ? '/buy' : '/verify'} />
            </div>
          </Panel>

          <Panel style={reveal(0.4)} className="p-5">
            <PanelHead
              title="Today's rate"
              meta={<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-up)]"><Sparkles className="h-3 w-3" /> Live</span>}
            />
            <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">1 {brand.assetCode}</p>
            <p className="mt-2 text-sm text-subtle">{rate ? `≈ ${inr(rate)}` : 'Fetching…'}</p>
            {verified && (
              <Link href="/buy" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-ink transition-colors hover:bg-surface">
                Buy at this rate <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </Panel>

          {verified && (
            <Panel style={reveal(0.44)} className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]"><ShieldCheck className="h-[18px] w-[18px]" /></span>
              <p className="text-[13px] leading-snug text-muted">Your identity is verified — buying and selling are unlocked here and across participating services.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Insight({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface/70">
      {done
        ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
        : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-line" />}
      <span className={`flex-1 text-[13px] ${done ? 'text-subtle line-through' : 'font-medium text-ink'}`}>{label}</span>
      {!done && <ChevronRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" />}
    </Link>
  );
}
