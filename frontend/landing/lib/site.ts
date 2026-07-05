/**
 * Single source of truth for site-wide identity, SEO, and social metadata.
 * Everything under app/ (layout metadata, manifest, robots, sitemap, OG/icon
 * routes, JSON-LD) reads from here — change branding in one place.
 *
 * NOTE: `url` is a placeholder production origin until the real domain is live.
 */
export const siteConfig = {
  name: "NordStern",
  shortName: "NordStern",
  // Placeholder production URL — swap when the domain is finalized.
  url: "https://nordstern.finance",
  title: "NordStern — Anchor Infrastructure for India",
  titleTemplate: "%s · NordStern",
  description:
    "NordStern lets fintechs, wallets, and exchanges launch a compliant Stellar anchor in India — with INR on/off-ramps, SEP-24, automated KYC, UPI integration, and treasury tooling built in. No banking stack required.",
  tagline: "Anchor Infrastructure for India",
  ogDescription:
    "Launch a compliant INR ↔ Stellar anchor without building the stack yourself. SEP-24, KYC, UPI, and treasury — fully managed.",
  locale: "en_IN",
  category: "finance",
  keywords: [
    // Core product
    "Stellar anchor",
    "anchor infrastructure",
    "anchor as a service",
    "Stellar network India",
    // On/off-ramp
    "INR on-ramp",
    "INR off-ramp",
    "fiat on-ramp India",
    "fiat off-ramp India",
    "crypto INR gateway",
    // SEP protocols
    "SEP-24",
    "SEP-12",
    "SEP-10",
    "SEP-1",
    // Payment rails
    "UPI payments",
    "IMPS",
    "NEFT",
    "RTGS",
    "Cashfree payouts",
    "RazorpayX",
    // Compliance & KYC
    "KYC India",
    "AML compliance",
    "FIU-IND",
    "HyperVerge KYC",
    // Audience
    "embedded finance India",
    "fintech infrastructure",
    "stablecoin India",
    "crypto compliance India",
    "B2B fintech API",
  ],
  authors: [{ name: "NordStern", url: "https://nordstern.finance" }],
  creator: "NordStern",
  publisher: "NordStern",
  // Brand tokens mirrored from globals.css @theme (kept in sync for OG/icons,
  // which render outside the Tailwind runtime).
  colors: {
    brand: "#AB9FF2",
    brandRing: "#2A2342",
    canvas: "#FFFFFF",
    ink: "#0B0B0B",
    muted: "#5B5B5B",
    surface: "#F2F4F3",
    noir: "#0A0A0A",
    up: "#2EC08B",
  },
  twitter: {
    handle: "@NordsternIN",
    url: "https://x.com/NordsternIN",
  },
  links: {
    twitter: "https://x.com/NordsternIN",
    linkedin: "https://www.linkedin.com/company/nordstern",
    github: "https://github.com/nordstern",
    discord: "https://discord.gg/nordstern",
  },
} as const;

/** Social profiles for JSON-LD `sameAs` / footer, filtered to real ones. */
export const socialProfiles = Object.values(siteConfig.links);
