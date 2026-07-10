"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ShieldAlert, FileCheck2, ScanFace, BadgeCheck, ArrowUpRight, ArrowDownLeft, Network } from "lucide-react";
import { Sheet, SheetHeader, SheetBody } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Pill, StatusPill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { inr, inrCompact, groupIN, relTime, absIST, truncAddr } from "@/lib/format";
import { transactions } from "@/lib/data/store";
import { cn } from "@/lib/cn";
import type { AppUser } from "@/lib/data/types";

const DOCS = ["Aadhaar", "PAN card", "Passport", "Driving licence"];

const riskTone = { low: "pos", med: "warn", high: "crit" } as const;

export function UserDrawer({ user, open, onOpenChange }: { user: AppUser | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!user) return null;
  const doc = DOCS[user.name.length % DOCS.length];
  const userTx = transactions.filter((t) => t.userId === user.id).slice(0, 5);
  const feesGenerated = Math.round(user.lifetimeVolume * 0.012);
  const matchTone = user.matchScore >= 92 ? "var(--color-pos)" : user.matchScore >= 85 ? "var(--color-warn)" : "var(--color-crit)";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width={540} title="User profile">
      <SheetHeader
        eyebrow={`Joined ${relTime(user.joined)} · ${user.source}`}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={user.name} initials={user.initials} size={36} />
            {user.name}
          </span>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill tone="brand" dot={false}>{user.tier}</Pill>
          <StatusPill status={user.status} />
          <Pill tone={riskTone[user.risk]}>{user.risk[0].toUpperCase() + user.risk.slice(1)} risk</Pill>
          {user.verifiedAcross > 1 && (
            <Pill tone="cool" icon={<Network className="size-3" />}>Verified across {user.verifiedAcross} anchors</Pill>
          )}
        </div>
      </SheetHeader>
      <SheetBody>
        {/* KYC details */}
        <div className="eyebrow mb-2">KYC verification</div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-text-secondary"><FileCheck2 className="size-4 text-text-tertiary" /> Document</span>
            <span className="text-[13px] font-medium text-text-primary">{doc}</span>
          </div>
          <div className="my-3 h-px bg-border-subtle" />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-text-secondary"><ScanFace className="size-4 text-text-tertiary" /> Liveness</span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-pos"><BadgeCheck className="size-4" /> Passed</span>
          </div>
          <div className="my-3 h-px bg-border-subtle" />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] text-text-secondary">Hyperverge match score</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: matchTone }}>0.{user.matchScore}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full" style={{ width: `${user.matchScore}%`, background: matchTone }} />
            </div>
          </div>
          <div className="mt-3 font-mono text-[10.5px] text-text-tertiary">Verified {absIST(user.joined)}</div>
        </div>

        {/* Risk */}
        {user.riskFactors.length > 0 && (
          <>
            <div className="mt-5 eyebrow mb-2">Risk factors</div>
            <div className="space-y-1.5">
              {user.riskFactors.map((f) => (
                <div key={f} className="flex items-center gap-2.5 rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2 text-[12.5px] text-text-secondary">
                  <ShieldAlert className="size-4 shrink-0 text-warn" /> {f}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Activity */}
        <div className="mt-5 eyebrow mb-2">Activity</div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Lifetime volume" value={inrCompact(user.lifetimeVolume)} />
          <Metric label="Transactions" value={groupIN(user.txCount)} />
          <Metric label="Fees generated" value={inr(feesGenerated)} accent="text-pos" />
          <Metric label="Last seen" value={relTime(user.lastSeen)} />
          <Metric label="City" value={user.city} />
          <Metric label="Wallet" value={truncAddr(user.address, 4, 4)} mono />
        </div>

        {/* Recent tx */}
        {userTx.length > 0 && (
          <>
            <div className="mt-5 eyebrow mb-2">Recent transactions</div>
            <div className="rounded-[12px] border border-border-subtle bg-surface-2/40">
              {userTx.map((t, i) => (
                <div key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t border-border-subtle")}>
                  {t.dir === "in" ? <ArrowDownLeft className="size-3.5 text-pos" /> : <ArrowUpRight className="size-3.5 text-neg" />}
                  <span className="text-[12.5px] text-text-secondary">{t.type === "deposit" ? "Deposit" : "Withdraw"}</span>
                  <span className="ml-auto font-mono text-[11px] text-text-tertiary">{relTime(t.createdAt)}</span>
                  <span className={cn("w-24 text-right font-mono text-[12.5px] tabular-nums", t.dir === "in" ? "text-pos" : "text-neg")}>{t.dir === "in" ? "+" : "−"}{inr(t.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Compliance actions */}
        <div className="mt-5 eyebrow mb-2">Compliance</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => toast("Re-KYC requested", { description: user.name })}>Request re-KYC</Button>
          <Button size="sm" variant="secondary" onClick={() => toast("Note added to profile")}>Add note</Button>
          {user.status === "flagged" ? (
            <Link href="/compliance"><Button size="sm" variant="destructive">View in Compliance</Button></Link>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => toast("Escalated to Compliance", { description: user.name })}>Escalate</Button>
          )}
        </div>
      </SheetBody>
    </Sheet>
  );
}

function Metric({ label, value, accent = "text-text-primary", mono }: { label: string; value: string; accent?: string; mono?: boolean }) {
  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
      <div className="eyebrow mb-1">{label}</div>
      <div className={cn("text-[14px] font-semibold", mono && "font-mono tabular-nums", accent)}>{value}</div>
    </div>
  );
}
