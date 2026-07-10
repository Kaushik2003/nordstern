import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/cn";
import { AppProvider } from "@/lib/providers";
import { ScenarioProvider } from "@/lib/scenario";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NordStern — Anchor Console",
  description: "Treasury & operations console for Stellar anchor operators.",
};

export const viewport: Viewport = {
  themeColor: "#100f16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrains.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <AppProvider>
          <ScenarioProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ScenarioProvider>
        </AppProvider>
      </body>
    </html>
  );
}
