'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ArrowLeftRight, Landmark, Users, ShieldAlert, ScrollText,
  SlidersHorizontal, KeyRound, Webhook, FileBarChart, UsersRound, Settings, Radio,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Operations',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutDashboard },
      { href: '/activity', label: 'Activity', icon: Radio },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/treasury', label: 'Treasury', icon: Landmark },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { href: '/compliance', label: 'Cases', icon: ShieldAlert },
      { href: '/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { href: '/pricing', label: 'Pricing & limits', icon: SlidersHorizontal },
      { href: '/api-keys', label: 'API keys', icon: KeyRound },
      { href: '/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/credentials', label: 'Credentials', icon: KeyRound },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/reports', label: 'Reports', icon: FileBarChart },
      { href: '/team', label: 'Team', icon: UsersRound },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-subtle/70">{g.title}</p>
          <div className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-surface text-ink' : 'text-subtle hover:bg-surface hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
