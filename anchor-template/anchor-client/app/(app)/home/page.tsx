'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, ShieldCheck, ChevronRight, Receipt } from 'lucide-react';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Badge, type Tone } from '@/components/ui';

function kycView(status: string): { tone: Tone; label: string; cta: boolean } {
  switch (status) {
    case 'approved': return { tone: 'success', label: 'Identity verified', cta: false };
    case 'pending': return { tone: 'warning', label: 'Verification in review', cta: false };
    case 'declined': return { tone: 'danger', label: 'Verification failed', cta: true };
    default: return { tone: 'warning', label: 'Verify your identity to start', cta: true };
  }
}

export default function HomePage() {
  const { customer } = useCustomer();
  const brand = useBrand();
  const firstName = customer?.fullName?.split(' ')[0] || 'there';
  const kyc = kycView(customer?.kycStatus ?? 'unverified');
  const verified = customer?.kycStatus === 'approved';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Welcome back</p>
        <h1 className="text-2xl font-bold text-ink">Hi, {firstName} 👋</h1>
      </div>

      {/* KYC status — the gate to buying/selling */}
      <Link href="/profile" className="block">
        <Card className={kyc.cta ? 'border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)]/40' : ''}>
          <CardBody className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface">
              <ShieldCheck className={verified ? 'h-5 w-5 text-[var(--color-success)]' : 'h-5 w-5 text-[var(--color-warning)]'} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{kyc.label}</p>
              <p className="text-xs text-muted">{verified ? 'You’re all set to buy and sell.' : 'One quick check unlocks buying and selling.'}</p>
            </div>
            <Badge tone={kyc.tone}>{customer?.kycStatus ?? 'unverified'}</Badge>
          </CardBody>
        </Card>
      </Link>

      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/buy">
          <Card className="transition hover:border-brand">
            <CardBody className="flex flex-col gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand/15"><ArrowDownToLine className="h-5 w-5 text-brand-deep" /></div>
              <div><p className="font-semibold text-ink">Buy</p><p className="text-xs text-muted">Add money</p></div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/sell">
          <Card className="transition hover:border-brand">
            <CardBody className="flex flex-col gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand/15"><ArrowUpFromLine className="h-5 w-5 text-brand-deep" /></div>
              <div><p className="font-semibold text-ink">Sell</p><p className="text-xs text-muted">Cash out</p></div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Recent activity</h2>
          <Link href="/transactions" className="flex items-center text-sm text-brand-deep">View all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">No activity yet</p>
            <p className="text-xs text-faint">Your buys and sells with {brand.name} will appear here.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
