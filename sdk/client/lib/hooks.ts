"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { engine } from "./data/events";
import type { TapeEvent } from "./data/types";

/** Count a number from its previous value to `target` with ease-out cubic. */
export function useCountUp(
  target: number,
  opts: { duration?: number; delay?: number; enabled?: boolean } = {},
): number {
  const { duration = 650, delay = 0, enabled = true } = opts;
  const reduce = useReducedMotion();
  const [val, setVal] = useState(() => (enabled && !reduce ? 0 : target));
  const fromRef = useRef(enabled && !reduce ? 0 : target);

  useEffect(() => {
    if (reduce || !enabled) {
      setVal(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    let raf = 0;
    let startAt = 0;
    const step = (t: number) => {
      if (!startAt) startAt = t + delay;
      const e = Math.min(1, Math.max(0, (t - startAt) / duration));
      const eased = 1 - Math.pow(1 - e, 3);
      setVal(from + (target - from) * eased);
      if (e < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, enabled, reduce]);

  return val;
}

/** Simulate a 300–700ms route-enter fetch so skeletons feel real (PRD §2.2). */
export function useSkeleton(ms?: number): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const d = ms ?? 320 + Math.random() * 380;
    const t = setTimeout(() => setReady(true), d);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}

/** Subscribe to the live event engine; returns newest-first events. */
export function useEventStream(): TapeEvent[] {
  const [events, setEvents] = useState<TapeEvent[]>(() => engine.recent);
  useEffect(() => {
    engine.start();
    setEvents(engine.recent);
    return engine.subscribe((e) => setEvents((prev) => [e, ...prev].slice(0, 80)));
  }, []);
  return events;
}

/** A clock that re-renders on an interval — keeps relative times fresh. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export function useCopy(timeout = 1400) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? null : c)), timeout);
    });
  };
  return { copied, copy };
}

/** True only after first client mount — guards SSR/client mismatches. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
