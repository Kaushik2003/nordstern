"use client";

import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** Horizontal liquidity meter — % of target with a low-cover warning. */
export function LiquidityMeter({
  label,
  pct,
  hours,
  low,
}: {
  label: string;
  pct: number;
  hours: number;
  low?: boolean;
}) {
  const tone = low ? "var(--color-warn)" : "var(--color-pos)";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
          {label}
          {low && <TriangleAlert className="size-3.5 text-warn" />}
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: tone }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: tone }}
        />
      </div>
      <p className={cn("mt-1 font-mono text-[10.5px]", low ? "text-warn" : "text-text-tertiary")}>
        ≈{hours.toFixed(1)}h of cover at current flow
      </p>
    </div>
  );
}

/** Generic labeled progress bar (reserve tiers, etc.). */
export function BarMeter({
  pct,
  color = "var(--color-brand)",
  className,
  delay = 0,
}: {
  pct: number;
  color?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}
