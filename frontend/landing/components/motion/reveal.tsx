"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, DURATION } from "./ease";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Vertical travel in px (default 24). */
  y?: number;
  /** Horizontal travel in px (default 0). */
  x?: number;
  delay?: number;
  duration?: number;
  /** Viewport trigger threshold (0–1). */
  amount?: number;
  once?: boolean;
  /** Intersection observer margin (e.g. "0px 0px -100px 0px"). */
  margin?: string;
};

/**
 * Single scroll-reveal primitive: fade + directional travel, fired once when
 * the element enters the viewport. Respects reduced-motion (renders static).
 * Use instead of hand-rolling initial/whileInView in every section.
 */
export function Reveal({
  children,
  className,
  y = 40,
  x = 0,
  delay = 0,
  duration = DURATION.slow,
  amount = 0.08,
  once = true,
  margin = "0px 0px -80px 0px",
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, amount, margin }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
