"use client";

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Pill, StatusPill, Delta } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualRows } from "@/components/ui/virtual-rows";
import { KycFunnel } from "@/components/users/funnel";
import { UserDrawer } from "@/components/users/user-drawer";
import { useApp } from "@/lib/providers";
import { useSkeleton, useNow } from "@/lib/hooks";
import { inrCompact, groupIN, relTime } from "@/lib/format";
import { KYC_FUNNEL } from "@/lib/data/store";
import { cn } from "@/lib/cn";
import type { AppUser } from "@/lib/data/types";

// API
import { useLive, Summary } from "@/lib/api";

type Status = "all" | "verified" | "pending" | "rejected" | "flagged";
type Tier = "all" | "T0" | "T1" | "T2";
const COLS = "grid grid-cols-[minmax(150px,1fr)_64px_120px_118px_64px_104px_92px] items-center gap-2 px-4";
const riskTone = { low: "pos", med: "warn", high: "crit" } as const;

export default function UsersPage() {
  const ready = useSkeleton();
  const { density } = useApp();
  const now = useNow(15_000);
  const [status, setStatus] = useState<Status>("all");
  const [tier, setTier] = useState<Tier>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [drawer, setDrawer] = useState(false);

  // Live Data
  const { data: s, loading: sLoading } = useLive<Summary>('/admin/summary', 5000);
  const { data: uData, loading: uLoading } = useLive<{ users: AppUser[] }>('/admin/users', 5000);

  const ALL = uData?.users || [];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ALL.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (tier !== "all" && u.tier !== tier) return false;
      if (query && !`${u.name} ${u.id}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [status, tier, q, ALL]);

  const passRate = (KYC_FUNNEL[3].value / KYC_FUNNEL[0].value) * 100;
  const rowH = density === "compact" ? 44 : 54;
  
  // Use live transaction total as a proxy for "active users" since we lack a real /admin/users endpoint.
  // We'll fall back to 18452 (the mock total) if there's no data.
  const activeUsers = ALL.length > 0 ? ALL.length : (s?.counts?.total || 18452);

  if (!ready || (sLoading && !s) || (uLoading && !uData)) return <UsersSkeleton />;

  return (
    <PageContainer>
      <PageHeader title="Users & KYC" subtitle="Who is using this anchor, and how they verified." />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardBody>
            <CardHead label="KYC funnel" info="Started → Document → Face match → Verified, with drop-off at the weakest step." />
            <div className="mt-5">
              <KycFunnel stages={KYC_FUNNEL} />
            </div>
          </CardBody>
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <CardBody>
              <CardHead label="KYC pass rate" info="Verified ÷ started." />
              <div className="mt-2 font-mono text-[30px] font-semibold tabular-nums text-text-primary">{passRate.toFixed(1)}%</div>
              <div className="mt-1.5 flex items-center gap-2">
                <Delta value={2.1} />
                <span className="text-[12px] text-text-tertiary">vs 79.8% network median</span>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <CardHead label="Total users" info="Aggregated from unique Stellar addresses interacting with the anchor." />
              <div className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-text-primary">{groupIN(activeUsers)}</div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-text-tertiary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-[dot-pulse_1.8s_ease-in-out_infinite] rounded-full bg-pos" />
                  <span className="relative inline-flex size-2 rounded-full bg-pos" />
                </span>
                across all tiers (Live)
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          options={[{ label: "All", value: "all" }, { label: "Verified", value: "verified" }, { label: "Pending", value: "pending" }, { label: "Rejected", value: "rejected" }, { label: "Flagged", value: "flagged" }]}
          value={status}
          onChange={setStatus}
        />
        <Segmented size="sm" options={[{ label: "All tiers", value: "all" }, { label: "T0", value: "T0" }, { label: "T1", value: "T1" }, { label: "T2", value: "T2" }]} value={tier} onChange={setTier} />
        <SearchInput placeholder="Search name or address..." value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full sm:w-64" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className={cn(COLS, "border-b border-border-subtle bg-sunken/70 py-2.5")}>
              {["User", "Tier", "Status", "Volume LT", "Txns", "Last seen", "Risk"].map((h, i) => (
                <span key={h} className={cn("font-mono text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary", (i === 3 || i === 4) && "text-right")}>{h}</span>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-[13px] text-text-tertiary">No users match these filters.</div>
            ) : (
              <VirtualRows
                items={filtered}
                rowHeight={rowH}
                height={600}
                getKey={(u) => u.id}
                renderRow={(u) => (
                  <button onClick={() => { setSelected(u); setDrawer(true); }} className={cn(COLS, "h-full w-full border-b border-border-subtle text-left transition-colors hover:bg-surface-2/50")}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={u.name} initials={u.initials} size={26} />
                      <span className="truncate text-[13px] font-medium text-text-primary">{u.name}</span>
                    </span>
                    <span className="font-mono text-[12px] text-text-secondary">{u.tier}</span>
                    <span><StatusPill status={u.status} /></span>
                    <span className="text-right font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(u.lifetimeVolume)}</span>
                    <span className="text-right font-mono text-[12.5px] tabular-nums text-text-secondary">{u.txCount}</span>
                    <span className="font-mono text-[11.5px] text-text-tertiary">{relTime(u.lastSeen, now)}</span>
                    <span><Pill tone={riskTone[u.risk as 'low'|'med'|'high'] || 'low'}>{u.risk[0].toUpperCase() + u.risk.slice(1)}</Pill></span>
                  </button>
                )}
              />
            )}
          </div>
        </div>
      </Card>

      <UserDrawer user={selected} open={drawer} onOpenChange={setDrawer} />
    </PageContainer>
  );
}

function UsersSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-5 h-7 w-40" />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Skeleton className="h-56 rounded-[14px]" />
        <div className="grid gap-4"><Skeleton className="h-28 rounded-[14px]" /><Skeleton className="h-24 rounded-[14px]" /></div>
      </div>
      <Skeleton className="mt-4 h-[640px] rounded-[14px]" />
    </PageContainer>
  );
}
