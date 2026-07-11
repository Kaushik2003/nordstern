// Per-anchor white-label brand, read server-side from the env the provisioner injects.
// NEVER hardcode NordStern branding in customer screens — everything flows from here so
// mizupay.nordstern.live and acme.nordstern.live look like their own apps.
export interface Brand {
  name: string;          // business/display name
  slug: string;
  assetCode: string;     // the money unit (shown as a balance, never as "asset")
  fiatCurrency: string;  // the fiat leg the anchor settles in (e.g. INR, EUR, BRL) — copy reads this, never a literal
  accent: string | null; // CSS colour override for --color-brand
  logoUrl: string | null;
  supportEmail: string | null;
  websiteUrl: string | null;
  // The Stellar network the anchor runs on, derived at REQUEST time from NETWORK_PASSPHRASE
  // (which the provisioner injects per-anchor). This must be runtime, not build-time
  // (NEXT_PUBLIC_*), because a single shared image serves both testnet and mainnet anchors.
  network: 'mainnet' | 'testnet';
  // The exact network passphrase — the wallet kit signs SEP-10/settlement txs with THIS, so it
  // must match the anchor's real network or the wallet (e.g. Freighter) rejects the signature.
  networkPassphrase: string;
}

export function getBrand(): Brand {
  const e = process.env;
  const passphrase = e.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
  // "Public Global Stellar Network ; September 2015" = mainnet; anything else = testnet.
  const network: 'mainnet' | 'testnet' = passphrase.includes('Public Global') ? 'mainnet' : 'testnet';
  return {
    name: e.ANCHOR_DISPLAY_NAME || e.ANCHOR_NAME || 'Your Anchor',
    slug: e.ANCHOR_SLUG || 'anchor',
    assetCode: e.ASSET_CODE || 'USD',
    // Fiat leg is config-driven so marketing copy ("Turn INR into USDC") is generated, not
    // hardcoded. Defaults to INR to match the current backend rails (Razorpay/Cashfree/SEP
    // register iso4217:INR); an anchor on other rails overrides ANCHOR_FIAT_CURRENCY.
    fiatCurrency: e.ANCHOR_FIAT_CURRENCY || e.FIAT_CURRENCY || 'INR',
    accent: e.ANCHOR_ACCENT || null,
    logoUrl: e.ANCHOR_LOGO_URL || null,
    supportEmail: e.ANCHOR_SUPPORT_EMAIL || null,
    websiteUrl: e.ANCHOR_WEBSITE_URL || null,
    network,
    networkPassphrase: passphrase,
  };
}
