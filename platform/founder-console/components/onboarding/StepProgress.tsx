'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@nordstern/shared-ui';

// The spring-animated dot rail from components/ui/progress-indicator.tsx, recolored
// to the NordStern brand and made presentational: the wizard owns `currentStep`, so
// the sidebar rail and this header rail animate off the same value.
//
// The pill widths are hand-calibrated to `h-2 w-2` dots at `gap-6` (24px). The wizard
// always has exactly three steps, so they stay constants rather than being derived.
const TOTAL_STEPS = 3;
const PILL_WIDTH: Record<number, string> = { 1: '24px', 2: '60px', 3: '96px' };

const SPRING = { type: 'spring', stiffness: 300, damping: 20, mass: 0.8 } as const;

export function StepProgress({ currentStep, className }: { currentStep: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <div
      className={cn('flex items-center gap-3', className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={currentStep}
      aria-valuetext={`Step ${currentStep} of ${TOTAL_STEPS}`}
    >
      <div className="relative flex items-center gap-6">
        {steps.map((step) => (
          <div
            key={step}
            className={cn(
              'relative z-10 h-2.5 w-2.5 rounded-full transition-colors duration-300',
              step <= currentStep ? 'bg-canvas' : 'bg-line',
            )}
          />
        ))}

        {/* Brand pill sweeping across the dots it has already passed. */}
        <motion.div
          initial={false}
          animate={{ width: PILL_WIDTH[currentStep] ?? PILL_WIDTH[1] }}
          transition={reduceMotion ? { duration: 0 } : SPRING}
          className="absolute -left-2 top-1/2 h-3.5 -translate-y-1/2 rounded-pill bg-brand"
        />
      </div>

      <span className="text-base font-medium text-subtle tabular-nums">
        Step {currentStep} of {TOTAL_STEPS}
      </span>
    </div>
  );
}
