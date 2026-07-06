"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, ExternalLink, ChevronDown, RotateCcw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Sheet, SheetHeader, SheetBody } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Copyable } from "@/components/ui/copyable";
import { CodeBlock } from "@/components/ui/code-block";
import { buildHops, type Hop } from "@/lib/data/lifecycle";
import { inr, token, truncHash, absIST, clockIST } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Tx } from "@/lib/data/types";

export function TxDrawer({ tx, open, onOpenChange }: { tx: Tx | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [showJson, setShowJson] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  if (!tx) return null;

  const handleRetry = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/biz/admin/transactions/${tx.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'admin' })
      });
      if (res.ok) {
        toast.success("Transaction force-completed", { description: `USDC released to counterparty wallet.` });
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error("Failed to force-complete", { description: data.error || 'Server error' });
      }
    } catch (e) {
      toast.error("Network error executing retry");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRefund = async () => {
    const reason = prompt("Enter reason for refund / termination:");
    if (reason === null) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/biz/admin/transactions/${tx.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'admin', reason })
      });
      if (res.ok) {
        toast.success("Transaction marked as failed/refunded", { description: `Status changed in Platform DB.` });
        onOpenChange(false);
      } else {
        toast.error("Failed to execute refund");
      }
    } catch (e) {
      toast.error("Network error executing refund");
    } finally {
      setLoadingAction(false);
    }
  };

  const hops = buildHops(tx);
  const inbound = tx.dir === "in";

  const json = JSON.stringify(
    {
      id: tx.id,
      type: tx.type,
      direction: tx.dir,
      status: tx.status,
      amount: tx.amount,
      fee: tx.fee,
      asset: "INRT",
      corridor: tx.corridor,
      stellar_tx: tx.hash,
      ...(tx.razorpayRef ? { razorpay_ref: tx.razorpayRef } : {}),
      ...(tx.utr ? { utr: tx.utr } : {}),
      user: tx.userName,
      created_at: new Date(tx.createdAt).toISOString(),
    },
    null,
    2,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width={560} title="Transaction detail">
      <SheetHeader
        eyebrow={`${inbound ? "Deposit · mint" : "Withdraw · burn → payout"} · ${tx.corridor}`}
        title={
          <span className="flex items-center gap-2.5">
            {inbound ? <ArrowDownLeft className="size-5 text-pos" /> : <ArrowUpRight className="size-5 text-neg" />}
            <span className={cn("font-mono tabular-nums", inbound ? "text-pos" : "text-neg")}>
              {inbound ? "+" : "−"}
              {inr(tx.amount)}
            </span>
          </span>
        }
      >
        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={tx.status} />
          <span className="rounded-full bg-brand-fill px-2 py-0.5 font-mono text-[10.5px] text-brand">TESTNET</span>
          <span className="font-mono text-[11px] text-text-tertiary">{absIST(tx.createdAt)}</span>
        </div>
      </SheetHeader>
      <SheetBody>
        {tx.status === "failed" && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-[12px] border border-crit/25 bg-crit-fill px-4 py-3">
            <div className="flex items-start gap-2.5">
              <X className="mt-0.5 size-4 shrink-0 text-crit" />
              <div>
                <div className="text-[13px] font-medium text-text-primary">Payout failed</div>
                <div className="text-[12px] text-text-secondary">{tx.failureReason}</div>
              </div>
            </div>
            <Button size="sm" variant="secondary" leadingIcon={<RotateCcw className="size-3.5" />} onClick={() => toast("Retrying payout…", { description: "Re-queued via RazorpayX." })}>
              Retry
            </Button>
          </div>
        )}

        {/* Lifecycle timeline */}
        <div className="eyebrow mb-3">Lifecycle</div>
        <div className="pl-1">
          {hops.map((h, i) => (
            <TimelineRow key={i} hop={h} last={i === hops.length - 1} />
          ))}
        </div>

        {/* User */}
        <div className="mt-5 eyebrow mb-2">Counterparty</div>
        <Link href="/users" className="flex items-center gap-3 rounded-[12px] border border-border-subtle bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-default">
          <Avatar name={tx.userName} initials={tx.userInitials} size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium text-text-primary">{tx.userName}</div>
            <div className="font-mono text-[11px] text-text-tertiary">{tx.city} · via {tx.source}</div>
          </div>
          <ExternalLink className="size-4 text-text-tertiary" />
        </Link>

        {/* Amounts & fee breakdown */}
        <div className="mt-5 eyebrow mb-2">Amounts & fees</div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-2/40 px-4">
          <Row label="Asset amount"><span className="font-mono tabular-nums">{token(tx.amount, "INRT", 4)}</span></Row>
          <Div />
          <Row label="Spread fee"><span className="font-mono tabular-nums">{inr(tx.spreadFee)}</span></Row>
          <Div />
          <Row label="Flat fee"><span className="font-mono tabular-nums">{inr(tx.flatFee)}</span></Row>
          <Div />
          <Row label="Network fee"><span className="font-mono tabular-nums">{inr(tx.networkFee)}</span></Row>
          <Div />
          <Row label="Your take"><span className="font-mono font-medium tabular-nums text-pos">{inr(tx.fee)}</span></Row>
        </div>

        {/* Refs */}
        <div className="mt-5 eyebrow mb-2">References</div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-2/40 px-4">
          <Row label="Stellar tx"><Copyable value={tx.hash} display={truncHash(tx.hash)} /></Row>
          {tx.razorpayRef && (<><Div /><Row label="Razorpay ref"><Copyable value={tx.razorpayRef} /></Row></>)}
          {tx.utr && (<><Div /><Row label="UTR"><Copyable value={tx.utr} /></Row></>)}
        </div>

        {/* Manual Intervention */}
        {tx.status !== "settled" && (
          <div className="mt-5 rounded-[12px] border border-crit/20 bg-crit-fill/5 p-4">
            <div className="eyebrow mb-2.5 text-crit">Manual Intervention Tools</div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={loadingAction}
                onClick={handleRetry}
                leadingIcon={<RotateCcw className="size-3.5" />}
              >
                Force Complete
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={loadingAction}
                onClick={handleRefund}
                leadingIcon={<X className="size-3.5" />}
              >
                Refund / Fail Tx
              </Button>
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <button onClick={() => setShowJson((s) => !s)} className="mt-5 flex w-full items-center justify-between rounded-[10px] px-1 py-2 text-[12.5px] text-text-secondary hover:text-text-primary">
          <span className="eyebrow">Raw event</span>
          <ChevronDown className={cn("size-4 transition-transform", showJson && "rotate-180")} />
        </button>
        {showJson && <div className="mt-1"><CodeBlock code={json} lang="json" filename="event.json" /></div>}
      </SheetBody>
    </Sheet>
  );
}

