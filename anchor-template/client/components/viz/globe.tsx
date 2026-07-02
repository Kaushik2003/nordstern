"use client";

import createGlobe, { type Marker, type Arc } from "cobe";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useEventStream, useMediaQuery } from "@/lib/hooks";
import { inr, relTime } from "@/lib/format";
import { HUB } from "@/lib/data/geo";
import { cn } from "@/lib/cn";
import type { Tx } from "@/lib/data/types";

const HUB_LOC: [number, number] = [HUB.lat, HUB.lng];
const POS_RGB: [number, number, number] = [0.18, 0.75, 0.55];
const NEG_RGB: [number, number, number] = [1, 0.55, 0.45];
const BRAND_RGB: [number, number, number] = [0.67, 0.62, 0.95];

const BASE_MARKERS: Marker[] = [
  { location: [19.076, 72.877], size: 0.08, color: BRAND_RGB },
  { location: [12.972, 77.595], size: 0.06, color: BRAND_RGB },
  { location: [28.613, 77.209], size: 0.06, color: BRAND_RGB },
  { location: [17.385, 78.487], size: 0.05, color: BRAND_RGB },
  { location: [22.573, 88.364], size: 0.045, color: BRAND_RGB },
  { location: [13.083, 80.27], size: 0.045, color: BRAND_RGB },
];

const LIFETIME = 2600;

export function MoneyGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const events = useEventStream();
  const dyn = useRef<{ markers: { m: Marker; born: number }[]; arcs: { a: Arc; born: number }[] }>({
    markers: [],
    arcs: [],
  });
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    const e = events[0];
    if (!e || e.id === lastId.current) return;
    lastId.current = e.id;
    if (e.kind !== "tx") return;
    const now = Date.now();
    const color = e.tx.dir === "in" ? POS_RGB : NEG_RGB;
    const loc: [number, number] = [e.tx.lat, e.tx.lng];
    dyn.current.markers = [{ m: { location: loc, size: 0.05, color }, born: now }, ...dyn.current.markers].slice(0, 28);
    const a: Arc = e.tx.dir === "in" ? { from: loc, to: HUB_LOC, color } : { from: HUB_LOC, to: loc, color };
    dyn.current.arcs = [{ a, born: now }, ...dyn.current.arcs].slice(0, 16);
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDesktop) return;
    let phi = 4.7;
    let width = 0;
    let raf = 0;
    const onResize = () => {
      width = canvas.offsetWidth;
    };
    onResize();
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi,
      theta: 0.32,
      dark: 1,
      diffuse: 1.15,
      mapSamples: 17000,
      mapBrightness: 5.6,
      baseColor: [0.32, 0.3, 0.42],
      markerColor: BRAND_RGB,
      glowColor: [0.22, 0.19, 0.35],
      markers: BASE_MARKERS,
      arcs: [],
      arcColor: BRAND_RGB,
      arcWidth: 2.2,
      arcHeight: 0.42,
    });

    const frame = () => {
      if (!reduce) phi += 0.0026;
      const now = Date.now();
      dyn.current.markers = dyn.current.markers.filter((x) => now - x.born < LIFETIME);
      dyn.current.arcs = dyn.current.arcs.filter((x) => now - x.born < LIFETIME);
      globe.update({
        phi,
        theta: 0.32,
        width: width * 2,
        height: width * 2,
        markers: [...BASE_MARKERS, ...dyn.current.markers.map((x) => x.m)],
        arcs: dyn.current.arcs.map((x) => x.a),
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [reduce, isDesktop]);

  if (!isDesktop || reduce) {
    return <FlatFlow className={className} events={events} />;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="glow-brand size-[80%] rounded-full" />
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        <canvas ref={canvasRef} className="size-full" style={{ contain: "layout paint size" }} />
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-1 left-1 flex flex-col gap-1 font-mono text-[10.5px] text-text-tertiary">
      <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-pos" /> Inbound · mint</span>
      <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-neg" /> Outbound · payout</span>
    </div>
  );
}

function FlatFlow({ className, events }: { className?: string; events: ReturnType<typeof useEventStream> }) {
  const txs = events
    .filter((e): e is { id: string; at: number; kind: "tx"; tx: Tx } => e.kind === "tx")
    .slice(0, 7);
  return (
    <div className={cn("flex flex-col justify-center gap-1.5", className)}>
      <div className="eyebrow mb-1">Live money flow</div>
      {txs.length === 0 && <p className="text-[13px] text-text-tertiary">Waiting for the next transaction…</p>}
      {txs.map((e) => (
        <div key={e.id} className="flex items-center gap-2.5 rounded-[10px] bg-surface-2/60 px-3 py-2">
          <span className={cn("size-2 shrink-0 rounded-full", e.tx.dir === "in" ? "bg-pos" : "bg-neg")} />
          <span className="text-[13px] text-text-primary">{e.tx.city}</span>
          <span className={cn("ml-auto font-mono text-[13px] tabular-nums", e.tx.dir === "in" ? "text-pos" : "text-neg")}>
            {e.tx.dir === "in" ? "+" : "−"}
            {inr(e.tx.amount)}
          </span>
          <span className="w-12 text-right font-mono text-[10.5px] text-text-tertiary">{relTime(e.at)}</span>
        </div>
      ))}
    </div>
  );
}
