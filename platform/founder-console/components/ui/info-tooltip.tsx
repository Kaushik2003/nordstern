'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { cn } from '@nordstern/shared-ui';

/** Info icon that reveals a short explanation on hover/focus. Replaces bare "why we ask" text. */
export function InfoTooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-subtle transition-colors hover:text-brand-800 focus-visible:text-brand-800',
          className,
        )}
      >
        <Info className="h-4 w-4" aria-hidden />
        <span className="sr-only">More information</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink shadow-lg"
          >
            {children}
            <span className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-line bg-canvas" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
