'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, Link2 } from 'lucide-react';
import { bizGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { dateTime } from '@/lib/format';

interface Entry { seq: number; action: string; detail: string; actor: string; hash: string; prevHash: string; at: number }

export default function AuditPage() {
  const { data, isLoading } = useQuery({ queryKey: ['audit'], queryFn: () => bizGet<{ audit: Entry[] }>('/admin/compliance/audit'), refetchInterval: 30000 });
  const [q, setQ] = useState('');

  const entries = (data?.audit ?? []).filter((e) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return e.action.toLowerCase().includes(s) || e.actor.toLowerCase().includes(s) || e.detail.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Audit log</h1>
        <p className="flex items-center gap-1.5 text-sm text-subtle">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" /> Tamper-evident — each entry is hash-chained to the previous one.
        </p>
      </div>

      <div className="flex items-center rounded-lg border border-input bg-background px-3">
        <Search className="h-4 w-4 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, actor, or detail…" className="w-full bg-transparent px-2 py-2 text-sm text-ink outline-none" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !entries.length ? (
        <Card><CardContent className="py-10 text-center text-sm text-subtle">{q ? 'No entries match your search.' : 'No audit activity yet. Operator and system actions will be recorded here.'}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.seq}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-subtle">{e.seq}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-ink">{e.action}</span>
                    <Badge tone="neutral">{e.actor}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-subtle">{e.detail}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle">
                    <span>{dateTime(new Date(e.at).toISOString())}</span>
                    <span className="flex items-center gap-1 font-mono"><Link2 className="h-3 w-3" /> {e.prevHash?.slice(0, 8)} → {e.hash?.slice(0, 8)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
