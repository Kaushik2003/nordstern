"use client";

import { useId } from "react";

export interface CurvePoint {
  s: number;
  vol: number;
  earned: number;
}

/** Margin-vs-volume revenue frontier with the current spread marked. */
export function BacktestCurve({ points, currentS, height = 150 }: { points: CurvePoint[]; currentS: number; height?: number }) {
  const id = useId();
  const W = 100;
  const H = 40;
  const sorted = [...points].sort((a, b) => a.vol - b.vol);
  const minV = Math.min(...sorted.map((p) => p.vol));
  const maxV = Math.max(...sorted.map((p) => p.vol));
  const maxE = Math.max(...sorted.map((p) => p.earned));
  const x = (v: number) => ((v - minV) / (maxV - minV || 1)) * W;
  const y = (e: number) => H - (e / (maxE || 1)) * (H - 3) - 1.5;

  const line = sorted.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.vol).toFixed(2)},${y(p.earned).toFixed(2)}`).join(" ");
  const area = `${line} L${x(sorted[sorted.length - 1].vol)},${H} L${x(sorted[0].vol)},${H} Z`;

  const cur = points.reduce((a, b) => (Math.abs(b.s - currentS) < Math.abs(a.s - currentS) ? b : a), points[0]);
  const cx = x(cur.vol);
  const cy = y(cur.earned);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`bt-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#bt-${id})`} />
      <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* current marker */}
      <line x1={cx} y1="0" x2={cx} y2={H} stroke="var(--color-text-tertiary)" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" opacity={0.5} />
      <circle cx={cx} cy={cy} r="2.4" fill="var(--color-brand)" stroke="var(--color-base)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
