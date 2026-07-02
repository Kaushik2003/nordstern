"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowRight, ShieldCheck, Sparkles, FileText } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, StatusPill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Copyable } from "@/components/ui/copyable";
import { Kpi } from "@/components/dashboard/kpi";
import { ReserveGauge } from "@/components/viz/gauge";
import { BarMeter } from "@/components/viz/meter";
import { ReserveSankey } from "@/components/viz/reserve-sankey";
import { WithdrawFlow, type WithdrawResult } from "@/components/treasury/withdraw-flow";
import { OptimizeSheet, type TierAlloc } from "@/components/treasury/optimize-sheet";
import { AttestationSheet } from "@/components/treasury/attestation-sheet";
import { useApp } from "@/lib/providers";
import { useCountUp, useSkeleton, useNow } from "@/lib/hooks";
import { inr, inrCompact, groupIN, relTime, clockIST } from "@/lib/format";
import { TREASURY } from "@/lib/data/store";
import type { WithdrawalRecord } from "@/lib/data/types";

// API
import { useLive, Summary, Tx as ApiTx } from "@/lib/api";

const TIER_META = [
  { key: "hot" as const, label: "Hot", color: "var(--color-cool)", yield: TREASURY.tiers.hot.yield, settle: "instant", note: TREASURY.tiers.hot.note },
  { key: "warm" as const, label: "Warm", color: "var(--color-brand)", yield: TREASURY.tiers.warm.yield, settle: TREASURY.tiers.warm.settle, note: TREASURY.tiers.warm.note },
  { key: "deployable" as const, label: "Deployable", color: "var(--color-pos)", yield: TREASURY.tiers.deployable.yield, settle: TREASURY.tiers.deployable.settle, note: TREASURY.tiers.deployable.note },
];

