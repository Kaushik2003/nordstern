"use client";

import { ShieldCheck, BadgeCheck } from "lucide-react";
import { Sheet, SheetHeader, SheetBody } from "@/components/ui/dialog";
import { Copyable } from "@/components/ui/copyable";
import { Pill } from "@/components/ui/pill";
import { inr, inrCompact, token, truncAddr, absIST } from "@/lib/format";
import { ORG, TREASURY } from "@/lib/data/store";

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[12.5px] text-text-secondary">{label}</span>
      <span className="text-right text-[13px] font-medium text-text-primary">{children}</span>
    </div>
  );
}

export function AttestationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const sigHash = "a3f29c7e1b4d8f60aa92e5c4d7b1f308e6c2a9b5d4e3f10729c8b6a5d4e3f102";
  return (
    <Sheet open={open} onOpenChange={onOpenChange} width={480} title="Proof of reserves attestation">
      <SheetHeader eyebrow="Proof of reserves" title="Reserve attestation">
        <div className="mt-2 flex items-center gap-2">
          <Pill tone="pos" icon={<BadgeCheck className="size-3.5" />}>Verified</Pill>
          <span className="font-mono text-[11px] text-text-tertiary">{absIST(TREASURY.lastVerified)}</span>
        </div>
      </SheetHeader>
      <SheetBody>
        <div className="flex items-center gap-3 rounded-[12px] border border-pos/25 bg-pos-fill px-4 py-3.5">
          <ShieldCheck className="size-7 text-pos" />
          <div>
            <div className="font-mono text-[22px] font-semibold tabular-nums text-text-primary">
              {TREASURY.ratio.toFixed(1)}%
            </div>
            <div className="text-[12px] text-text-secondary">Backing ratio · fully reserved</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="eyebrow mb-1.5">Issuer</div>
          <div className="rounded-[12px] border border-border-subtle bg-surface-2/50 px-4">
            <Line label="Operator">{ORG.name}</Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Asset">{ORG.asset}</Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Issuer key"><Copyable value={ORG.issuer} display={truncAddr(ORG.issuer, 6, 6)} /></Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Home domain">{ORG.homeDomain}</Line>
          </div>
        </div>

        <div className="mt-4">
          <div className="eyebrow mb-1.5">Backing</div>
          <div className="rounded-[12px] border border-border-subtle bg-surface-2/50 px-4">
            <Line label="Tokens issued"><span className="font-mono tabular-nums">{token(TREASURY.tokensIssued, "INRT", 2)}</span></Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Fiat reserves"><span className="font-mono tabular-nums">{inr(TREASURY.reserves - TREASURY.tiers.deployable.amount)}</span></Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Crypto reserves"><span className="font-mono tabular-nums">{inr(TREASURY.tiers.deployable.amount)}</span></Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Total reserves"><span className="font-mono tabular-nums text-pos">{inrCompact(TREASURY.reserves)}</span></Line>
          </div>
        </div>

        <div className="mt-4">
          <div className="eyebrow mb-1.5">Signature</div>
          <div className="rounded-[12px] border border-border-subtle bg-surface-2/50 px-4">
            <Line label="Attestor">NordStern Trust</Line>
            <div className="h-px bg-border-subtle" />
            <Line label="Hash"><Copyable value={sigHash} display={truncAddr(sigHash, 8, 6)} /></Line>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-text-tertiary">
            Reserves backing redeemable tokens are protected. Only profit and excess can be deployed. Attestations are
            recomputed every 15 minutes and hash-chained in the compliance audit log.
          </p>
        </div>
      </SheetBody>
    </Sheet>
  );
}
