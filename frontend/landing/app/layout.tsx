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
  logo: `${siteConfig.url}/icon`,
  description: siteConfig.description,
  sameAs: socialProfiles,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${clearSansText.variable} ${clearSansDisplay.variable} h-full`}
    >
      <body className="min-h-full antialiased font-clear-display">
        <SmoothScroll />
        {children}
        <script
          type="application/ld+json"
          // JSON-LD is trusted, static, server-rendered content.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
