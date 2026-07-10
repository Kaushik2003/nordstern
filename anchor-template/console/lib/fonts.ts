import localFont from 'next/font/local';

// Same typefaces as the marketing site (frontend/landing): ClearSans Text for UI/body,
// ClearSans Display for headings — so the operator console reads as one NordStern product.
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
