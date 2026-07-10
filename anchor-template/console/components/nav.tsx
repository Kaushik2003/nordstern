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
      { href: '/compliance', label: 'Compliance cases', icon: ShieldAlert },
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

// Dark rail nav. Collapsed = icon-only with hover tooltips; expanded = grouped labels.
export function Nav({ expanded }: { expanded: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn('flex flex-col', expanded ? 'gap-4' : 'items-center gap-1.5')}>
      {GROUPS.map((g, gi) => (
        <div key={g.title} className={cn('flex flex-col', expanded ? 'gap-0.5' : 'items-center gap-1.5')}>
          {expanded ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">{g.title}</p>
          ) : (
            gi > 0 && <span className="my-1 h-px w-6 rounded-full bg-white/10" />
          )}
          {g.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                className={cn(
                  'group relative flex items-center rounded-[13px] transition-colors duration-200',
                  expanded ? 'gap-3 px-3 py-2 text-[13px] font-medium' : 'size-10 justify-center',
                  active
                    ? 'bg-brand/[0.16] text-white ring-1 ring-inset ring-brand/25'
                    : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {expanded && <span className="truncate">{label}</span>}
                {!expanded && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
