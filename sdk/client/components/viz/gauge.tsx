"use client";

import { useId } from "react";
import { useCountUp } from "@/lib/hooks";

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)] as const;
}

/** Semicircular backing-ratio gauge with a glowing arc that intensifies near
 *  the floor. ≥100% healthy · 95–100% watch · <95% breach. (PRD §5.3) */
export function ReserveGauge({
  ratio,
  size = 200,
  min = 90,
  max = 110,
  showLabel = true,
}: {
  ratio: number;
  size?: number;
  min?: number;
  max?: number;
  showLabel?: boolean;
}) {
  const id = useId();
  const animated = useCountUp(ratio, { duration: 900 });
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 6;
  const r = w / 2 - 14;
  const sw = size * 0.085;

  const frac = Math.max(0, Math.min(1, (ratio - min) / (max - min)));
  const endDeg = 180 * (1 - frac);
  const [ex, ey] = pt(cx, cy, r, endDeg);
  const [sx, sy] = pt(cx, cy, r, 180);

  const tone =
    ratio >= 100 ? "var(--color-pos)" : ratio >= 95 ? "var(--color-warn)" : "var(--color-crit)";
  const word = ratio >= 100 ? "Healthy" : ratio >= 95 ? "Watch" : "Breach";

  const track = `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${pt(cx, cy, r, 0)[0]} ${pt(cx, cy, r, 0)[1]}`;
  const value = `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs>
          <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={ratio < 100 ? 4 : 2.5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={track} fill="none" stroke="var(--color-surface-3)" strokeWidth={sw} strokeLinecap="round" />
        <path d={value} fill="none" stroke={tone} strokeWidth={sw} strokeLinecap="round" filter={`url(#glow-${id})`} />
        <circle cx={ex} cy={ey} r={sw * 0.62} fill={tone} />
        <circle cx={ex} cy={ey} r={sw * 0.28} fill="#fff" />
      </svg>
      {showLabel && (
        <div className="-mt-2 flex flex-col items-center">
          <span className="font-mono text-[26px] font-semibold tabular-nums text-text-primary">
            {animated.toFixed(1)}%
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: tone }}>
            <span className="size-1.5 rounded-full" style={{ background: tone }} />
            {word}
          </span>
        </div>
      )}
    </div>
  );
}
