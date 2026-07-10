'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ArrowDownToLine, ArrowUpFromLine, Receipt, User, LifeBuoy } from 'lucide-react';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { BrandMark } from '@/components/brand-mark';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/buy', label: 'Buy', icon: ArrowDownToLine },
  { href: '/sell', label: 'Sell', icon: ArrowUpFromLine },
  { href: '/transactions', label: 'Activity', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: User },
];

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

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur">
        <Link href="/home" className="flex items-center gap-2">
          <BrandMark size={30} />
          <span className="font-semibold text-ink">{brand.name}</span>
        </Link>
        <Link href="/support" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Support">
          <LifeBuoy className="h-5 w-5" />
        </Link>
      </header>

      <main className="px-5 py-5">{children}</main>

      {/* Bottom tab bar — mobile-first fintech pattern */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg border-t border-line bg-canvas">
        <div className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
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
