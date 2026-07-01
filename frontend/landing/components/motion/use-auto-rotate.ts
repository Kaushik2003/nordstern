"use client";

import { useEffect, useState } from "react";

/**
 * Cycles an index 0..length-1 on an interval. Pauses while `paused` is true and
 * resumes from the current index. Reusable for any auto-advancing UI (rotators,
 * carousels). Keeps `index` out of the effect deps so ticks don't reset cadence.
 */
export function useAutoRotate(
  length: number,
  { intervalMs = 3800, paused = false }: { intervalMs?: number; paused?: boolean } = {},
) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || length <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [paused, length, intervalMs]);

  return { index, setIndex };
}
