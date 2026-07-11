import localFont from 'next/font/local';

/**
 * NordStern brand typeface — Clear Sans (same family the landing + product use).
 * Bound to CSS variables so global.css can map them onto Fumadocs' font tokens.
 */
export const clearSansText = localFont({
  src: [{ path: '../public/fonts/ClearSansTextRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-text',
  display: 'swap',
});

export const clearSansDisplay = localFont({
  src: [{ path: '../public/fonts/ClearSansDisplayRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-display',
  display: 'swap',
});
