"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, ShieldAlert, Scale, SlidersHorizontal, ListChecks } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Delta, Pill } from "@/components/ui/pill";
import { SpreadControl } from "@/components/pricing/spread-control";
import { BacktestCurve, type CurvePoint } from "@/components/pricing/backtest-curve";
import { useSkeleton } from "@/lib/hooks";
import { inrCompact } from "@/lib/format";
import { PRICING, series } from "@/lib/data/store";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// API
import { useLive, Summary } from "@/lib/api";

const ELAST = 0.16;
const monthlyIn = series.reduce((s, p) => s + p.in, 0);
const monthlyOut = series.reduce((s, p) => s + p.out, 0);
const relVol = (s: number, market: number) => Math.max(0.4, Math.min(1.2, 1 - ELAST * (s - market)));
const earnedSide = (base: number, s: number, market: number) => base * relVol(s, market) * (s / 100);

export default function PricingPage() {
  const ready = useSkeleton();
  
  // Live Data
  const { data: s, loading } = useLive<Summary>('/admin/summary', 5000);

  const [onramp, setOnramp] = useState(PRICING.onramp.current);
  const [offramp, setOfframp] = useState(PRICING.offramp.current);
  const [breaker, setBreaker] = useState(true);
  const [instant, setInstant] = useState(false);
  const raf = useRef(0);

  // Strategy Engine state
  const [strategy, setStrategy] = useState<any>({
    minDeposit: 500,
    maxDeposit: 500000,
    maxSingleTx: 100000,
    dailyVolumeLimit: 1000000,
    fixedFee: 8.00,
    percentageFee: 0.05,
    supportedRails: ["UPI", "IMPS", "NEFT"],
    emergencyStop: false,
    maintenanceMode: false,
    autoPauseThreshold: 5000,
    riskScoreThreshold: 75,
    settlementBufferMin: 30
  });

  const fetchStrategy = async () => {
    try {
      const res = await fetch('/biz/admin/strategy');
      if (res.ok) {
        const data = await res.json();
        setStrategy(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStrategy();
  }, []);

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/biz/admin/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Strategy policy updated", { description: `Policy version v${data.version} active.` });
        fetchStrategy();
      } else {
        toast.error("Failed to save strategy policy");
      }
    } catch (e) {
      toast.error("Network error saving strategy");
    }
  };

  // Sync market rates with live FX quote if available
  const LIVE_PRICING = useMemo(() => {
    const liveFx = s?.rate?.inrPerUsdc ? parseFloat(s.rate.inrPerUsdc) : 88.50;
    const variance = (liveFx - 88.50) / 100;
    
    return {
      onramp: { ...PRICING.onramp, market: PRICING.onramp.market + variance, rec: PRICING.onramp.rec + variance },
      offramp: { ...PRICING.offramp, market: PRICING.offramp.market - variance, rec: PRICING.offramp.rec - variance },
    };
  }, [s]);

  // Demo cue: auto-animate spreads
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "spread") return;
    window.history.replaceState(null, "", window.location.pathname);
    const t = setTimeout(() => {
      const from = PRICING.offramp.current;
      const to = LIVE_PRICING.offramp.rec;
      const start = performance.now();
      const tick = (now: number) => {
        const e = Math.min(1, (now - start) / 600);
        setOfframp(+(from + (to - from) * (1 - Math.pow(1 - e, 3))).toFixed(2));
        if (e < 1) raf.current = requestAnimationFrame(tick);
        else toast("Applied recommended off-ramp spread", { description: `${to.toFixed(2)}% · backtest re-run` });
      };
      const frame = requestAnimationFrame(tick);
      raf.current = frame;
    }, 1400);
    return () => { clearTimeout(t); cancelAnimationFrame(raf.current); };
  }, [LIVE_PRICING.offramp.rec]);

  const backtest = useMemo<CurvePoint[]>(() => {
    const pts: CurvePoint[] = [];
    for (let s = LIVE_PRICING.offramp.min; s <= LIVE_PRICING.offramp.max + 1e-9; s += 0.1) {
      const vol = monthlyOut * relVol(s, LIVE_PRICING.offramp.market);
      pts.push({ s: +s.toFixed(2), vol, earned: vol * (s / 100) });
    }
    return pts;
  }, [LIVE_PRICING.offramp.min, LIVE_PRICING.offramp.max, LIVE_PRICING.offramp.market]);

  const offEarned = earnedSide(monthlyOut, offramp, LIVE_PRICING.offramp.market);
  const tradeoff = ((relVol(offramp, LIVE_PRICING.offramp.market) - relVol(LIVE_PRICING.offramp.rec, LIVE_PRICING.offramp.market)) / relVol(LIVE_PRICING.offramp.rec, LIVE_PRICING.offramp.market)) * 100;
  const totalEarned = earnedSide(monthlyIn, onramp, LIVE_PRICING.onramp.market) + offEarned;

  if (!ready || (loading && !s)) return <PricingSkeleton />;

  return (
    <PageContainer>
      <PageHeader 
        title="Strategy & Pricing" 
        subtitle="Set operational rules and margins. NordStern applies safety circuit-breakers and optimal spread recommendations." 
        actions={<Pill tone="brand">Live FX: ₹{s?.rate?.inrPerUsdc || "88.50"}</Pill>}
      />

      <Tabs defaultValue="pricing">
        <TabsList className="mb-4">
          <TabTrigger value="pricing"><SlidersHorizontal className="size-4" /> Pricing & Spreads</TabTrigger>
          <TabTrigger value="rules"><ListChecks className="size-4" /> Strategy Rules Engine</TabTrigger>
        </TabsList>

        <TabContent value="pricing">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody>
                <CardHead label="On-ramp · INR → USDC" info="The spread you take when users deposit and you mint USDC." />
                <div className="mt-4">
                  <SpreadControl
                    value={onramp}
                    onChange={(v) => setOnramp(v)}
                    min={LIVE_PRICING.onramp.min}
                    max={LIVE_PRICING.onramp.max}
                    rec={LIVE_PRICING.onramp.rec}
                    market={LIVE_PRICING.onramp.market}
                    zones={{ good: 1.1, warn: 1.8 }}
                    presets={{ conservative: 0.7, recommended: LIVE_PRICING.onramp.rec, aggressive: 1.3 }}
                  />
                </div>
                <WhyLine>UPI MDR is near zero and volatility is calm — the on-ramp can run tight without hurting margin.</WhyLine>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <CardHead label="Off-ramp · USDC → INR" info="The spread you take when users redeem USDC and you pay out fiat." />
                <div className="mt-4">
                  <SpreadControl
                    value={offramp}
                    onChange={(v) => setOfframp(v)}
                    min={LIVE_PRICING.offramp.min}
                    max={LIVE_PRICING.offramp.max}
                    rec={LIVE_PRICING.offramp.rec}
                    market={LIVE_PRICING.offramp.market}
                    zones={{ good: 1.5, warn: 2.2 }}
                    presets={{ conservative: 1.2, recommended: LIVE_PRICING.offramp.rec, aggressive: 2.0 }}
                  />
                </div>
                <WhyLine>Live market FX shows a slight variance. Adjusting the spread will capture better margins.</WhyLine>
              </CardBody>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardBody>
                <CardHead label="Fee structure" info="Charged on top of the spread, per corridor and tier." />
                <div className="mt-4 space-y-3">
                  <FeeField label="Flat fee" value="₹8.00" />
                  <FeeField label="Network fee" value="₹1.00" />
                  <FeeField label="Spread component" value={`${((onramp + offramp) / 2).toFixed(2)}%`} />
                  <label className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle px-3 py-2.5">
                    <span className="text-[13px] text-text-primary">Instant-settlement premium</span>
                    <Switch checked={instant} onCheckedChange={setInstant} />
                  </label>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <CardHead label="Inventory-aware pricing" info="Read the book and let user flow rebalance it, like a market maker." />
                <BalanceBeam />
                <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">
                  Book is <span className="font-medium text-text-primary">long INR / short USDC</span>. Make the rebalancing
                  direction cheaper — <span className="text-pos">off-ramp cheaper</span>, <span className="text-neg">on-ramp dearer</span>.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <CardHead label="Guardrails" info="Safety controls that clamp pricing automatically." />
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-[10px] border border-border-subtle px-3 py-2.5">
                    <span className="text-[13px] text-text-secondary">Clamp range</span>
                    <span className="font-mono text-[12.5px] tabular-nums text-text-primary">{LIVE_PRICING.offramp.min.toFixed(1)}–{LIVE_PRICING.offramp.max.toFixed(1)}%</span>
                  </div>
                  <label className="flex items-start justify-between gap-3 rounded-[10px] border border-border-subtle px-3 py-2.5">
                    <span className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                      <span className="text-[12.5px] leading-snug text-text-primary">Volatility circuit-breaker<br /><span className="text-[11px] text-text-tertiary">Auto-widen if 1h realized vol &gt; 1.2%</span></span>
                    </span>
                    <Switch checked={breaker} onCheckedChange={setBreaker} />
                  </label>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardBody>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <CardHead label="Backtest · off-ramp · last 30D" info="Re-runs over 30 days of flow as you drag the spread. Evidence, not guessing." />
                <button
                  onClick={() => { setOfframp(LIVE_PRICING.offramp.rec); toast("Applied recommended off-ramp spread", { description: `${LIVE_PRICING.offramp.rec.toFixed(2)}%` }); }}
                  className="text-[12px] font-medium text-brand hover:text-brand-300 cursor-pointer"
                >
                  Reset to recommended
                </button>
              </div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[280px_1fr] lg:items-center">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                  <Metric label="Spread" value={`${offramp.toFixed(2)}%`} />
                  <Metric label="Earned · 30D" value={inrCompact(offEarned)} accent="text-pos" />
                  <div>
                    <div className="eyebrow mb-1">Est. volume tradeoff</div>
                    <Delta value={tradeoff} className="text-[15px]" />
                  </div>
                  <Metric label="Total earned (both sides)" value={inrCompact(totalEarned)} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-[11px] text-text-tertiary">
                    <span className="font-mono">← lower volume · higher margin</span>
                    <span className="font-mono">higher volume · lower margin →</span>
                  </div>
                  <BacktestCurve points={backtest} currentS={offramp} />
                  <div className="mt-1.5 text-center font-mono text-[10.5px] text-text-tertiary">margin vs volume · current point marked</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </TabContent>

        <TabContent value="rules">
          <form onSubmit={handleSaveStrategy} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardBody className="space-y-3.5">
                  <CardHead label="Transaction limits" info="Deposit operational limit rules enforced on-chain." />
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <label className="eyebrow">Min Deposit (USDC)</label>
                      <Input 
                        type="number" 
                        value={strategy.minDeposit} 
                        onChange={(e) => setStrategy({ ...strategy, minDeposit: parseInt(e.target.value) })} 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="eyebrow">Max Deposit (USDC)</label>
                      <Input 
                        type="number" 
                        value={strategy.maxDeposit} 
                        onChange={(e) => setStrategy({ ...strategy, maxDeposit: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <label className="eyebrow">Max Single Tx (USDC)</label>
                      <Input 
                        type="number" 
                        value={strategy.maxSingleTx} 
                        onChange={(e) => setStrategy({ ...strategy, maxSingleTx: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="eyebrow">Daily Velocity Cap (USDC)</label>
                      <Input 
                        type="number" 
                        value={strategy.dailyVolumeLimit} 
                        onChange={(e) => setStrategy({ ...strategy, dailyVolumeLimit: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3.5">
                  <CardHead label="Fixed & Percentage Fees" info="Direct charge rates applied to ledger swaps." />
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <label className="eyebrow">Base Fixed Fee (INR)</label>
                      <Input 
                        type="number" 
                        value={strategy.fixedFee} 
                        onChange={(e) => setStrategy({ ...strategy, fixedFee: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="eyebrow">Percentage Fee (%)</label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={strategy.percentageFee} 
                        onChange={(e) => setStrategy({ ...strategy, percentageFee: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="eyebrow">Risk Score Threshold</label>
                    <Input 
                      type="number" 
                      value={strategy.riskScoreThreshold} 
                      onChange={(e) => setStrategy({ ...strategy, riskScoreThreshold: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3.5">
                  <CardHead label="Emergency controls & maintenance" info="Hard toggles to pause all operations." />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
                      <div>
                        <div className="text-[13px] font-medium text-text-primary">Emergency Kill-Switch</div>
                        <div className="text-[11px] text-text-tertiary">Instantly pauses all deposit and withdrawal requests</div>
                      </div>
                      <Switch 
                        checked={strategy.emergencyStop} 
                        onCheckedChange={(v) => setStrategy({ ...strategy, emergencyStop: v })} 
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
                      <div>
                        <div className="text-[13px] font-medium text-text-primary">Maintenance Mode</div>
                        <div className="text-[11px] text-text-tertiary">Gracefully rejects new incoming deposits</div>
                      </div>
                      <Switch 
                        checked={strategy.maintenanceMode} 
                        onCheckedChange={(v) => setStrategy({ ...strategy, maintenanceMode: v })} 
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3.5">
                  <CardHead label="Threshold configuration" info="Alert limits for liquidity buffers." />
                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <label className="eyebrow">Auto-Pause Float (USDC)</label>
                      <Input 
                        type="number" 
                        value={strategy.autoPauseThreshold} 
                        onChange={(e) => setStrategy({ ...strategy, autoPauseThreshold: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="eyebrow">Settlement Buffer (mins)</label>
                      <Input 
                        type="number" 
                        value={strategy.settlementBufferMin} 
                        onChange={(e) => setStrategy({ ...strategy, settlementBufferMin: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="primary">Save Strategy Policy</Button>
            </div>
          </form>
        </TabContent>
      </Tabs>
    </PageContainer>
  );
}

function WhyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-surface-2/60 px-3 py-2.5">
      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand" />
      <p className="text-[12.5px] leading-relaxed text-text-secondary">{children}</p>
    </div>
  );
}

function FeeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="font-mono text-[13px] font-medium tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function Metric({ label, value, accent = "text-text-primary" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className={`font-mono text-[20px] font-semibold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

function BalanceBeam() {
  const angle = -8;
  return (
    <div className="mt-4 grid place-items-center">
      <svg viewBox="0 0 200 92" width="100%" height="92" className="max-w-[260px]">
        <g transform={`rotate(${angle} 100 46)`}>
          <line x1="34" y1="46" x2="166" y2="46" stroke="var(--color-border-strong)" strokeWidth="3" strokeLinecap="round" />
          <g>
            <line x1="48" y1="46" x2="48" y2="58" stroke="var(--color-border-default)" strokeWidth="1.5" />
            <circle cx="48" cy="66" r="13" fill="var(--color-pos-fill)" stroke="var(--color-pos)" strokeWidth="1" />
            <text x="48" y="69" textAnchor="middle" className="fill-pos font-mono text-[9px]">INR</text>
          </g>
          <g>
            <line x1="152" y1="46" x2="152" y2="58" stroke="var(--color-border-default)" strokeWidth="1.5" />
            <circle cx="152" cy="66" r="11" fill="var(--color-neg-fill)" stroke="var(--color-neg)" strokeWidth="1" />
            <text x="152" y="69" textAnchor="middle" className="fill-neg font-mono text-[8px]">USDC</text>
          </g>
        </g>
        <path d="M100 44 L112 84 L88 84 Z" fill="var(--color-surface-3)" stroke="var(--color-border-default)" strokeWidth="1" />
        <circle cx="100" cy="46" r="3.5" fill="var(--color-brand)" />
      </svg>
      <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-tertiary">
        <Scale className="size-3" /> book skew · long INR
      </div>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-5 h-7 w-52" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[14px]" />
        <Skeleton className="h-64 rounded-[14px]" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-52 rounded-[14px]" />
        <Skeleton className="h-52 rounded-[14px]" />
        <Skeleton className="h-52 rounded-[14px]" />
      </div>
      <Skeleton className="mt-4 h-56 rounded-[14px]" />
    </PageContainer>
  );
}
