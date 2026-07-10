"use client";

import { toast } from "sonner";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Sheet, SheetHeader, SheetBody, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inrCompact, inr } from "@/lib/format";

export interface TierAlloc {
  hot: number;
  warm: number;
  deployable: number;
}

const SEG = [
  { key: "hot" as const, label: "Hot", color: "var(--color-cool)" },
  { key: "warm" as const, label: "Warm", color: "var(--color-brand)" },
  { key: "deployable" as const, label: "Deployable", color: "var(--color-pos)" },
];

function StackBar({ alloc }: { alloc: TierAlloc }) {
  const total = alloc.hot + alloc.warm + alloc.deployable;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
      {SEG.map((s) => (
        <div key={s.key} style={{ width: `${(alloc[s.key] / total) * 100}%`, background: s.color }} className="h-full" />
      ))}
    </div>
  );
}

export function OptimizeSheet({
  open,
  onOpenChange,
  current,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: TierAlloc;
  onApply: (next: TierAlloc) => void;
}) {
  const move = 10_00_000;
  const next: TierAlloc = { hot: current.hot - move, warm: current.warm + move, deployable: current.deployable };
  const incrementalYield = Math.round(move * 0.068);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width={460} title="Optimize allocation">
      <SheetHeader eyebrow="Advisory" title="Optimize allocation">
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-secondary">
          Computed from outstanding liabilities and 30-day redemption velocity. You approve — nothing moves automatically.
        </p>
      </SheetHeader>
      <SheetBody>
        <div className="rounded-[12px] border border-border-subtle bg-surface-2/50 p-4">
          <div className="eyebrow mb-2">Current</div>
          <StackBar alloc={current} />
          <Amounts alloc={current} />
        </div>

        <div className="my-2 flex justify-center">
          <span className="grid size-7 place-items-center rounded-full bg-brand-fill text-brand">
            <ArrowRight className="size-4 rotate-90" />
          </span>
        </div>

        <div className="rounded-[12px] border border-brand/30 bg-brand-fill/40 p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-brand" />
            <span className="eyebrow text-brand">Recommended</span>
          </div>
          <StackBar alloc={next} />
          <Amounts alloc={next} />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-pos/25 bg-pos-fill px-4 py-3">
          <Sparkles className="size-5 text-pos" />
          <div>
            <div className="font-mono text-[18px] font-semibold tabular-nums text-pos">+{inr(incrementalYield)}/yr</div>
            <div className="text-[12px] text-text-secondary">
              Projected incremental yield · shift {inrCompact(move)} idle Hot cash into Warm T-bills
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-border-subtle px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
          <p className="text-[12px] leading-relaxed text-text-secondary">
            Reserves backing redeemable tokens are protected. Only profit and excess can be deployed.
          </p>
        </div>
      </SheetBody>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-5 py-4">
        <DialogClose asChild>
          <Button variant="ghost">Not now</Button>
        </DialogClose>
        <Button
          variant="primary"
          onClick={() => {
            onApply(next);
            onOpenChange(false);
            toast("Allocation updated", { description: `Projected +${inr(incrementalYield)}/yr · advisory applied.` });
          }}
        >
          Apply (advisory)
        </Button>
      </div>
    </Sheet>
  );
}

function Amounts({ alloc }: { alloc: TierAlloc }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {SEG.map((s) => (
        <div key={s.key}>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] text-text-tertiary">{s.label}</span>
          </div>
          <div className="mt-0.5 font-mono text-[13px] tabular-nums text-text-primary">{inrCompact(alloc[s.key])}</div>
        </div>
      ))}
    </div>
  );
}
