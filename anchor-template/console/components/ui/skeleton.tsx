import { cn } from '@/lib/cn';

// Loading placeholder — a soft shimmer sweep (see .skeleton in globals.css) so a warming-up
// anchor reads as a real fintech loading state, not a broken one.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

// ── Composed skeletons the pages reuse ──────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <Skeleton className="h-8 w-28 rounded-full" />
    </div>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[20px] border border-black/[0.05] bg-white p-5 shadow-[0_1px_2px_rgba(24,22,54,0.04)]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('rounded-[20px] border border-black/[0.05] bg-white p-5 shadow-[0_1px_2px_rgba(24,22,54,0.04)]', className)}>
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(24,22,54,0.04)]">
      <div className="border-b border-line/60 px-5 py-3.5"><Skeleton className="h-4 w-40" /></div>
      <div className="divide-y divide-line/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-1/4' : c === cols - 1 ? 'ml-auto w-16' : 'w-1/6')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
