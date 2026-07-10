import type { Metadata } from 'next';
import { getBrand } from '@/lib/brand';
import { clearSansText, clearSansDisplay } from '@/lib/fonts';
import './globals.css';

// Render per request so getBrand() reads the RUNTIME per-anchor env (logo, display name).
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const brand = getBrand();
  return {
    title: `${brand.displayName} · Operator Console`,
    description: `Operator console for the ${brand.displayName} anchor on NordStern.`,
    // Favicon = the anchor's own logo when set, else the NordStern mark.
    icons: { icon: brand.logoUrl || '/nordstern-dark.png' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The operator console ALWAYS uses NordStern's default palette — the per-anchor accent is
  // deliberately NOT applied here (only the anchor's logo/name brand the console). This keeps
  // the operator surface consistent as a NordStern product across every anchor.
  return (
    <html lang="en" className={`${clearSansText.variable} ${clearSansDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
