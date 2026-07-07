import type { Metadata } from 'next';
import { getBrand } from '@/lib/brand';
import './globals.css';

export function generateMetadata(): Metadata {
  const brand = getBrand();
  return {
    title: `${brand.name} · Operator Console`,
    description: `Operator console for the ${brand.name} anchor on NordStern.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
