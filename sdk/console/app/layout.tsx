import type { Metadata } from 'next';
import { getBrand, readableOn } from '@/lib/brand';
import './globals.css';

// Render per request so getBrand() reads the RUNTIME per-anchor env (accent, logo,
// display name) rather than baking build-time defaults.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const brand = getBrand();
  return {
    title: `${brand.displayName} · Operator Console`,
    description: `Operator console for the ${brand.displayName} anchor on NordStern.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = getBrand();
  // Override the accent so the console re-tints to the operator's own brand.
  const accentVars = {
    ['--color-brand' as string]: brand.accent,
    ['--color-brand-ink' as string]: readableOn(brand.accent),
  } as React.CSSProperties;
  return (
    <html lang="en" style={accentVars}>
      <body>{children}</body>
    </html>
  );
}
