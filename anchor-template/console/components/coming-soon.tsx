import { Clock } from 'lucide-react';

// A tasteful empty-state for a surface that isn't wired to a real backend yet. Use this instead
// of showing fabricated data or a blank page — honest, on-brand, and clearly temporary.
export function ComingSoon({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-line bg-surface text-subtle">
          <Clock className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[15px] font-semibold text-ink">{title ?? 'Coming soon'}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-subtle">
          {description ?? 'This is on the way. We only ship surfaces backed by real data — this one isn’t wired yet.'}
        </p>
      </div>
    </div>
  );
}
