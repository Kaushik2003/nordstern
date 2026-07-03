"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Mounts Lenis smooth scroll globally.
 * - lerp 0.06 → heavy, premium feel (lower = slower/heavier)
 * - duration 2.2s → long, cinematic deceleration
 * - Respects reduced-motion: Lenis is not initialised when the OS prefers it.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.05,          // interpolation factor — lower = heavier, slower feel
      smoothWheel: true,
      wheelMultiplier: 0.9, // slightly reduce wheel sensitivity
      touchMultiplier: 1.2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  return null;
}
