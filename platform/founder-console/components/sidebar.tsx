'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@nordstern/shared-ui';
import { LayoutDashboard, Users, Settings, CreditCard, Anchor } from 'lucide-react';
import { useMe } from '@/lib/session';

const navigation = [
  // Founder = org-level concerns only. Per-anchor treasury/transactions/customers live on
  // each anchor's OPERATOR console (opened from the portfolio), NOT here.
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Wallet Sandbox', href: '/wallet', icon: CreditCard },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useMe();
  
  // Get active org or fallback
  const activeOrg = data?.organizations?.[0]?.name || 'NordStern Platform';

  return (
    <div className="flex h-screen w-80 flex-col border-r bg-card px-6 py-8 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-12">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Anchor className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold tracking-tight">{activeOrg}</span>
          <span className="text-sm text-muted-foreground">Founder Console</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3.5 py-2.5 text-base font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-5 w-5 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-6">
        <div className="rounded-xl border bg-muted/40 p-5">
          <p className="mb-2.5 text-base font-medium">Stellar Testnet</p>
          <p className="text-sm text-muted-foreground">Network is running optimally. 0 pending tasks.</p>
        </div>
      </div>
    </div>
  );
}
