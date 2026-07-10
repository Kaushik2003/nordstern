'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Expo-out easing — matches the --ease-out-expo design token.
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Mount animation: fade + rise. For above-the-fold app content. Honors
 * reduced-motion by rendering static. Reusable across every migrated screen.
 */
export function FadeUp({
  children, className, delay = 0, y = 12,
}: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container — direct <StaggerItem> children fade/rise in sequence. */
export function Stagger({
  children, className, delay = 0, gap = 0.06,
}: { children: ReactNode; className?: string; delay?: number; gap?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
