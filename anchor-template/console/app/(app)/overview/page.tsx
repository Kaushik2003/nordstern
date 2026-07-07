import { getBrand } from '@/lib/brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowLeftRight, KeyRound } from 'lucide-react';

// R3.1: branded shell + live-anchor identity. Real treasury/transaction data is
// wired in R3.4 (via /biz/*); credential management in R3.3.
export default function OverviewPage() {
  const brand = getBrand();
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Overview</h1>
        <p className="text-sm text-subtle">
          Operating <span className="font-medium text-ink">{brand.name}</span> — a NordStern anchor issuing{' '}
          <span className="font-medium text-ink">{brand.assetCode}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-subtle">Treasury</CardTitle>
            <Wallet className="h-4 w-4 text-subtle" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">—</div>
            <p className="text-xs text-subtle">live balance wired in R3.4</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-subtle">Transactions</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-subtle" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">—</div>
            <p className="text-xs text-subtle">SEP-24 feed wired in R3.4</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-subtle">Payment Rails</CardTitle>
            <KeyRound className="h-4 w-4 text-subtle" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">—</div>
            <p className="text-xs text-subtle">manage in Credentials (R3.3)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anchor identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-line py-2">
            <span className="text-subtle">Name</span><span className="font-medium text-ink">{brand.name}</span>
          </div>
          <div className="flex justify-between border-b border-line py-2">
            <span className="text-subtle">Slug</span><span className="font-mono text-ink">{brand.slug}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-subtle">Asset</span><span className="font-medium text-ink">{brand.assetCode}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
