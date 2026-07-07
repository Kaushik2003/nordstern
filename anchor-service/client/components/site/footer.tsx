'use client';

import { useBrand } from '@/components/brand-context';

export function Footer() {
  const brand = useBrand();
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-subtle sm:flex-row sm:px-8">
        <p>© {new Date().getFullYear()} {brand.name}</p>
        <p className="flex items-center gap-1.5">
          Infrastructure by
          <span className="font-semibold text-ink">Nord</span><span className="-ml-1.5 font-semibold text-brand-700">Stern</span>
        </p>
      </div>
    </footer>
  );
}
