import localFont from 'next/font/local';

/** Clear Sans Display — the brand face, used across the console (matches frontend/landing). */
export const clearSansDisplay = localFont({
  src: [{ path: '../public/ClearSansDisplayRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-display',
  display: 'swap',
});

/** Clear Sans Text — the text cut, available via `font-clear-text`. */
export const clearSansText = localFont({
  src: [{ path: '../public/ClearSansTextRegular.woff2', weight: '400', style: 'normal' }],
  variable: '--ff-clear-text',
  display: 'swap',
});
