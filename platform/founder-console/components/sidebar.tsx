'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@nordstern/shared-ui';
import { LayoutDashboard, Users, Anchor, Settings, Code, Activity, CreditCard } from 'lucide-react';
import { useMe } from '@/lib/session';

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Anchors', href: '/anchors', icon: Anchor },
  { name: 'Wallet Sandbox', href: '/wallet', icon: CreditCard },
  { name: 'Transactions', href: '/transactions', icon: Activity },
  { name: 'Developers', href: '/developers', icon: Code },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useMe();
  
  // Get active org or fallback
  const activeOrg = data?.organizations?.[0]?.name || 'NordStern Platform';

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card px-4 py-6">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Anchor className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">{activeOrg}</span>
          <span className="text-xs text-muted-foreground">Admin Console</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-4">
        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="mb-2 text-sm font-medium">Stellar Testnet</p>
          <p className="text-xs text-muted-foreground">Network is running optimally. 0 pending tasks.</p>
        </div>
      </div>
    </div>
  );
}
