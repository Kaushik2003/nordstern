"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, Delta } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { IndiaMap } from "@/components/viz/india-map";
import { HBars, Heatmap, CohortGrid, StackedArea, ForecastChart } from "@/components/viz/mini-charts";
import { useSkeleton } from "@/lib/hooks";
import { inrCompact, groupIN } from "@/lib/format";
import {
  ageBands, deviceSplit, tierDist, sourceAttribution, txSizeHistogram, timeOfDay,
  cohortRetention, cohortLabels, corridors, concentration, volumeForecast, revenueSeries, benchmark, newVsReturning,
} from "@/lib/data/analytics";
import { cn } from "@/lib/cn";

// API
import { useLive, Summary } from "@/lib/api";

export default function AnalyticsPage() {
  const ready = useSkeleton();
  const [range, setRange] = useState("30D");
  
  // Live Data
  const { data: s, loading } = useLive<Summary>('/admin/summary', 5000);

  if (!ready || (loading && !s))
    return (
      <PageContainer>
        <Skeleton className="mb-5 h-7 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[520px] rounded-[14px] lg:col-span-2" />
          <Skeleton className="h-[520px] rounded-[14px]" />
        </div>
      </PageContainer>
    );

  const next24 = volumeForecast.filter((p) => !p.actual).slice(0, 24).reduce((sum, p) => sum + p.value, 0);
  const peakLiq = Math.max(...volumeForecast.filter((p) => !p.actual).map((p) => p.liq ?? 0));

  // Incorporate Live API counts into the display
  const totalUsersActive = s?.counts?.total || 18452;

  return (
    <PageContainer>
      <PageHeader
        title="Analytics & Intelligence"
        subtitle="Demographics, behaviour and a predictive layer — built for India."
        actions={<Segmented options={[{ label: "24H", value: "24H" }, { label: "7D", value: "7D" }, { label: "30D", value: "30D" }, { label: "90D", value: "90D" }]} value={range} onChange={setRange} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* India map */}
        <Card className="lg:col-span-2">
          <CardBody>
            <CardHead label="India activity" info="States shaded by transaction volume · click a state to drill into cities." action={<span className="font-mono text-[11px] text-text-tertiary">click to drill</span>} />
            <div className="mt-2"><IndiaMap /></div>
          </CardBody>
        </Card>

        {/* Demographics */}
        <Card>
          <CardBody>
            <CardHead label="Demographics" />
            <div className="mt-3 eyebrow mb-2">Age band</div>
            <HBars data={ageBands.map((a) => ({ label: a.band, value: a.pct }))} fmt={(n) => `${n}%`} />
            <div className="my-4 h-px bg-border-subtle" />
            <div className="eyebrow mb-2">Device / OS</div>
            <HBars data={deviceSplit.map((d) => ({ label: d.label, value: d.pct }))} color="var(--color-cool)" fmt={(n) => `${n}%`} />
            <div className="my-4 h-px bg-border-subtle" />
            <div className="eyebrow mb-2">KYC tier mix</div>
            <div className="flex gap-2">
              {tierDist.map((t) => (
                <div key={t.tier} className="flex-1 rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2 text-center">
                  <div className="font-mono text-[11px] text-text-tertiary">{t.tier}</div>
                  <div className="font-mono text-[15px] font-semibold tabular-nums text-text-primary">{groupIN(t.count)}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Heatmap */}
        <Card className="lg:col-span-2">
          <CardBody>
            <CardHead label="When money moves" info="Transaction intensity by hour of day × day of week." />
            <div className="mt-4"><Heatmap matrix={timeOfDay} /></div>
          </CardBody>
        </Card>

        {/* Tx size histogram */}
        <Card>
          <CardBody>
            <CardHead label="Transaction size" />
            <div className="mt-3"><HBars data={txSizeHistogram.map((b) => ({ label: b.label, value: b.count }))} color="var(--color-brand)" fmt={(n) => String(n)} /></div>
          </CardBody>
        </Card>

        {/* Source attribution */}
        <Card>
          <CardBody>
            <CardHead label="Source attribution" info="Which wallet/app sent the user." />
            <div className="mt-3"><HBars data={sourceAttribution.map((src) => ({ label: src.source, value: src.count }))} color="var(--color-pos)" fmt={(n) => String(n)} /></div>
            <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-[12px]">
              <span className="text-text-secondary">New vs returning</span>
              <span className="font-mono tabular-nums text-text-primary">{newVsReturning.newU}% / {newVsReturning.returning}%</span>
            </div>
          </CardBody>
        </Card>

        {/* Cohort retention */}
        <Card>
          <CardBody>
            <CardHead label="Cohort retention" info="Weekly retention by signup cohort." />
            <div className="mt-3"><CohortGrid rows={cohortRetention} labels={cohortLabels} /></div>
          </CardBody>
        </Card>

        {/* Concentration */}
        <Card>
          <CardBody>
            <CardHead label="Concentration" info="Share of volume held by the top 1% of users." />
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-[30px] font-semibold tabular-nums text-warn">{concentration.top1Share}%</span>
              <span className="text-[12px] text-text-tertiary">in top 1%</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {concentration.topUsers.slice(0, 4).map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Avatar name={u.name} initials={u.initials} size={22} />
                  <span className="flex-1 truncate text-[12.5px] text-text-secondary">{u.name}</span>
                  <span className="font-mono text-[12px] tabular-nums text-text-primary">{inrCompact(u.lifetimeVolume)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Forecast */}
        <Card className="lg:col-span-2">
          <CardBody>
            <CardHead label="Forecast · next 24–48h" info="Volume forecast with a 90% confidence band." action={<Pill tone="brand" icon={<TrendingUp className="size-3" />}>Predictive</Pill>} />
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Next-24h volume" value={inrCompact(next24)} />
              <Metric label="Peak liquidity demand" value={inrCompact(peakLiq)} />
              <Metric label="Confidence" value="90%" />
              <Metric label="Churn-risk users" value="142" accent="text-warn" />
            </div>
            <div className="mt-3"><ForecastChart points={volumeForecast} /></div>
            <div className="mt-1 flex justify-center gap-4 font-mono text-[10.5px] text-text-tertiary">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-brand" /> actual</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 border-t border-dashed border-brand" /> forecast</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand/20" /> 90% band</span>
            </div>
          </CardBody>
        </Card>

        {/* Corridors */}
        <Card>
          <CardBody>
            <CardHead label="Corridors" info="Hot fiat ↔ asset paths." />
            <div className="mt-3 space-y-3">
              {corridors.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[12.5px] text-text-primary">{c.name}</div>
                    <div className="font-mono text-[10.5px] text-text-tertiary">{(c.latencyMs / 1000).toFixed(1)}s latency</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(c.volume)}</div>
                    <Delta value={c.growth} className="text-[11px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Revenue by source */}
        <Card className="lg:col-span-2">
          <CardBody>
            <CardHead label="Revenue by source" info="Fees vs spread vs yield over time — ties Treasury earnings to drivers." />
            <div className="mt-3"><StackedArea data={revenueSeries} /></div>
          </CardBody>
        </Card>

        {/* Benchmark */}
        <Card>
          <CardBody>
            <CardHead label="vs network median" info="This anchor against the anonymised platform median." />
            <div className="mt-3 space-y-3">
              {benchmark.map((b) => {
                const better = b.lowerBetter ? b.you < b.median : b.you > b.median;
                return (
                  <div key={b.metric}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-text-secondary">{b.metric}</span>
                      <span className={cn("font-mono tabular-nums", better ? "text-pos" : "text-warn")}>{b.you}{b.unit} <span className="text-text-tertiary">vs {b.median}{b.unit}</span></span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (b.lowerBetter ? b.median / b.you : b.you / b.median) * 55)}%`, background: better ? "var(--color-pos)" : "var(--color-warn)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}

function Metric({ label, value, accent = "text-text-primary" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
      <div className="eyebrow mb-1">{label}</div>
      <div className={cn("font-mono text-[16px] font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}
