/**
 * All landing copy + data in one typed place. Sections stay presentational;
 * branding/wording iterations happen here.
 */

/**
 * Navigation with config-driven mega menus. Each item's `menu` renders the same
 * reusable <MegaMenu> panel: two link columns + a featured card column.
 */
export const NAV = [
  {
    label: "Platform",
    href: "#platform",
    menu: {
      columns: [
        {
          label: "Products",
          items: [
            { icon: "bank", title: "Virtual accounts", desc: "Dedicated INR account numbers & IFSC.", href: "#platform" },
            { icon: "bolt", title: "On/Off Ramp", desc: "Same-day settlement across Indian rails.", href: "#platform" },
            { icon: "shield", title: "Compliance", desc: "FIU-IND reporting & monitoring built in.", href: "#platform" },
          ],
        },
        {
          label: "Capabilities",
          items: [
            { icon: "users", title: "KYC & onboarding", desc: "Liveness, face-match, deepfake checks.", href: "#platform" },
            { icon: "chart", title: "Treasury", desc: "Reserves, pricing and settlement.", href: "#platform" },
            { icon: "layers", title: "Unified ledger", desc: "Fiat + Stellar bookkeeping in one.", href: "#platform" },
          ],
        },
      ],
      featured: {
        label: "Featured",
        cards: [
          { icon: "box", title: "Sandbox", href: "#" },
          { icon: "activity", title: "Status", href: "#" },
        ],
      },
    },
  },
  {
    label: "Anchors",
    href: "#audiences",
    menu: {
      columns: [
        {
          label: "Use cases",
          items: [
            { icon: "bank", title: "Fintechs & PSPs", desc: "Become the money hub for your users.", href: "#audiences" },
            { icon: "bolt", title: "Wallets", desc: "Instant on/off-ramps and balances.", href: "#audiences" },
            { icon: "users", title: "Exchanges", desc: "A compliant fiat gateway with cards.", href: "#audiences" },
          ],
        },
        {
          label: "Outcomes",
          items: [
            { icon: "rocket", title: "Faster launch", desc: "Go live in weeks, not quarters.", href: "#outcomes" },
            { icon: "chart", title: "New revenue", desc: "Monetise every ramp and flow.", href: "#outcomes" },
            { icon: "shield", title: "Stay compliant", desc: "Audit-ready from day one.", href: "#outcomes" },
          ],
        },
      ],
      featured: {
        label: "Featured",
        cards: [
          { icon: "book", title: "Case studies", href: "#" },
          { icon: "box", title: "Sandbox", href: "#" },
        ],
      },
    },
  },
  {
    label: "Developers",
    href: "#build",
    menu: {
      columns: [
        {
          label: "Documentation",
          items: [
            { icon: "code", title: "API Reference", desc: "Explore our APIs to start building.", href: "#build" },
            { icon: "layers", title: "SDKs", desc: "Client libraries for every stack.", href: "#build" },
            { icon: "rocket", title: "Ready-to-Launch", desc: "Embed with a single line of code.", href: "#build" },
          ],
        },
        {
          label: "Popular guides",
          items: [
            { icon: "book", title: "SEP-24 & SEP-10", desc: "Interactive deposits and auth.", href: "#build" },
            { icon: "book", title: "On/Off ramp", desc: "Understand ramp flows end to end.", href: "#build" },
            { icon: "book", title: "Compliance", desc: "FIU-IND, sanctions and monitoring.", href: "#build" },
          ],
        },
      ],
      featured: {
        label: "Featured",
        cards: [
          { icon: "box", title: "Sandbox", href: "#" },
          { icon: "activity", title: "Status", href: "#" },
        ],
      },
    },
  },
  {
    label: "Resources",
    href: "#resources",
    menu: {
      columns: [
        {
          label: "Learn",
          items: [
            { icon: "book", title: "Blog", desc: "Product news and deep dives.", href: "#resources" },
            { icon: "book", title: "Guides", desc: "How-tos for anchor operators.", href: "#resources" },
            { icon: "layers", title: "Changelog", desc: "What shipped, every week.", href: "#resources" },
          ],
        },
        {
          label: "Company",
          items: [
            { icon: "users", title: "About", desc: "Our mission and team.", href: "#" },
            { icon: "rocket", title: "Careers", desc: "Build the future of money.", href: "#" },
            { icon: "shield", title: "Security", desc: "How we keep funds safe.", href: "#" },
          ],
        },
      ],
      featured: {
        label: "Featured",
        cards: [
          { icon: "book", title: "FAQ", href: "#" },
          { icon: "activity", title: "Status", href: "#" },
        ],
      },
    },
  },
] as const;

