"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/pill";
import { Copyable } from "@/components/ui/copyable";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualRows } from "@/components/ui/virtual-rows";
import { TxDrawer } from "@/components/transactions/tx-drawer";
import { toast } from "sonner";
import { useApp } from "@/lib/providers";
import { useEventStream, useSkeleton, useNow } from "@/lib/hooks";
import { inr, inrCompact, truncHash, relTime, absIST } from "@/lib/format";
import { transactions as seed } from "@/lib/data/store";
import type { Tx } from "@/lib/data/types";
import { cn } from "@/lib/cn";

type Dir = "all" | "in" | "out" | "pending" | "failed";
const COLS = "grid grid-cols-[118px_104px_128px_minmax(150px,1fr)_120px_78px_112px_104px] items-center gap-2 px-4";

export default function TransactionsPage() {
  const ready = useSkeleton();
  const { density } = useApp();
  const events = useEventStream();
  const now = useNow(6_000);

  const [live, setLive] = useState<Tx[]>([]);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const seen = useRef(new Set<string>());
  const [dir, setDir] = useState<Dir>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Tx | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const e = events[0];
    if (!e || e.kind !== "tx" || seen.current.has(e.id)) return;
    seen.current.add(e.id);
    const tx = e.tx;
    setLive((prev) => [tx, ...prev].slice(0, 220));
    setFlash((f) => new Set(f).add(tx.id));
    setTimeout(() => setFlash((f) => { const n = new Set(f); n.delete(tx.id); return n; }), 1500);
  }, [events]);

  const all = useMemo(() => [...live, ...seed], [live]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((t) => {
      if (dir === "in" && t.dir !== "in") return false;
      if (dir === "out" && t.dir !== "out") return false;
      if (dir === "pending" && !["received", "minting", "burning", "payout", "pending"].includes(t.status)) return false;
      if (dir === "failed" && t.status !== "failed") return false;
      if (query && !(`${t.userName} ${t.hash} ${t.city} ${t.corridor}`.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [all, dir, q]);

  const summary = useMemo(() => {
    let inV = 0, outV = 0, inC = 0, outC = 0;
    for (const t of filtered) {
      if (t.status === "failed") continue;
      if (t.dir === "in") { inV += t.amount; inC++; } else { outV += t.amount; outC++; }
    }
    return { inV, outV, net: inV - outV, inC, outC };
  }, [filtered]);

  const rowH = density === "compact" ? 42 : 52;

  if (!ready) return <TxSkeleton />;

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        subtitle="The authoritative ledger of every deposit and withdrawal, in real time."
        actions={<Button variant="secondary" size="sm" leadingIcon={<Download className="size-3.5" />} onClick={() => toast("Export started", { description: `${filtered.length} rows · CSV` })}>Export</Button>}
      />

      {/* Direction summary */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard tone="pos" icon={<ArrowDownLeft className="size-4 text-pos" />} label="In" value={inrCompact(summary.inV)} count={summary.inC} />
        <SummaryCard tone="neg" icon={<ArrowUpRight className="size-4 text-neg" />} label="Out" value={inrCompact(summary.outV)} count={summary.outC} />
        <SummaryCard tone={summary.net >= 0 ? "pos" : "neg"} label="Net" value={`${summary.net >= 0 ? "+" : "−"}${inrCompact(Math.abs(summary.net))}`} count={summary.inC + summary.outC} sub="settled" />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          options={[
            { label: "All", value: "all" }, { label: "In", value: "in" }, { label: "Out", value: "out" },
            { label: "Pending", value: "pending" }, { label: "Failed", value: "failed" },
          ]}
          value={dir}
          onChange={setDir}
        />
        <SearchInput placeholder="Search user, hash, city…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full sm:w-72" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className={cn(COLS, "border-b border-border-subtle bg-sunken/70 py-2.5")}>
              {["Time", "Direction", "Type", "User", "Amount", "Fee", "Status", "Hash"].map((h, i) => (
                <span key={h} className={cn("font-mono text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary", (i === 4 || i === 5) && "text-right")}>{h}</span>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-[13px] text-text-tertiary">No transactions match these filters.</div>
            ) : (
              <VirtualRows
                items={filtered}
                rowHeight={rowH}
                height={620}
                getKey={(t) => t.id}
                renderRow={(t) => (
                  <button
                    onClick={() => { setSelected(t); setDrawer(true); }}
                    className={cn(COLS, "h-full w-full border-b border-border-subtle text-left transition-colors hover:bg-surface-2/50", flash.has(t.id) && "animate-[flash-pos_1.4s_ease-out]")}
                  >
                    <span className="font-mono text-[11.5px] tabular-nums text-text-secondary" title={absIST(t.createdAt)}>{relTime(t.createdAt, now)}</span>
                    <span className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", t.dir === "in" ? "text-pos" : "text-neg")}>
                      {t.dir === "in" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                      {t.dir === "in" ? "In" : "Out"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-text-primary">{t.type === "deposit" ? "Deposit" : "Withdraw"}</span>
                      <span className="block truncate font-mono text-[10.5px] text-text-tertiary">{t.dir === "in" ? "mint" : "burn → payout"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={t.userName} initials={t.userInitials} size={24} />
                      <span className="truncate text-[13px] text-text-secondary">{t.userName}</span>
                    </span>
                    <span className={cn("text-right font-mono text-[13px] font-medium tabular-nums", t.dir === "in" ? "text-pos" : "text-neg")}>{t.dir === "in" ? "+" : "−"}{inr(t.amount)}</span>
                    <span className="text-right font-mono text-[12px] tabular-nums text-text-tertiary">{inr(t.fee)}</span>
                    <span><StatusPill status={t.status} /></span>
                    <span onClick={(e) => e.stopPropagation()}><Copyable value={t.hash} display={truncHash(t.hash, 5, 3)} /></span>
                  </button>
                )}
              />
            )}
          </div>
        </div>
      </Card>

      <TxDrawer tx={selected} open={drawer} onOpenChange={setDrawer} />
    </PageContainer>
  );
}

function SummaryCard({ tone, icon, label, value, count, sub }: { tone: "pos" | "neg"; icon?: React.ReactNode; label: string; value: string; count: number; sub?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="flex items-center gap-1.5 eyebrow mb-1.5">{icon}{label}</div>
          <div className={cn("font-mono text-[22px] font-semibold tabular-nums", tone === "pos" ? "text-pos" : "text-neg")}>{value}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[15px] tabular-nums text-text-secondary">{count}</div>
          <div className="text-[11px] text-text-tertiary">{sub ?? "txns"}</div>
        </div>
      </div>
    </Card>
  );
}

function TxSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-5 h-7 w-44" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-[14px]" /><Skeleton className="h-20 rounded-[14px]" /><Skeleton className="h-20 rounded-[14px]" />
      </div>
      <Skeleton className="h-[680px] rounded-[14px]" />
    </PageContainer>
  );
}
