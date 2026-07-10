'use client';

import { useBrand } from '@/components/brand-context';

// The anchor's logo, or a monogram on the accent when no logo is set. Never blank,
// never NordStern — always the customer's own brand.
export function BrandMark({ size = 40 }: { size?: number }) {
  const { name, logoUrl } = useBrand();
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} width={size} height={size} className="rounded-xl object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <div className="grid place-items-center rounded-xl bg-brand font-bold text-[var(--color-brand-ink)]"
      style={{ width: size, height: size, fontSize: size * 0.44 }}>
      {(name || 'A').charAt(0).toUpperCase()}
    </div>
  );
}
