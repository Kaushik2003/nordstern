"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const toneStroke: Record<string, string> = {
  brand: "var(--color-brand)",
  pos: "var(--color-pos)",
  neg: "var(--color-neg)",
  cool: "var(--color-cool)",
};

/** Lightweight responsive area sparkline. Stroke stays crisp via non-scaling-stroke. */
export function Sparkline({
  data,
  height = 44,
  tone = "brand",
  area = true,
  strokeWidth = 1.6,
  className,
}: {
  data: number[];
  height?: number;
  tone?: "brand" | "pos" | "neg" | "cool";
  area?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  const id = useId();
  const W = 100;
  const H = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = pad + (1 - (d - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const areaPath = `${line} L${W},${H} L0,${H} Z`;
  const stroke = toneStroke[tone];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      height={height}
      width="100%"
      className={cn("block overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#spark-${id})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.6" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
