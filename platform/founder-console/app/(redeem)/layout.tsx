import { ReactNode } from 'react';

// Full-bleed shell for the redeem typeform — deliberately NOT the (auth) centered card
// layout. The page owns the whole viewport (one question per screen).
export default function RedeemLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen w-full bg-canvas text-ink font-sans">{children}</div>;
}
