import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ANCH — Stellar Anchor',
  description: 'SEP-24 deposit and withdrawal on Stellar Testnet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
