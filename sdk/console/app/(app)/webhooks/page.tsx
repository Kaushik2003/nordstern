'use client';

import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { dateTime } from '@/lib/format';

interface Delivery { id: string; event: string; status: number; attempts: number; ms: number; at: number }

export default function WebhooksPage() {
  const { data, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: () => bizGet<{ deliveries: Delivery[] }>('/admin/developer/webhooks/deliveries'), refetchInterval: 30000 });
  const rows = data?.deliveries ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Webhooks</h1>
        <p className="text-sm text-subtle">Delivery history for outbound event notifications.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent deliveries</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[0,1].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <div className="flex items-start gap-2 p-6 text-sm text-subtle">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No deliveries recorded yet. Outbound webhook delivery tracking is not yet wired on the backend — this table will populate once it is. No sample data is shown.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead><TR className="border-line"><TH className="pl-4">Event</TH><TH>Response</TH><TH>Attempts</TH><TH>Latency</TH><TH>When</TH></TR></THead>
                <TBody>
                  {rows.map((d) => (
                    <TR key={d.id}>
                      <TD className="pl-4 font-mono text-xs">{d.event}</TD>
                      <TD><Badge tone={d.status >= 200 && d.status < 300 ? 'success' : 'danger'}>{d.status}</Badge></TD>
                      <TD>{d.attempts}</TD>
                      <TD className="text-subtle">{d.ms} ms</TD>
                      <TD className="text-subtle">{dateTime(new Date(d.at).toISOString())}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Registered endpoints</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-subtle">Managing outbound webhook endpoints (register, retry a delivery) isn&apos;t supported by the backend yet. When those endpoints exist, they&apos;ll appear here — no placeholder endpoints are shown.</p>
        </CardContent>
      </Card>
    </div>
  );
}
