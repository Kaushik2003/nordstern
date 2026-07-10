'use client';

import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@nordstern/shared-ui';
import Image from 'next/image';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Founder Profile', subtitle: 'Who you are' },
  { id: 2, title: 'Business Profile', subtitle: 'Institution details' },
  { id: 3, title: 'Product & Rails', subtitle: 'Currency, limits & fees' },
  { id: 4, title: 'Review & Submit', subtitle: 'Confirm & apply' },
];

interface SidebarStepsProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
  furthestStep: number;
}

export function SidebarSteps({ currentStep, onStepClick, furthestStep }: SidebarStepsProps) {
  const reduceMotion = useReducedMotion();
  // The vertical twin of StepProgress: same `currentStep`, filled top-down.
  const fill = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-[360px] shrink-0 p-8 lg:p-12 bg-[#eef0fc] border-r border-line hidden lg:flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="mb-16 flex items-center gap-4">
        <Image src="/full-banner-logo.jpg" alt="NordStern Logo" width={320} height={180} className="w-56 h-auto shrink-0" />
      </div>

      <div className="space-y-12 relative ml-2">
        {/* Connecting line, with a brand fill that tracks the current step. */}
        <div className="absolute left-[11px] top-4 bottom-8 w-px bg-line -z-10">
          <motion.div
            initial={false}
            animate={{ height: `${fill}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            className="w-px bg-brand origin-top"
          />
        </div>

        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= furthestStep;

          return (
            <div
              key={step.id}
              className={cn("flex gap-5 relative group", isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50')}
              onClick={() => {
                if (isClickable) onStepClick(step.id);
              }}
            >
              <motion.div
                animate={reduceMotion ? undefined : { scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5",
                  isActive || isCompleted
                    ? "bg-brand text-ink ring-4 ring-surface"
                    : "bg-canvas border-2 border-line text-subtle ring-4 ring-surface group-hover:border-brand/50"
                )}
              >
                {isCompleted ? (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </motion.span>
                ) : (
                  <span className="text-xs font-bold">{step.id}</span>
                )}
              </motion.div>
              <div className="flex flex-col">
                <span className={cn("text-base font-semibold transition-colors", isActive ? "text-brand-800" : "text-ink")}>
                  {step.id}. {step.title}
                </span>
                <span className="text-sm text-subtle mt-1 font-medium">{step.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-10">
        <p className="text-sm leading-relaxed text-subtle">
          Takes about two minutes. You can come back to any completed step before you submit.
        </p>
      </div>
    </div>
  );
}
