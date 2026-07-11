import type { Metadata, Viewport } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { clearSansText, clearSansDisplay } from '@/lib/fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.nordstern.live'),
  title: {
    default: 'NordStern Docs — Launch a compliant Stellar anchor in India',
    template: '%s · NordStern Docs',
  },
  description:
    'Everything you need to launch and operate a compliant Stellar anchor in India — INR on/off-ramps, KYC, payment rails, and an operator console, fully managed by NordStern.',
  applicationName: 'NordStern Docs',
  openGraph: {
    type: 'website',
    siteName: 'NordStern Docs',
    title: 'NordStern Docs',
    description:
      'Launch and operate a compliant Stellar anchor in India — the complete NordStern guide.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NordStern Docs',
    description: 'Launch and operate a compliant Stellar anchor in India.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaff' },
    { media: '(prefers-color-scheme: dark)', color: '#121016' },
  ],
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${clearSansText.variable} ${clearSansDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen font-sans antialiased">
        {/* Light is the default theme; the toggle still allows dark. */}
        <RootProvider theme={{ defaultTheme: 'light', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
