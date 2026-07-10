import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { getBrand } from '@/lib/brand';
import { BrandProvider } from '@/components/brand-context';
import { CustomerProvider } from '@/components/customer-context';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });

// White-label: getBrand() reads per-anchor env at REQUEST time, so every page must render
// dynamically. Without this, standalone builds prerender with build-time defaults and every
// anchor looks the same. One image, N branded anchors — only when dynamic.
export const dynamic = 'force-dynamic';

// Per-anchor title/description — white-label, no NordStern branding leaked to customers.
export function generateMetadata(): Metadata {
  const brand = getBrand();
  return {
    title: `${brand.name} — Buy & sell, instantly`,
    description: `Add money and cash out in seconds with ${brand.name}.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = getBrand();
  // Apply the anchor's accent colour to the brand token so the whole app re-skins.
  const style = brand.accent ? ({ ['--color-brand' as string]: brand.accent }) : undefined;
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} style={style as React.CSSProperties}>
      <body className="min-h-screen antialiased">
        <BrandProvider brand={brand}>
          <CustomerProvider>{children}</CustomerProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
