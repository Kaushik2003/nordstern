'use client';

import Link from 'next/link';
import { ArrowUpFromLine, Sparkles } from 'lucide-react';
import { Card, CardBody, Button } from '@/components/ui';
import { useBrand } from '@/components/brand-context';

// Placeholder for the Sell flow (Milestone 2), settling over the existing SEP-24 backend.
export default function SellPage() {
  const brand = useBrand();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><ArrowUpFromLine className="h-5 w-5 text-brand-deep" /><h1 className="text-2xl font-bold text-ink">Sell</h1></div>
      <Card><CardBody className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15"><Sparkles className="h-6 w-6 text-brand-deep" /></div>
        <p className="font-medium text-ink">Cashing out is almost ready</p>
        <p className="max-w-xs text-sm text-muted">Sell your balance and receive money straight to your bank. We’re wiring up the payout flow next.</p>
        <Link href="/profile"><Button variant="outline" size="sm">Link a wallet to prepare</Button></Link>
      </CardBody></Card>
    </div>
  );
}
