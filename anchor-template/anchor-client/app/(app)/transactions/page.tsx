'use client';

import { Receipt } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { useBrand } from '@/components/brand-context';

// Customer-scoped history (Milestone 2). Requires the wallet-authenticated SEP-24 tx list
// — shown as an honest empty state until that flow is wired. No fabricated transactions.
export default function TransactionsPage() {
  const brand = useBrand();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Activity</h1>
      <Card><CardBody className="flex flex-col items-center gap-3 py-16 text-center">
        <Receipt className="h-9 w-9 text-faint" />
        <p className="font-medium text-ink">No activity yet</p>
        <p className="max-w-xs text-sm text-muted">Once you buy or sell with {brand.name}, your transactions and receipts will appear here.</p>
      </CardBody></Card>
    </div>
  );
}
