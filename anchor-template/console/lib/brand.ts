// Per-anchor branding. One console image serves every anchor, so brand can't be
// baked at build time (no NEXT_PUBLIC_*). Instead the provisioner injects plain env
// (ANCHOR_NAME/SLUG, ASSET_CODE) which we read at request time in server components.
export interface Brand {
  name: string;
  slug: string;
  assetCode: string;
}

export function getBrand(): Brand {
  return {
    name: process.env.ANCHOR_NAME ?? 'NordStern Anchor',
    slug: process.env.ANCHOR_SLUG ?? 'anchor',
    assetCode: process.env.ASSET_CODE ?? 'USDC',
  };
}