export type NavItem = (typeof NAV)[number];
export type NavMenu = NavItem["menu"];

export const HERO = {
  eyebrow: { label: "Read: why SEP-24 shifts the burden to the anchor", href: "#" },
  title: "Become a Stellar anchor without building the stack.",
  lead: "Nordstern runs the SEP servers, KYC, payment rails, treasury, and operator console behind a Stellar on/off-ramp. Bring your license, bank, and liquidity — launch on testnet, then go live when you're ready.",
  primary: { label: "Talk to us", href: "#cta" },
  secondary: { label: "Explore the platform", href: "#platform" },
} as const;

/**
 * Mission statement — one large editorial paragraph. `lead` reads in ink, `tail`
 * fades to gray (reference two-tone). `lead` keeps its trailing space so the two
 * clauses join naturally.
 */
export const MISSION = {
  title: "We build the compliant anchor infrastructure that connects local banking rails to the global Stellar network.",
  lead: "Every anchor needs the same stack — SEP servers, KYC, payment rails, treasury, and compliance workflows, wired together and kept running. ",
  tail: "NordStern operates it as managed infrastructure, so a licensed business can launch a fiat on/off-ramp on its local rails without building it from scratch.",
} as const;

/** Social-proof logos. `logo` renders an image; otherwise the name is set in type. */
export const BACKERS: ReadonlyArray<{
  name: string;
  logo?: { src: string; width: number; height: number };
}> = [
  { name: "Stellar", logo: { src: "/stellar-logo.png", width: 1417, height: 409 } },
  { name: "Helix Capital" },
  { name: "Northwind" },
  { name: "NGC" },
  { name: "NovaSeed" },
];

/**
 * Outcomes section — a static thesis (left), an auto-rotating pitch (right-top),
 * and two editorial images (right-bottom). Fully data-driven: add/remove an
 * `item` or set an image `src` to change the section, no JSX edits.
 */
export const OUTCOMES = {
  heading: "One platform to launch your anchor.",
  kicker: "Why NordStern",
  lead: "Run on/off-ramp flows on managed infrastructure — SEP servers, KYC, payment-rail adapters, treasury, and compliance workflows — without building or operating the stack yourself.",
  // Business outcomes (the *why*), deliberately distinct from the Primitives
  // section below it (the *what*), so the two don't read as the same list.
  items: [
    {
      label: "Speed to market",
      title: "Go live in weeks, not quarters.",
      description:
        "Skip the multi-quarter build. NordStern ships the rails, KYC, and compliance so your anchor launches fast.",
      cta: { label: "See how it works", href: "#build" },
    },
    {
      label: "Lower risk",
      title: "Stay audit-ready by default.",
      description:
        "FIU-IND reporting, sanctions screening, and a hash-chained audit log keep every flow defensible — automatically.",
      cta: { label: "Explore compliance", href: "#platform" },
    },
    {
      label: "New revenue",
      title: "Turn every ramp into revenue.",
      description:
        "Monetise on/off-ramp spread, treasury, and settlement with pricing controls built for margin.",
      cta: { label: "See the platform", href: "#platform" },
    },
    {
      label: "Scale with confidence",
      title: "From your first ramp to millions.",
      description:
        "The same infrastructure that launches your anchor scales to millions of verified users — no re-platforming.",
      cta: { label: "Why teams trust us", href: "#trust" },
    },
  ],
  /** Two editorial images. Leave `src` null for a branded placeholder; drop in a
   *  path later to swap with zero layout change. */
  gallery: [
    {
      src: null as string | null,
      alt: "NordStern anchor operators at work",
      ratio: "5 / 4",
      tone: "from-brand-100 via-brand-200 to-brand-300",
    },
    {
      src: null as string | null,
      alt: "Global settlement network",
      ratio: "4 / 5",
      tone: "from-[color:var(--color-aurora-cyan)] via-brand-100 to-brand-200",
    },
  ],
} as const;

