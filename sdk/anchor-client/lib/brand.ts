// Per-anchor white-label brand, read server-side from the env the provisioner injects.
// NEVER hardcode NordStern branding in customer screens — everything flows from here so
// mizupay.nordstern.live and acme.nordstern.live look like their own apps.
export interface Brand {
  name: string;          // business/display name
  slug: string;
  assetCode: string;     // the money unit (shown as a balance, never as "asset")
  accent: string | null; // CSS colour override for --color-brand
  logoUrl: string | null;
  supportEmail: string | null;
  websiteUrl: string | null;
}

export function getBrand(): Brand {
  const e = process.env;
  return {
    name: e.ANCHOR_DISPLAY_NAME || e.ANCHOR_NAME || 'Your Anchor',
    slug: e.ANCHOR_SLUG || 'anchor',
    assetCode: e.ASSET_CODE || 'USD',
    accent: e.ANCHOR_ACCENT || null,
    logoUrl: e.ANCHOR_LOGO_URL || null,
    supportEmail: e.ANCHOR_SUPPORT_EMAIL || null,
    websiteUrl: e.ANCHOR_WEBSITE_URL || null,
  };
}