function TimelineRow({ hop, last }: { hop: Hop; last: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <HopIcon hop={hop} />
        {!last && <div className={cn("w-px flex-1", hop.state === "done" ? "bg-pos/40" : "bg-border-subtle")} style={{ minHeight: 26 }} />}
      </div>
      <div className={cn("pb-4", hop.state === "pending" && "opacity-50")}>
        <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
          {hop.label}
          {hop.href && hop.state !== "pending" && (
            <a href={hop.href} target="_blank" rel="noreferrer" className="text-text-tertiary transition-colors hover:text-brand">
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {hop.sub && <div className="text-[12px] text-text-secondary">{hop.sub}</div>}
        <div className="mt-0.5 flex items-center gap-2">
          {hop.at && <span className="font-mono text-[10.5px] text-text-tertiary">{clockIST(hop.at)} IST</span>}
          {hop.ref && hop.state !== "pending" && <Copyable value={hop.ref} display={`${hop.refLabel}: ${truncHash(hop.ref, 5, 4)}`} mono className="text-[10.5px]" iconSize={10} />}
        </div>
      </div>
    </div>
  );
}

function HopIcon({ hop }: { hop: Hop }) {
  if (hop.state === "done") return <span className="grid size-5 place-items-center rounded-full bg-pos-fill"><Check className="size-3 text-pos" /></span>;
  if (hop.state === "failed") return <span className="grid size-5 place-items-center rounded-full bg-crit-fill"><X className="size-3 text-crit" /></span>;
  if (hop.state === "active") return (
    <span className="relative grid size-5 place-items-center">
      <span className="absolute size-5 animate-[dot-pulse_1.5s_ease-in-out_infinite] rounded-full bg-warn/30" />
      <span className="size-2 rounded-full bg-warn" />
    </span>
  );
  return <span className="size-5 rounded-full border-2 border-border-default" />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-[13px]">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{children}</span>
    </div>
  );
}
function Div() {
  return <div className="h-px bg-border-subtle" />;
}
