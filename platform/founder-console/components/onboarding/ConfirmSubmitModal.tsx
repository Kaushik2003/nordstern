'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@nordstern/shared-ui';
import { FlaskConical, X } from 'lucide-react';

interface ConfirmSubmitModalProps {
  open: boolean;
  submitting: boolean;
  summary: { label: string; value: string }[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSubmitModal({ open, submitting, summary, onCancel, onConfirm }: ConfirmSubmitModalProps) {
  const reduceMotion = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus lands on the confirm button so keyboard users don't have to
  // tab through the summary. Body scroll is locked while the dialog owns the screen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, submitting, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => !submitting && onCancel()}
            className="absolute inset-0 bg-noir/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-submit-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-xl rounded-3xl border border-line bg-canvas p-10 shadow-2xl"
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-7 top-7 rounded-full p-2 text-subtle transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="confirm-submit-title" className="pr-10 text-3xl font-normal tracking-[-0.025em] text-ink">
              Submit application?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-subtle">
              We&apos;ll review these details and email a one-time invitation link. You can&apos;t edit the
              application after this, but nothing is provisioned until you accept the invitation.
            </p>

            <dl className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface px-8 shadow-sm">
              {summary.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-8 py-5">
                  <dt className="text-sm font-medium text-subtle">{row.label}</dt>
                  <dd className="text-right text-base font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-start gap-5 rounded-2xl border border-brand/20 bg-brand-50/50 p-6 shadow-sm">
              <FlaskConical className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden />
              <p className="text-sm leading-relaxed text-brand-900">
                <span className="mb-0.5 block font-semibold">Test Mode Active</span>
                This application targets a sandbox environment on the Stellar testnet. No real fiat is moved.
              </p>
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                className="h-12 rounded-full px-8 text-base font-medium shadow-sm transition-all hover:bg-surface hover:text-ink"
              >
                Go back
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="h-12 rounded-full bg-brand px-8 text-base font-medium text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md"
              >
                {submitting ? 'Submitting…' : 'Confirm & submit'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
