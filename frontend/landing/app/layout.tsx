import type { Metadata, Viewport } from "next";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { clearSansText, clearSansDisplay } from "@/lib/fonts";
import { siteConfig, socialProfiles } from "@/lib/site";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [...siteConfig.authors],
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  category: siteConfig.category,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "default",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.ogDescription,
    locale: siteConfig.locale,
    // og:image (+ width/height/type) is supplied by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.ogDescription,
    site: siteConfig.twitter.handle,
    creator: siteConfig.twitter.handle,
    // twitter:image is supplied by app/twitter-image.tsx
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.colors.canvas },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.colors.noir },
  ],
};

/** Organization JSON-LD for rich results. */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: {
    "@type": "ImageObject",
    url: `${siteConfig.url}/icon`,
    width: 512,
    height: 512,
  },
  description: siteConfig.description,
  sameAs: socialProfiles,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    areaServed: "IN",
    availableLanguage: ["English"],
  },
};

/** WebSite schema enables Google Sitelinks search box. */
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en-IN",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteConfig.url}/docs?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/** SoftwareApplication schema for the anchor platform product. */
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: siteConfig.url,
  description: siteConfig.ogDescription,
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  },
  provider: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={`${clearSansText.variable} ${clearSansDisplay.variable} h-full`}
    >
      <body className="min-h-full antialiased font-clear-display">
        <SmoothScroll />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
