import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';

// Clear Sans — the brand face carried over from the NordStern design system. Bound to
// --ff-clear-* here and mapped onto the --font-sans token in globals.css, so the whole app
// (every anchor) renders in one consistent, premium typeface. Self-hosted (woff2 in /public)
// so there's no third-party font request at runtime.
export const clearSansText = localFont({
  src: [{ path: '../public/ClearSansTextRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-text',
  display: 'swap',
});

export const clearSansDisplay = localFont({
  src: [{ path: '../public/ClearSansDisplayRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-display',
  display: 'swap',
});

// Monospace for reference codes / chain IDs (unchanged from before).
export const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' });