export const PRIMITIVES = {
  eyebrow: "The platform",
  title: "One platform, every anchor primitive",
  lead: "Compose simple building blocks into any money flow your users need.",
  items: [
    {
      title: "Virtual accounts",
      body: "Every user gets a dedicated Indian account number & IFSC. Money routes in over UPI, IMPS, NEFT and RTGS — and mints on Stellar automatically.",
      href: "#",
      icon: "bank",
    },
    {
      title: "Money movement",
      body: "On/off-ramp with same-day settlement. Send, receive, and reconcile across fiat and Stellar with a single API.",
      href: "#",
      icon: "bolt",
      featured: true,
    },
    {
      title: "KYC & onboarding",
      body: "Passive liveness, deepfake detection and face-match tuned for Tier 2/3 India. We verify your users on your behalf.",
      href: "#",
      icon: "users",
    },
    {
      title: "Compliance & reporting",
      body: "FIU-IND reporting, sanctions screening, monitoring rules and a hash-chained audit log — built in.",
      href: "#",
      icon: "shield",
    },
  ],
} as const;

export const BUILD_PATHS = {
  eyebrow: "Flexible by design",
  title: "Managed solutions or full control",
  lead: "Both paths run on the same underlying infrastructure.",
  paths: [
    {
      title: "Custom",
      body: "Design your own money experience with direct control over SEP-24/SEP-10 servers, treasury and pricing.",
      chips: ["Full API", "Launch in 6 weeks"],
      href: "#",
      variant: "code" as const,
    },
    {
      title: "Ready-to-Launch",
      body: "A fully managed, white-labelled anchor embedded with a single line of code.",
      chips: ["No code", "Launch in 3 weeks"],
      href: "#",
      variant: "dashboard" as const,
    },
  ],
} as const;

export const AUDIENCES = {
  eyebrow: "Who it's for",
  title: "Purpose-built for fintechs, wallets, and exchanges",
  items: [
    {
      title: "Fintechs & PSPs",
      body: "Embed ramps, banking and payouts to become the money hub for your customers.",
      icon: "bank",
    },
    {
      title: "Wallets",
      body: "Offer instant on/off-ramps and balances to grow engagement and revenue.",
      icon: "bolt",
    },
    {
      title: "Exchanges",
      body: "Give users a compliant fiat gateway with cards and money movement built in.",
      icon: "users",
    },
  ],
} as const;

export const TRUST = {
  title: "Infrastructure you can trust",
  lead: "Built on Stellar — one of the most audited payment rails available. NordStern handles the stack so anchor teams can focus on their business.",
  stats: [
    { value: "2M+", label: "addressable users in Indian fintech" },
    { value: "₹100B+", label: "annual INR ramp market opportunity" },
    { value: "99.9%+", label: "Stellar network uptime (historical)" },
  ],
  // Achievable outcomes for anchors using the platform — not claimed existing results.
  results: [
    { brand: "Anchor teams", value: "6×", caption: "faster to first transaction vs. building in-house" },
    { brand: "Anchor capacity", value: "₹1B+", caption: "monthly ramp volume achievable per anchor" },
    { brand: "Ops savings", value: "50%", caption: "less ops overhead vs. running your own stack" },
  ],
} as const;

export const RESOURCES = {
  eyebrow: "Resources",
  title: "Guides for anchor operators",
  posts: [
    { tag: "Blog", read: "3 min", title: "What to look for in a SEP-24 provider" },
    { tag: "Blog", read: "5 min", title: "Adoption tooling for embedded finance programs" },
  ],
  featured: [
    { title: "Enterprise-grade financial infrastructure", href: "#" },
    { title: "Beyond the API: running a compliant anchor", href: "#" },
  ],
  cta: { label: "See all resources", href: "#" },
} as const;

export const FINAL_CTA = {
  title: "Launch money solutions for your users. Unlock new revenue for your anchor.",
  cta: { label: "Talk to us", href: "#" },
} as const;

export const FOOTER = {
  cta: {
    title: "Launch your Anchor today",
    body: "Build compliant Stellar anchors with integrated fiat rails, KYC, and on/off ramps.",
    button: { label: "Talk to us", href: "#cta" },
  },
  status: "Live on Stellar",
  columns: {
    Platform: ["Anchors", "On/Off Ramp", "Treasury", "Compliance"],
    Developers: ["Documentation", "API Reference", "SDK", "Status"],
    Resources: ["Blog", "Guides", "Changelog", "FAQ"],
    Company: ["About", "Contact", "Careers", "Privacy"],
    Social: ["X", "LinkedIn", "GitHub", "Discord"],
  },
  legal: [
    "NordStern is a technology company and not a bank. Banking services are provided by our regulated partners.",
  ],
} as const;
