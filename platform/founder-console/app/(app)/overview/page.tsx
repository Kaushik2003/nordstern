'use client';

import Link from 'next/link';
import { useMe, useMyAnchors, type MyAnchor } from '@/lib/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nordstern/shared-ui';
import { Button } from '@nordstern/shared-ui';
import { Badge } from '@nordstern/shared-ui';
import { Anchor, ArrowUpRight, ExternalLink, Loader2, Plus } from 'lucide-react';

// Founder home = a real "my anchors" portfolio (the founder's launched anchors + status +
// links to each anchor's console/customer app). Org-level, cross-anchor. NOT a single-anchor
// operator dashboard — that lives on the per-anchor operator console. No mock data.

const STATUS: Record<MyAnchor['status'], { label: string; variant: 'default' | 'success' | 'warning' }> = {
  active:       { label: 'Live',          variant: 'success' },
  provisioning: { label: 'Provisioning…', variant: 'warning' },
  draft:        { label: 'Draft',         variant: 'default' },
  error:        { label: 'Failed',        variant: 'warning' },
  suspended:    { label: 'Suspended',     variant: 'default' },
  removed:      { label: 'Removed',       variant: 'default' },
};

export default function OverviewPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useMyAnchors();
  const anchors = data?.anchors ?? [];
  const firstName = me?.user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your anchors</h2>
          <p className="text-muted-foreground">Welcome back, {firstName}. Manage the anchors you’ve launched.</p>
        </div>
        <Link href="/register">
          <Button><Plus className="mr-1.5 h-4 w-4" /> Launch an anchor</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : anchors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Anchor className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No anchors yet</p>
              <p className="text-sm text-muted-foreground">Apply to launch your first anchor — we’ll review and get you live.</p>
            </div>
            <Link href="/register"><Button variant="outline"><Plus className="mr-1.5 h-4 w-4" /> Start an application</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {anchors.map((a) => {
            const s = STATUS[a.status] ?? STATUS.draft;
            const brandName = a.branding?.displayName || a.name;
            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{brandName}</CardTitle>
                    <CardDescription className="font-mono text-xs">{a.slug} · {a.network}</CardDescription>
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-2">
                  {a.status === 'active' && a.consoleUrl && a.customerUrl ? (
                    <>
                      <a href={a.consoleUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full justify-between">
                          Operator console <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </a>
                      <a href={a.customerUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" className="w-full justify-between">
                          Customer app <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </>
                  ) : a.status === 'provisioning' ? (
                    <p className="text-sm text-muted-foreground">Setting up your anchor — this takes a few minutes.</p>
                  ) : a.status === 'error' ? (
                    <p className="text-sm text-destructive">Provisioning failed. Contact support to retry.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not launched yet.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
