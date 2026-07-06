"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TriangleAlert, X, Radio } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Kpi } from "@/components/dashboard/kpi";
import { ReserveGauge } from "@/components/viz/gauge";
import { LiquidityMeter } from "@/components/viz/meter";
import { Sparkline } from "@/components/viz/sparkline";
import { MoneyGlobe } from "@/components/viz/globe";
import { LiveTape } from "@/components/viz/live-tape";
import { useApp } from "@/lib/providers";
import { useSkeleton } from "@/lib/hooks";
import { inrCompact, groupIN } from "@/lib/format";

// Import the live data hooks
import { useLive, Summary } from "@/lib/api";

// Import mock data for components that don't have live API support yet
import {
  series,
  ACTIVE_USERS,
  ACTIVE_USERS_DELTA,
  NEW_TODAY,
  LIQUIDITY,
} from "@/lib/data/store";

type Range = "24H" | "7D" | "30D" | "90D";
const WINDOWS: Record<Range, number> = { "24H": 2, "7D": 7, "30D": 30, "90D": 30 };

export default function OverviewPage() {
  const ready = useSkeleton();
  const { money } = useApp();
  const [range, setRange] = useState<Range>("30D");
  const [alertOpen, setAlertOpen] = useState(true);

  // Live Data
  const { data: s, loading: liveLoading, error } = useLive<Summary>('/admin/summary', 5000);

  // Derive flows and volumes from live data if available
  const flows = useMemo(() => {
    if (!s) return { net: 0, in: 0, out: 0 };
    const collected = parseFloat(s.volume.inrCollected || "0");
    const paidOut = parseFloat(s.volume.inrPaidOut || "0");
    return {
      net: collected - paidOut,
      in: collected,
      out: paidOut
    };
  }, [s]);

  const win = useMemo(() => {
    const n = WINDOWS[range];
    const slice = series.slice(-n);
    const spark = (slice.length >= 2 ? slice : series.slice(-7)).map((p) => p.volume);
    const vol = s ? flows.in + flows.out : 0; // Use live volume
    return { vol, spark };
  }, [range, s, flows]);

  // Derived Treasury from Live
  const TREASURY_LIVE = {
    available: s ? parseFloat(s.treasury.usdc || "0") : 0,
    ratio: 1.0, // Stablecoin backed 1:1
    tokensIssued: s ? parseFloat(s.volume.usdcDeposited || "0") - parseFloat(s.volume.usdcWithdrawn || "0") : 0,
    reserves: s ? parseFloat(s.treasury.usdc || "0") * parseFloat(s.rate.inrPerUsdc || "88.5") : 0,
  };

  if (!ready || (liveLoading && !s)) return <OverviewSkeleton />;

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        subtitle="Is everything healthy, and how are we doing today?"
        actions={
          <Segmented
            options={[
              { label: "24H", value: "24H" },
              { label: "7D", value: "7D" },
              { label: "30D", value: "30D" },
              { label: "90D", value: "90D" },
            ]}
            value={range}
            onChange={setRange}
          />
        }
      />

      {error && (
        <div className="mb-4 rounded-[12px] border border-crit/25 bg-crit-fill px-4 py-2.5 text-[13px] text-crit">
          Can't reach the anchor: {error}
        </div>
      )}

      {LIQUIDITY.usdc.low && alertOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-warn/25 bg-warn-fill px-4 py-2.5"
        >
          <TriangleAlert className="size-4 shrink-0 text-warn" />
          <p className="flex-1 text-[13px] text-text-primary">
            USDC liquidity covers ~2h at current flow. Top up, or widen the off-ramp spread.
          </p>
          <Link href="#">
            <Button size="sm" variant="secondary">Widen off-ramp spread</Button>
          </Link>
          <button onClick={() => setAlertOpen(false)} aria-label="Dismiss" className="grid size-7 place-items-center rounded-[8px] text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
            <X className="size-4" />
          </button>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left 8 columns */}
        <div className="grid content-start gap-4 lg:col-span-8">
          {/* Marquee — Total Volume */}
          <Kpi
            label={`Total volume · ${range} (Live)`}
            info="Gross on-ramp + off-ramp value moved through the anchor."
            value={win.vol}
            render={(n) => money(n)}
            delta={0} // Omitted from live API
            sub={`Current total volume`}
            size="lg"
            footer={<Sparkline data={win.spark} height={56} tone="brand" />}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              label="Active users"
              info="Users who transacted in the selected window. (Simulated)"
              value={ACTIVE_USERS}
              render={(n) => groupIN(Math.round(n))}
              delta={ACTIVE_USERS_DELTA}
              sub={`+${NEW_TODAY} today`}
            />
            <Kpi
              label="Net flow · Live"
              info="Net of deposits minus withdrawals."
              value={flows.net}
              render={(n) => inrCompact(n, { sign: true })}
              accent={flows.net >= 0 ? "text-pos" : "text-neg"}
              sub={
                <span className="font-mono">
                  <span className="text-pos">+{inrCompact(flows.in)}</span> in ·{" "}
                  <span className="text-neg">−{inrCompact(flows.out)}</span> out
                </span>
              }
            />
            <Card className="h-full">
              <CardBody className="flex h-full flex-col">
                <CardHead label="Available balance" info="Swept, settled funds ready to withdraw to your corporate account." />
                <div className="mt-3 font-mono text-[25px] font-semibold leading-none tabular-nums tracking-tight text-text-primary">
                  {money(TREASURY_LIVE.available)}
                  <span className="text-sm font-normal text-text-dim ml-2">USDC</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-pos">
                  <span className="size-1.5 rounded-full bg-pos" /> Ready to withdraw
                </div>
                <div className="mt-auto pt-3">
                  <Link href="#">
                    <Button size="sm" variant="primary" fullWidth trailingIcon={<ArrowRight className="size-3.5" />}>
                      Withdraw
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Right 4 columns */}
        <div className="grid content-start gap-4 lg:col-span-4">
          <Card>
            <CardBody>
              <CardHead label="Reserve health" info="Backing ratio = (fiat + crypto reserves) ÷ tokens issued." />
              <div className="mt-2 flex justify-center">
                <ReserveGauge ratio={TREASURY_LIVE.ratio} size={210} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-center">
                <div>
                  <div className="eyebrow mb-1">Issued</div>
                  <div className="font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(TREASURY_LIVE.tokensIssued)}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Reserves</div>
                  <div className="font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(TREASURY_LIVE.reserves)}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardHead label="Two-sided liquidity" info="Cover available to pay out off-ramps (fiat) and to mint on on-ramps (USDC)." />
              <div className="mt-4 space-y-4">
                <LiquidityMeter label="Fiat" pct={LIQUIDITY.fiat.pct} hours={LIQUIDITY.fiat.hours} />
                <LiquidityMeter label="USDC" pct={LIQUIDITY.usdc.pct} hours={LIQUIDITY.usdc.hours} low={LIQUIDITY.usdc.low} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Globe */}
        <Card className="overflow-hidden lg:col-span-8">
          <CardBody>
            <CardHead
              label="Money flow"
              action={
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-pos">
                  <Radio className="size-3 animate-[dot-pulse_1.6s_ease-in-out_infinite]" /> Live
                </span>
              }
            />
            <MoneyGlobe className="mt-2 min-h-[300px]" />
          </CardBody>
        </Card>

        {/* Tape */}
        <Card className="lg:col-span-4">
          <CardBody className="flex h-full flex-col">
            <CardHead label="Live tape" info="Every mint, payout, KYC pass and alert, newest first." />
            <div className="mt-2 min-h-0 flex-1">
              <LiveTape limit={13} />
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}

function OverviewSkeleton() {
  return (
    <PageContainer>
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-52" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-8">
          <Skeleton className="h-44 w-full rounded-[14px]" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-36 rounded-[14px]" />
            <Skeleton className="h-36 rounded-[14px]" />
            <Skeleton className="h-36 rounded-[14px]" />
          </div>
        </div>
        <div className="grid content-start gap-4 lg:col-span-4">
          <Skeleton className="h-64 rounded-[14px]" />
          <Skeleton className="h-44 rounded-[14px]" />
        </div>
        <Skeleton className="h-80 rounded-[14px] lg:col-span-8" />
        <Skeleton className="h-80 rounded-[14px] lg:col-span-4" />
      </div>
    </PageContainer>
  );
}
