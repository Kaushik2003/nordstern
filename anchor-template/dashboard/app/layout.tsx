import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '../components/Nav';

export const metadata: Metadata = {
  title: 'NordStern Anchor — Console',
  description: 'Operator console for the NordStern INR ↔ USDC Stellar anchor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark" />
              <div className="brand-name">Nord<span>Stern</span></div>
            </div>
            <Nav />
            <div className="sidebar-foot">
              <span className="badge net"><span className="tick" />INR ↔ USDC anchor</span>
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
