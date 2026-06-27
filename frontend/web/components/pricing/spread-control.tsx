"use client";

import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface Zones {
  good: number; // upper bound of "competitive"
  warn: number; // upper bound of "high"
}

export function SpreadControl({
  value,
  onChange,
  min,
  max,
  rec,
  market,
  zones,
  presets,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  rec: number;
  market: number;
  zones: Zones;
  presets: { conservative: number; recommended: number; aggressive: number };
}) {
  const raf = useRef(0);
  const pct = (x: number) => ((x - min) / (max - min)) * 100;

  const animateTo = (target: number) => {
    cancelAnimationFrame(raf.current);
    const from = value;
    const dur = 420;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const e = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - e, 3);
      onChange(+(from + (target - from) * eased).toFixed(2));
      if (e < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const zone = value <= zones.good ? "competitive" : value <= zones.warn ? "high" : "uncompetitive";
  const zoneTone = zone === "competitive" ? "text-pos" : zone === "high" ? "text-warn" : "text-crit";

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1.5">Your spread</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[30px] font-semibold tabular-nums text-text-primary">{value.toFixed(2)}%</span>
            <span className={cn("text-[12px] font-medium capitalize", zoneTone)}>{zone}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow mb-1.5">Recommended</div>
          <span className="font-mono text-[16px] font-semibold tabular-nums text-brand">{rec.toFixed(2)}%</span>
        </div>
      </div>

      {/* Slider with colored zones + market benchmark */}
      <div className="relative mt-5 mb-1.5">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 overflow-hidden rounded-full">
          <div style={{ width: `${pct(zones.good)}%` }} className="h-full bg-pos/25" />
          <div style={{ width: `${pct(zones.warn) - pct(zones.good)}%` }} className="h-full bg-warn/25" />
          <div className="h-full flex-1 bg-crit/25" />
        </div>
        {/* market mid-rate marker */}
        <div
          title={`Market mid-rate ${market.toFixed(2)}%`}
          className="absolute top-1/2 z-10 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-text-secondary"
          style={{ left: `${pct(market)}%` }}
        />
        {/* recommended marker */}
        <div className="absolute top-1/2 z-10 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-brand" style={{ left: `${pct(rec)}%` }} />
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={0.05}
          onValueChange={(v) => onChange(v[0])}
          trackClassName="bg-transparent"
          rangeClassName="bg-transparent"
        />
      </div>
      <div className="flex justify-between font-mono text-[10.5px] text-text-tertiary">
        <span>{min.toFixed(1)}%</span>
        <span>{max.toFixed(1)}%</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {(["conservative", "recommended", "aggressive"] as const).map((k) => (
            <button
              key={k}
              onClick={() => animateTo(presets[k])}
              className="rounded-[8px] border border-border-subtle px-2.5 py-1.5 text-[11.5px] capitalize text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              {k}
            </button>
          ))}
        </div>
        <Button size="sm" variant="primary" className="ml-auto" onClick={() => animateTo(rec)}>
          Use recommended
        </Button>
      </div>
    </div>
  );
}
