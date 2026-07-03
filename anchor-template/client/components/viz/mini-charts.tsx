"use client";

import { motion } from "framer-motion";

/* ---- Horizontal bars ---- */
export function HBars({
  data,
  color = "var(--color-brand)",
  fmt = (n) => String(n),
}: {
  data: { label: string; value: number }[];
  color?: string;
  fmt?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-[12px] text-text-secondary">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full" style={{ background: color }} />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-[12px] tabular-nums text-text-tertiary">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- 7×24 time-of-day heatmap ---- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function Heatmap({ matrix }: { matrix: number[][] }) {
  return (
    <div>
      <div className="flex flex-col gap-1">
        {matrix.map((row, d) => (
          <div key={d} className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 font-mono text-[10px] text-text-tertiary">{DAYS[d]}</span>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
              {row.map((v, h) => (
                <div key={h} className="aspect-square rounded-[2px]" style={{ background: `rgba(171,159,242,${(0.06 + v * 0.82).toFixed(3)})` }} title={`${DAYS[d]} ${h}:00 · ${Math.round(v * 100)}%`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between pl-9 font-mono text-[9.5px] text-text-tertiary">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span>
      </div>
    </div>
  );
}

/* ---- Cohort retention grid (triangular) ---- */
export function CohortGrid({ rows, labels }: { rows: (number | null)[][]; labels: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="text-left font-mono text-[10px] font-normal text-text-tertiary">Cohort</th>
            {Array.from({ length: 6 }).map((_, i) => <th key={i} className="font-mono text-[10px] font-normal text-text-tertiary">W{i}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              <td className="whitespace-nowrap pr-2 text-left text-[11px] text-text-secondary">{labels[r]}</td>
              {row.map((v, c) => (
                <td key={c}>
                  {v == null ? (
                    <div className="h-7 rounded-[5px]" />
                  ) : (
                    <div className="grid h-7 place-items-center rounded-[5px] font-mono text-[10.5px] tabular-nums" style={{ background: `rgba(46,192,139,${(0.1 + (v / 100) * 0.6).toFixed(3)})`, color: v > 55 ? "#0b0a10" : "var(--color-text-primary)" }}>{v}</div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Stacked area ---- */
export function StackedArea({ data }: { data: { t: number; fees: number; spread: number; yield: number }[] }) {
  const W = 100, H = 40;
  const totals = data.map((d) => d.fees + d.spread + d.yield);
  const max = Math.max(...totals, 1);
  const x = (i: number) => (i / (data.length - 1)) * W;
  const layers = [
    { key: "spread" as const, color: "var(--color-brand)" },
    { key: "fees" as const, color: "var(--color-cool)" },
    { key: "yield" as const, color: "var(--color-pos)" },
  ];
  let baseline = data.map(() => H);
  const paths = layers.map((l) => {
    const tops = data.map((d, i) => baseline[i] - (d[l.key] / max) * H);
    const area = `M ${x(0)},${baseline[0]} ` + data.map((_, i) => `L ${x(i)},${tops[i]}`).join(" ") + " " + data.map((_, i) => `L ${x(data.length - 1 - i)},${baseline[data.length - 1 - i]}`).join(" ") + " Z";
    baseline = tops;
    return { d: area, color: l.color };
  });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={120}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} fillOpacity={0.55} />)}
      </svg>
      <div className="mt-2 flex gap-4 font-mono text-[10.5px] text-text-tertiary">
        <Legend color="var(--color-brand)" label="Spread" />
        <Legend color="var(--color-cool)" label="Fees" />
        <Legend color="var(--color-pos)" label="Yield" />
      </div>
    </div>
  );
}

/* ---- Forecast with confidence band ---- */
export function ForecastChart({ points }: { points: { t: number; value: number; lo?: number; hi?: number; actual: boolean }[] }) {
  const W = 100, H = 40;
  const all = points.flatMap((p) => [p.value, p.hi ?? p.value]);
  const max = Math.max(...all, 1);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - (v / max) * (H - 2) - 1;
  const nowIdx = points.findIndex((p) => !p.actual);

  const actual = points.filter((p) => p.actual);
  const fc = points.filter((p) => !p.actual);
  const fcStart = nowIdx;

  const actualLine = actual.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const fcLine = fc.map((p, i) => `${i === 0 ? "M" : "L"}${x(fcStart + i)},${y(p.value)}`).join(" ");
  const band = fc.length
    ? `M ${x(fcStart)},${y(fc[0].hi ?? fc[0].value)} ` +
      fc.map((p, i) => `L ${x(fcStart + i)},${y(p.hi ?? p.value)}`).join(" ") + " " +
      fc.slice().reverse().map((p, i) => `L ${x(points.length - 1 - i)},${y(p.lo ?? p.value)}`).join(" ") + " Z"
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={130} className="overflow-visible">
      {band && <path d={band} fill="var(--color-brand)" fillOpacity={0.14} />}
      <line x1={x(nowIdx)} y1="0" x2={x(nowIdx)} y2={H} stroke="var(--color-text-tertiary)" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" opacity={0.5} />
      <path d={actualLine} fill="none" stroke="var(--color-brand)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <path d={fcLine} fill="none" stroke="var(--color-brand)" strokeWidth="1.6" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={0.8} />
    </svg>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: color }} />{label}</span>;
}
