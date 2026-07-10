import { cn } from '@/lib/cn';

// Loading placeholder — used instead of "…" so a warming-up anchor reads as a real
// fintech loading state, not a broken one.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}
