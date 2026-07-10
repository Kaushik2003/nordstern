import type { Metadata } from 'next';
import { clearSansDisplay, clearSansText } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'NordStern Admin',
  description: 'NordStern internal — anchor applications review',
};

// Admin uses the `api` client directly (no react-query), so no QueryClient provider here.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${clearSansDisplay.variable} ${clearSansText.variable}`}>
      <body>{children}</body>
    </html>
  );
}
