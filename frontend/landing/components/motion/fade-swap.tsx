"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "./ease";

/**
 * Crossfades between mounted children when `activeKey` changes: fade + slight
 * vertical travel, exit-then-enter. Reusable for any rotating/swapping content.
 * Honors reduced-motion (opacity-only).
 */
export function FadeSwap({
  activeKey,
  children,
  className,
  y = 12,
  duration = 0.4,
}: {
  activeKey: string | number;
  children: ReactNode;
  className?: string;
  y?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        className={className}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -y }}
        transition={{ duration, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
