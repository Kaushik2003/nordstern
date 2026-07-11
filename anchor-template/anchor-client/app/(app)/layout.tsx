'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, Zap, Landmark, Activity, User, LifeBuoy, BookOpen,
  Search, Bell, ChevronRight,
} from 'lucide-react';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { BrandMark } from '@/components/brand-mark';
import { Spinner, Badge, type Tone } from '@/components/ui';
import { ProvisionedByNordStern } from '@/components/ecosystem';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/home', label: 'Home', icon: LayoutGrid },
  { href: '/buy', label: 'Buy', icon: Zap },
  { href: '/sell', label: 'Sell', icon: Landmark },
  { href: '/transactions', label: 'Activity', icon: Activity },
];

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
  // Environment label from the anchor's REAL network (runtime), not a build-time flag —
  // a mainnet anchor must never show "Sandbox".
  const isMainnet = brand.network === 'mainnet';
  const envLabel = isMainnet ? 'Mainnet' : 'Testnet';
  const router = useRouter();
  const pathname = usePathname();

  // Auth gate.
  useEffect(() => { if (!loading && !customer) router.replace('/login'); }, [customer, loading, router]);

  if (loading || !customer) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f4f8]"><Spinner className="h-6 w-6 text-brand" /></div>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const verified = customer.kycStatus === 'approved';
  const kyc = kycChip(customer.kycStatus);

  // Brand wordmark, nord-v2 style: lead word(s) italic + the final word as an uppercase
  // accent pill (e.g. "Mizu" + "PAY"). Fully white-label — derived from brand.name, so a
  // single-word anchor ("Coro") renders italic with no pill.
  const nameWords = brand.name.trim().split(/\s+/);
  const wordmarkLead = nameWords.length > 1 ? nameWords.slice(0, -1).join(' ') : brand.name;
  const wordmarkTag = nameWords.length > 1 ? nameWords[nameWords.length - 1] : null;
  const Wordmark = () => (
    <>
      <span className="italic tracking-tight">{wordmarkLead}</span>
      {wordmarkTag && <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold not-italic uppercase tracking-wide text-brand-800">{wordmarkTag}</span>}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#f4f4f8]">
      {/* ── Desktop dark icon rail (sm+) ──────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center justify-between self-start bg-[#161520] py-6 sm:flex">
        <div className="flex flex-col items-center gap-2">
          <Link href="/home" className="mb-3" aria-label={brand.name}>
            <BrandMark size={38} />
          </Link>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} title={label}
                className={cn(
                  'grid size-11 place-items-center rounded-[14px] transition-colors duration-200',
                  active ? 'bg-brand/[0.16] text-white ring-1 ring-inset ring-brand/25' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80',
                )}>
                <Icon className="h-[19px] w-[19px]" />
              </Link>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link href="/support" title="Support"
            className="grid size-11 place-items-center rounded-[14px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80">
            <BookOpen className="h-[19px] w-[19px]" />
          </Link>
          <Link href="/profile" title="Profile"
            className={cn('grid size-11 place-items-center rounded-[14px] transition-colors',
              isActive('/profile') ? 'bg-brand/[0.16] text-white ring-1 ring-inset ring-brand/25' : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80')}>
            <User className="h-[19px] w-[19px]" />
          </Link>
          <span className="my-1 h-px w-6 rounded-full bg-white/10" />
          <Link href="/profile" aria-label="Your account"><Avatar customer={customer} size="sm" className="ring-1 ring-white/15" /></Link>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(130%_100%_at_50%_-20%,#faf9ff_0%,#f5f5f9_55%,#f1f0f6_100%)]">
        {/* Desktop top bar (sm+) */}
        <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-black/[0.05] bg-[#faf9ff]/85 px-6 py-4 backdrop-blur sm:flex">
          <Link href="/home" className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
            <Wordmark />
          </Link>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
            isMainnet ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[#f6eccf] text-[#8a6410]')}>
            <span className={cn('size-1.5 rounded-full', isMainnet ? 'bg-[var(--color-success)]' : 'bg-[#c9992e]')} /> {envLabel}
          </span>
          <span className="hidden rounded-full border border-black/[0.06] bg-canvas/70 px-2.5 py-1 text-[11px] font-medium text-muted md:inline">
            Stellar · {brand.assetCode}
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full border border-black/[0.06] bg-canvas px-4 py-2 text-[12.5px] text-subtle lg:flex">
              <Search className="h-[15px] w-[15px]" /> Search transactions, memos…
            </span>
            {!verified && (
              <Link href="/verify" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-warning)] transition-colors hover:brightness-95">
                Verify identity <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link href="/support" aria-label="Support"
              className="grid size-9 place-items-center rounded-full border border-black/[0.06] bg-canvas text-muted transition-colors hover:text-ink">
              <Bell className="h-[15px] w-[15px]" />
            </Link>
            <Link href="/profile" aria-label="Profile"><Avatar customer={customer} size="sm" /></Link>
          </div>
        </header>

        {/* Mobile top bar (below sm) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.05] bg-[#faf9ff]/90 px-5 py-3 backdrop-blur sm:hidden">
          <Link href="/home" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <BrandMark size={26} />
            <span className="flex items-center gap-1.5"><Wordmark /></span>
          </Link>
          <div className="flex items-center gap-1.5">
            {!verified && <Badge tone={kyc.tone}>{kyc.label}</Badge>}
            <Link href="/support" className="rounded-lg p-2 text-muted hover:bg-black/[0.04] hover:text-ink" aria-label="Support">
              <LifeBuoy className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="w-full flex-1 p-5 pb-24 sm:p-6">
          {children}
        </main>

        {/* Attribution footer (desktop) */}
        <div className="hidden items-center justify-center gap-2 border-t border-black/[0.05] px-6 py-3 sm:flex">
          <ProvisionedByNordStern compact />
        </div>
      </div>

      {/* ── Mobile bottom tab bar (below sm) ──────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-canvas sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[...NAV, { href: '/profile', label: 'Profile', icon: User }].map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors', active ? 'text-brand-700' : 'text-subtle hover:text-muted')}>
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
