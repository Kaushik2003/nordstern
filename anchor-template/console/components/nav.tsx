'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ArrowLeftRight, Landmark, Users, ShieldAlert, ScrollText,
  SlidersHorizontal, KeyRound, Webhook, FileBarChart, UsersRound, Settings, Radio,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
// Flat list with soft group breaks — rendered as a slim dark icon rail (landing mock aesthetic).
const GROUPS: Item[][] = [
  [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/activity', label: 'Activity', icon: Radio },
    { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/treasury', label: 'Treasury', icon: Landmark },
  ],
  [
    { href: '/compliance', label: 'Compliance cases', icon: ShieldAlert },
    { href: '/audit', label: 'Audit log', icon: ScrollText },
  ],
  [
    { href: '/pricing', label: 'Pricing & limits', icon: SlidersHorizontal },
    { href: '/api-keys', label: 'API keys', icon: KeyRound },
    { href: '/webhooks', label: 'Webhooks', icon: Webhook },
    { href: '/credentials', label: 'Credentials', icon: KeyRound },
  ],
  [
    { href: '/reports', label: 'Reports', icon: FileBarChart },
    { href: '/team', label: 'Team', icon: UsersRound },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
];

// Icon-only vertical rail with hover tooltips. Active item gets a soft brand tint.
export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col items-center gap-1.5">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col items-center gap-1.5">
          {gi > 0 && <span className="my-1 h-px w-6 rounded-full bg-white/10" />}
          {group.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                className={cn(
                  'group relative grid size-10 place-items-center rounded-[13px] transition-colors duration-200',
                  active
                    ? 'bg-brand/[0.16] text-white ring-1 ring-inset ring-brand/25'
                    : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