export default function TreasuryPage() {
  const ready = useSkeleton();
  const { money } = useApp();
  const now = useNow(10_000);

  // Live Data
  const { data: s, loading: sLoading } = useLive<Summary>('/admin/summary', 5000);
  const { data: tData, loading: tLoading } = useLive<{ transactions: ApiTx[] }>('/admin/transactions', 5000);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [attestOpen, setAttestOpen] = useState(false);
  const [tiers, setTiers] = useState<TierAlloc>({
    hot: TREASURY.tiers.hot.amount,
    warm: TREASURY.tiers.warm.amount,
    deployable: TREASURY.tiers.deployable.amount,
  });

  // Derived Treasury from Live
  const TREASURY_LIVE = useMemo(() => {
    return {
      available: s ? parseFloat(s.treasury.usdc || "0") : 0,
      ratio: 1.0, // Stablecoin backed 1:1
      tokensIssued: s ? parseFloat(s.volume.usdcDeposited || "0") - parseFloat(s.volume.usdcWithdrawn || "0") : 0,
      reserves: s ? parseFloat(s.treasury.usdc || "0") * parseFloat(s.rate.inrPerUsdc || "88.5") : 0,
    };
  }, [s]);

  const [historyLocal, setHistoryLocal] = useState<WithdrawalRecord[]>([]);
  const animatedBalance = useCountUp(TREASURY_LIVE.available, { duration: 900 });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("withdraw") === "1") {
      setWithdrawOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const onComplete = (r: WithdrawResult) => {
    // Optimistic local state for demo purposes until API catches up
    const rec: WithdrawalRecord = {
      id: r.utr,
      at: r.at,
      amount: r.amount,
      account: "Acme Pay ••6642",
      utr: r.utr,
      status: "processing",
    };
    setHistoryLocal((h) => [rec, ...h]);
  };

  const history = useMemo(() => {
    const apiHistory: WithdrawalRecord[] = (tData?.transactions || [])
      .filter((t) => t.kind === "withdrawal")
      .map((t) => ({
        id: t.id,
        at: t.startedAt ? new Date(t.startedAt).getTime() : Date.now(),
        amount: parseFloat(t.amountExpected?.amount || t.amountIn?.amount || "0"),
        account: t.destination || "Unknown",
        utr: t.memo || t.id,
        status: t.status === "completed" ? "settled" : (t.status === "error" ? "failed" : "processing"),
      }));
    
    // Combine local optimistic history with API history (deduping by ID)
    const combined = [...historyLocal];
    for (const apiRec of apiHistory) {
      if (!combined.find(c => c.id === apiRec.id)) {
        combined.push(apiRec);
      }
    }
    return combined.sort((a, b) => b.at - a.at);
  }, [tData, historyLocal]);

  const tierTotal = tiers.hot + tiers.warm + tiers.deployable;

  if (!ready || ((sLoading || tLoading) && !s)) return <TreasurySkeleton />;

  return (
    <PageContainer>
      <PageHeader title="Treasury" subtitle="What you've made, the reserves backing your tokens, and your money to withdraw." actions={<Pill tone="brand">Live Data</Pill>} />

      {/* Hero balance */}
      <Card className="relative overflow-hidden">
        <div className="glow-brand pointer-events-none absolute -top-1/2 left-1/2 size-[680px] -translate-x-1/2" aria-hidden />
        <CardBody className="relative grid items-center gap-6 py-7 md:grid-cols-[1fr_auto] md:py-9">
          <div>
            <div className="eyebrow">Available balance</div>
            <div className="mt-2 font-mono font-semibold tabular-nums tracking-tight text-text-primary" style={{ fontSize: "clamp(40px, 7vw, 68px)", lineHeight: 1 }}>
              {money(animatedBalance)} <span className="text-[24px] font-normal text-text-tertiary tracking-normal ml-2">USDC</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[13px]">
              {TREASURY_LIVE.available > 0 ? (
                <>
                  <span className="size-2 rounded-full bg-pos" />
                  <span className="text-pos">Ready to withdraw</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 text-pos" />
                  <span className="text-text-secondary">Awaiting incoming liquidity</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <Button
              variant="primary"
              size="lg"
              disabled={TREASURY_LIVE.available <= 0}
              onClick={() => setWithdrawOpen(true)}
              trailingIcon={<ArrowRight className="size-4" />}
            >
              Withdraw to corporate account
            </Button>
            <p className="text-center font-mono text-[11.5px] text-text-tertiary md:text-right">
              {s?.counts?.pending || 0} settlements in flight
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Secondary metrics */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi label="Pending settlements" info="In-flight deposits not yet swept into available balance." value={s?.counts?.pending || 0} render={(n) => String(n)} sub={`${s?.counts?.pending || 0} active operations`} />
        <Kpi label="Total volume" info="Gross value moved through the anchor." value={s ? parseFloat(s.volume.inrCollected) + parseFloat(s.volume.inrPaidOut) : 0} render={(n) => inrCompact(n)} />
        <Kpi label="Earned · 30D" info="Your revenue: fees + spread + yield over the last 30 days." value={TREASURY.earned30d} render={(n) => inr(Math.round(n))} delta={TREASURY.earned30dDelta} accent="text-pos" />
      </div>

      {/* Reserve composition + tiers */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <CardHead label="Reserve composition" info="How reserves flow into hot, warm and deployable tiers." />
            <div className="mt-3">
              <ReserveSankey />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardHead
              label="Reserve tiers & yield"
              action={
                <button onClick={() => setOptimizeOpen(true)} className="flex items-center gap-1 text-[12px] font-medium text-brand transition-colors hover:text-brand-300">
                  <Sparkles className="size-3.5" /> Optimize
                </button>
              }
            />
            <div className="mt-4 space-y-4">
              {TIER_META.map((t) => {
                const amount = tiers[t.key];
                return (
                  <div key={t.key}>
                    <div className="flex items-baseline justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                        <span className="size-2 rounded-full" style={{ background: t.color }} />
                        {t.label}
                        <span className="font-mono text-[11px] text-text-tertiary">· {t.note}</span>
                      </span>
                      <span className="font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(amount)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <BarMeter pct={(amount / tierTotal) * 100} color={t.color} className="flex-1" />
                      <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: t.yield > 0 ? "var(--color-pos)" : "var(--color-text-tertiary)" }}>
                        {t.yield > 0 ? `${t.yield}%` : "0%"} · {t.settle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-surface-2/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-text-secondary">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
              Reserves backing redeemable tokens are protected. Only profit and excess can be deployed.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Backing & proof of reserves */}
      <Card className="mt-4">
        <CardBody className="grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
          <div className="mx-auto">
            <ReserveGauge ratio={TREASURY_LIVE.ratio * 100} size={170} />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <Stat label="Tokens issued" value={`${groupIN(TREASURY_LIVE.tokensIssued)}`} unit="USDC" />
            <Stat label="Reserves" value={inr(TREASURY_LIVE.reserves)} />
            <Stat label="Backing ratio" value={`${(TREASURY_LIVE.ratio * 100).toFixed(1)}%`} accent="text-pos" />
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <Button variant="secondary" leadingIcon={<FileText className="size-4" />} onClick={() => setAttestOpen(true)}>
              View attestation
            </Button>
            <p className="text-center font-mono text-[10.5px] text-text-tertiary">Live from testnet</p>
          </div>
        </CardBody>
      </Card>

      {/* Withdrawal history */}
      <Card className="mt-4 overflow-hidden">
        <CardBody className="pb-0">
          <CardHead label="Withdrawal history" />
        </CardBody>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-y border-border-subtle bg-sunken/60">
                {["Date", "Amount", "Destination", "UTR", "Status"].map((h, i) => (
                  <th key={h} className={`px-5 py-2.5 font-mono text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary ${i === 1 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-tertiary">No withdrawals found</td>
                </tr>
              ) : history.map((w) => (
                <tr key={w.id} className="border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-2/40">
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                    <span className="font-mono tabular-nums text-text-primary">{clockIST(w.at)}</span>
                    <span className="ml-2 font-mono text-[11px] text-text-tertiary">{relTime(w.at, now)}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums text-text-primary">{inr(w.amount)}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-text-secondary">{w.account}</td>
                  <td className="whitespace-nowrap px-5 py-3"><Copyable value={w.utr} /></td>
                  <td className="whitespace-nowrap px-5 py-3"><StatusPill status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <WithdrawFlow open={withdrawOpen} onOpenChange={setWithdrawOpen} available={TREASURY_LIVE.available} onComplete={onComplete} />
      <OptimizeSheet open={optimizeOpen} onOpenChange={setOptimizeOpen} current={tiers} onApply={setTiers} />
      <AttestationSheet open={attestOpen} onOpenChange={setAttestOpen} />
    </PageContainer>
  );
}

function Stat({ label, value, unit, accent = "text-text-primary" }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className={`font-mono text-[16px] font-semibold tabular-nums ${accent}`}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-text-tertiary">{unit}</span>}
      </div>
    </div>
  );
}

function TreasurySkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-5 h-7 w-36" />
      <Skeleton className="h-44 w-full rounded-[14px]" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-[14px]" />
        <Skeleton className="h-28 rounded-[14px]" />
        <Skeleton className="h-28 rounded-[14px]" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-[14px]" />
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
      <Skeleton className="mt-4 h-40 rounded-[14px]" />
      <Skeleton className="mt-4 h-72 rounded-[14px]" />
    </PageContainer>
  );
}
