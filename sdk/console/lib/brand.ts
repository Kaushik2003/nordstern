// Per-anchor branding. One console image serves every anchor, so brand can't be
// baked at build time (no NEXT_PUBLIC_*). The provisioner injects plain env at runtime
// (same vars as the customer app — one branding pipeline), read in server components.
export interface Brand {
  name: string;
  displayName: string;
  slug: string;
  assetCode: string;
  accent: string;          // primary accent hex — overrides --color-brand
  logoUrl: string | null;
}

const HEX = /^#([0-9a-fA-F]{6})$/;

// Readable text color (black/white) for content ON the accent — keeps the monogram and
// accent buttons legible whatever brand color the operator chose.
export function readableOn(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#ffffff';
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0b0b0b' : '#ffffff';
}

export function getBrand(): Brand {
  const accent = process.env.ANCHOR_ACCENT ?? '';
  const name = process.env.ANCHOR_NAME ?? 'NordStern Anchor';
  return {
    name,
    displayName: process.env.ANCHOR_DISPLAY_NAME?.trim() || name,
    slug: process.env.ANCHOR_SLUG ?? 'anchor',
    assetCode: process.env.ASSET_CODE ?? 'USDC',
    accent: HEX.test(accent) ? accent : '#ab9ff2',
    logoUrl: process.env.ANCHOR_LOGO_URL?.trim() || null,
  };
}
