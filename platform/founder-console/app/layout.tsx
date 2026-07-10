import type { Metadata } from 'next';
import { clearSansDisplay, clearSansText } from '@/lib/fonts';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'NordStern',
  description: 'Anchor infrastructure — control plane',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${clearSansDisplay.variable} ${clearSansText.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
