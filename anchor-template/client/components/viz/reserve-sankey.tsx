"use client";

import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { inrCompact } from "@/lib/format";

interface N {
  name: string;
  color: string;
  policy: string;
}
interface L {
  source: number;
  target: number;
  value: number;
}

const NODES: N[] = [
  { name: "Fiat in", color: "var(--color-brand-300)", policy: "Customer INR captured via RazorpayX" },
  { name: "Hot buffer", color: "var(--color-cool)", policy: "Cash · instant · never touched" },
  { name: "Warm · T-bills", color: "var(--color-brand)", policy: "T-bills / liquid funds · ~6.8% · T+1" },
  { name: "Deployable", color: "var(--color-pos)", policy: "Profit & excess only · auto-unwind" },
  { name: "Cross-chain yield", color: "var(--color-pos)", policy: "On-chain LP · ~11.2% · auto-unwind" },
];

const LINKS: L[] = [
  { source: 0, target: 1, value: 35_00_000 },
  { source: 0, target: 2, value: 67_40_000 },
  { source: 0, target: 3, value: 2_40_000 },
  { source: 3, target: 4, value: 2_40_000 },
];

const W = 540;
const H = 280;

export function ReserveSankey() {
  const graph = useMemo(() => {
    const layout = sankey<N, L>()
      .nodeWidth(13)
      .nodePadding(20)
      .nodeAlign(sankeyJustify)
      .extent([
        [2, 14],
        [W - 2, H - 14],
      ]);
    return layout({
      nodes: NODES.map((d) => ({ ...d })),
      links: LINKS.map((d) => ({ ...d })),
    });
  }, []);

  const linkPath = sankeyLinkHorizontal<N, L>();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
      <g>
        {graph.links.map((l, i) => {
          const d = linkPath(l) ?? "";
          const color = (l.target as unknown as N).color;
          const src = (l.source as unknown as N).name;
          const tgt = (l.target as unknown as N).name;
          return (
            <g key={i} className="group">
              <title>{`${src} → ${tgt} · ${inrCompact(l.value)}`}</title>
              <path d={d} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={Math.max(1, l.width ?? 1)} className="transition-opacity group-hover:[stroke-opacity:0.4]" />
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity={0.5}
                strokeWidth={Math.max(1, l.width ?? 1)}
                strokeDasharray="3 14"
                className="animate-[dash_1.1s_linear_infinite]"
                style={{ mixBlendMode: "screen" }}
              />
            </g>
          );
        })}
      </g>
      <g>
        {graph.nodes.map((n, i) => {
          const node = n as unknown as N & { x0: number; x1: number; y0: number; y1: number };
          const leftSide = node.x0 < W / 2;
          return (
            <g key={i}>
              <rect
                x={node.x0}
                y={node.y0}
                width={node.x1 - node.x0}
                height={Math.max(2, node.y1 - node.y0)}
                rx={2}
                fill={node.color}
                fillOpacity={0.85}
              />
              <text
                x={leftSide ? node.x1 + 8 : node.x0 - 8}
                y={(node.y0 + node.y1) / 2}
                textAnchor={leftSide ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-text-secondary font-sans text-[11px]"
              >
                <tspan className="fill-text-primary font-medium">{node.name}</tspan>
              </text>
              <text
                x={leftSide ? node.x1 + 8 : node.x0 - 8}
                y={(node.y0 + node.y1) / 2 + 13}
                textAnchor={leftSide ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-text-tertiary font-mono text-[10px] tabular-nums"
              >
                {inrCompact(sumFor(i))}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function sumFor(i: number) {
  if (i === 0) return LINKS.filter((l) => l.source === 0).reduce((s, l) => s + l.value, 0);
  const incoming = LINKS.filter((l) => l.target === i).reduce((s, l) => s + l.value, 0);
  return incoming;
}
