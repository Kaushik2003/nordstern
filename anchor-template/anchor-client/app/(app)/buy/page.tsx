'use client';

import Link from 'next/link';
import { ArrowDownToLine, Sparkles } from 'lucide-react';
import { Card, CardBody, Button } from '@/components/ui';
import { useBrand } from '@/components/brand-context';

// Placeholder for the Buy flow (Milestone 2). It settles over the existing SEP-24 backend,
// which is wallet-authenticated (SEP-10) — that flow is being wired next. No fake data here.
export default function BuyPage() {
  const brand = useBrand();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-brand-deep" /><h1 className="text-2xl font-bold text-ink">Buy</h1></div>
      <Card><CardBody className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15"><Sparkles className="h-6 w-6 text-brand-deep" /></div>
        <p className="font-medium text-ink">Buying is almost ready</p>
        <p className="max-w-xs text-sm text-muted">Add money to your {brand.name} balance with UPI in a few taps. We’re putting the finishing touches on the payment flow.</p>
        <Link href="/profile"><Button variant="outline" size="sm">Link a wallet to prepare</Button></Link>
      </CardBody></Card>
    </div>
  );
}
