'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@nordstern/shared-ui';
import { COMING_SOON_LABEL, Option } from '@/lib/onboarding/availability';

interface OptionPillProps {
  option: Option;
  selected: boolean;
  onToggle: (value: string) => void;
}

/**
 * A multi-select pill. Options we don't serve yet still render — dimmed, tagged
 * "Soon", and inert — so founders can see where NordStern is heading.
 */
export function OptionPill({ option, selected, onToggle }: OptionPillProps) {
  const reduceMotion = useReducedMotion();

  if (!option.available) {
    return (
      <span
        aria-disabled="true"
        title={`${option.label} is not available yet.`}
        className="inline-flex h-12 shrink-0 cursor-not-allowed select-none items-center gap-2.5 rounded-pill border border-dashed border-line bg-surface px-5 text-base font-medium leading-none text-subtle opacity-60"
      >
        {option.label}
        <span className="rounded-pill bg-canvas px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
          {COMING_SOON_LABEL}
        </span>
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onToggle(option.value)}
      aria-pressed={selected}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      whileHover={reduceMotion ? undefined : { scale: 1.015 }}
      animate={{
        backgroundColor: selected ? 'var(--color-brand)' : 'var(--color-surface)',
        borderColor: selected ? 'var(--color-brand)' : 'var(--color-line)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={cn(
        'inline-flex h-12 shrink-0 items-center gap-2 rounded-pill border px-5 text-base font-medium leading-none',
        selected ? 'text-ink' : 'text-subtle hover:text-ink',
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            initial={reduceMotion ? false : { width: 0, scale: 0, opacity: 0 }}
            animate={{ width: 'auto', scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { width: 0, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="flex overflow-hidden"
          >
            <Check className="h-4 w-4 stroke-[3]" />
          </motion.span>
        )}
      </AnimatePresence>
      {option.label}
    </motion.button>
  );
}
