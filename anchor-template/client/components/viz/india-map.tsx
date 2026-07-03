"use client";

import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { stateDensity, maxStateVolume, cityDensity } from "@/lib/data/analytics";
import { inrCompact, groupIN } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const W = 520;
const H = 560;

export function IndiaMap() {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/data/india-states.geojson")
      .then((r) => r.json())
      .then((d) => on && setGeo(d))
      .catch(() => {});
    return () => { on = false; };
  }, []);

  const { paths, project } = useMemo(() => {
    if (!geo) return { paths: [] as { name: string; d: string }[], project: null as ReturnType<typeof geoMercator> | null };
    const p = geoMercator().fitSize([W, H], geo);
    const path = geoPath(p);
    return {
      paths: geo.features.map((f) => ({ name: (f.properties as { ST_NM: string }).ST_NM, d: path(f) ?? "" })),
      project: p,
    };
  }, [geo]);

  const cities = useMemo(
    () => Object.entries(cityDensity).sort((a, b) => b[1].count - a[1].count).slice(0, 12),
    [],
  );
  const maxCity = cities[0]?.[1].count ?? 1;

  if (!geo || !project) return <Skeleton className="aspect-[520/560] w-full rounded-[12px]" />;

  const fillFor = (name: string) => {
    const v = stateDensity[name]?.volume ?? 0;
    const norm = Math.sqrt(v / maxStateVolume);
    return `rgba(171,159,242,${(0.05 + 0.72 * norm).toFixed(3)})`;
  };

  const stateCities = selected ? Object.entries(cityDensity).filter(([, c]) => c.state === selected).sort((a, b) => b[1].count - a[1].count) : [];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="mx-auto max-h-[520px]">
        {paths.map((p) => (
          <path
            key={p.name}
            d={p.d}
            fill={fillFor(p.name)}
            stroke={selected === p.name ? "var(--color-brand)" : "var(--color-border-strong)"}
            strokeWidth={selected === p.name ? 1.6 : 0.5}
            className="cursor-pointer transition-[fill,stroke] duration-150 hover:fill-[rgba(171,159,242,0.55)]"
            onMouseEnter={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ name: p.name, x: e.clientX - r.left, y: e.clientY - r.top }); }}
            onMouseMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover((h) => h && { ...h, x: e.clientX - r.left, y: e.clientY - r.top }); }}
            onMouseLeave={() => setHover(null)}
            onClick={() => setSelected((s) => (s === p.name ? null : p.name))}
          />
        ))}
        {cities.map(([name, c]) => {
          const xy = project([c.lng, c.lat]);
          if (!xy) return null;
          const r = 2.5 + (c.count / maxCity) * 8;
          const dim = selected && c.state !== selected;
          return (
            <g key={name} opacity={dim ? 0.25 : 1}>
              <circle cx={xy[0]} cy={xy[1]} r={r} fill="var(--color-brand)" opacity="0.9" />
              <circle cx={xy[0]} cy={xy[1]} r={r} fill="none" stroke="var(--color-brand)" className="origin-center animate-[dot-pulse_2s_ease-in-out_infinite]" style={{ transformBox: "fill-box" }} />
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[8px] border border-border-default bg-surface-3 px-2.5 py-1.5 shadow-lg" style={{ left: hover.x, top: hover.y - 8 }}>
          <div className="text-[12px] font-medium text-text-primary">{hover.name}</div>
          <div className="font-mono text-[10.5px] text-text-tertiary">{groupIN(stateDensity[hover.name]?.count ?? 0)} users · {inrCompact(stateDensity[hover.name]?.volume ?? 0)}</div>
        </div>
      )}

      {selected && (
        <div className="absolute right-2 top-2 w-52 rounded-[12px] border border-border-default bg-surface-3/95 p-3 backdrop-blur">
          <button onClick={() => setSelected(null)} className="mb-2 flex items-center gap-1.5 text-[11.5px] text-text-secondary hover:text-text-primary"><ArrowLeft className="size-3.5" /> All India</button>
          <div className="text-[13px] font-semibold text-text-primary">{selected}</div>
          {stateCities.length ? (
            <div className="mt-2 space-y-1">
              {stateCities.map(([n, c]) => (
                <div key={n} className="flex items-center justify-between text-[12px]"><span className="text-text-secondary">{n}</span><span className="font-mono tabular-nums text-text-tertiary">{groupIN(c.count)}</span></div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11.5px] text-text-tertiary">No city-level activity sampled.</p>
          )}
        </div>
      )}
    </div>
  );
}
