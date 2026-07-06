'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/cp';
import { Logo } from '@/components/ui';

const NAV = [
  { href: '/anchor/anchors',      icon: '⚓', label: 'Anchors' },
  { href: '/anchor/dashboard',    icon: '📊', label: 'Dashboard' },
  { href: '/anchor/transactions', icon: '💸', label: 'Transactions' },
  { href: '/anchor/rules',        icon: '⚖️',  label: 'Business Rules' },
  { href: '/anchor/settings',     icon: '⚙️',  label: 'Settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    clearToken();
    router.push('/anchor');
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-6 py-5">
          <Logo className="text-lg" />
        </div>
        <nav className="flex-1 space-y-1.5 p-4">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink">
            <span className="text-lg">🚪</span> <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
