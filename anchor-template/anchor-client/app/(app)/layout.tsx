'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ArrowDownToLine, ArrowUpFromLine, Receipt, User, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { BrandMark } from '@/components/brand-mark';
import { Spinner, Badge, type Tone } from '@/components/ui';
import { ProvisionedByNordStern, ENVIRONMENT, IS_PRODUCTION } from '@/components/ecosystem';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/buy', label: 'Buy', icon: ArrowDownToLine },
  { href: '/sell', label: 'Sell', icon: ArrowUpFromLine },
  { href: '/transactions', label: 'Activity', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: User },
];

const PAGE_TITLE: Record<string, string> = {
  '/home': 'Overview',
  '/buy': 'Buy',
  '/sell': 'Sell',
  '/transactions': 'Activity',
  '/profile': 'Profile',
  '/verify': 'Identity verification',
  '/support': 'Support',
};

function kycChip(status: string | undefined): { tone: Tone; label: string } {
  switch (status) {
    case 'approved': return { tone: 'success', label: 'Verified' };
    case 'pending': return { tone: 'warning', label: 'In review' };
    case 'declined': return { tone: 'danger', label: 'Action needed' };
    default: return { tone: 'warning', label: 'Verify identity' };
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useCustomer();
  const brand = useBrand();
  const router = useRouter();
  const pathname = usePathname();

  // Auth gate.
  useEffect(() => { if (!loading && !customer) router.replace('/login'); }, [customer, loading, router]);

  if (loading || !customer) {
    return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const title = Object.entries(PAGE_TITLE).find(([h]) => isActive(h))?.[1] ?? brand.name;
  const kyc = kycChip(customer.kycStatus);

  return (
    <div className="min-h-screen bg-surface/40 lg:flex">
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-canvas lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <BrandMark size={30} />
          <span className="truncate text-[15px] font-semibold text-ink">{brand.name}</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-brand/12 text-brand-deep' : 'text-muted hover:bg-surface hover:text-ink',
                )}>
                <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-deep' : 'text-faint')} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Verification nudge — the money gate lives at the foot of the rail */}
        {customer.kycStatus !== 'approved' && (
          <Link href="/verify" className="mx-3 mb-2 block rounded-xl border border-line bg-surface/60 p-3 transition hover:border-brand">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-warning)]" />
              <span className="text-xs font-semibold text-ink">Verify your identity</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">One quick check unlocks buying and selling.</p>
          </Link>
        )}

        <div className="border-t border-line p-3">
          <Link href="/profile" className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface">
            <Avatar customer={customer} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{customer.fullName || 'Your account'}</p>
              <p className="truncate text-[11px] text-muted">{customer.email}</p>
            </div>
          </Link>
          {/* Trust badge — Anchor stays primary; NordStern is the infrastructure line beneath. */}
          <div className="mt-1 flex items-center justify-between px-2">
            <ProvisionedByNordStern compact />
            {!IS_PRODUCTION && <Badge tone="info" className="text-[10px]">{ENVIRONMENT}</Badge>}
          </div>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar (below lg) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur lg:hidden">
          <Link href="/home" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-semibold text-ink">{brand.name}</span>
          </Link>
          <Link href="/support" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Support">
            <LifeBuoy className="h-5 w-5" />
          </Link>
        </header>

        {/* Desktop top bar (lg+) */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-line bg-canvas/80 px-8 backdrop-blur lg:flex">
          <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={kyc.tone}>{kyc.label}</Badge>
            <Link href="/support" className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink" aria-label="Support">
              <LifeBuoy className="h-[18px] w-[18px]" />
            </Link>
            <Link href="/profile" aria-label="Profile">
              <Avatar customer={customer} size="sm" />
            </Link>
          </div>
        </header>

        {/* Content — narrow flows stay readable; the dashboard/table use the full width. */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 pb-24 lg:px-8 lg:py-10 lg:pb-10">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar (below lg only) ─────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition', active ? 'text-brand-deep' : 'text-faint hover:text-muted')}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
