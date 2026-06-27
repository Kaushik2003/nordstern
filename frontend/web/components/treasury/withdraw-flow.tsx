"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, Landmark, Zap } from "lucide-react";
import { Modal, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copyable } from "@/components/ui/copyable";
import { inr, groupIN, clockIST } from "@/lib/format";
import { cn } from "@/lib/cn";

type Step = "amount" | "destination" | "review" | "processing" | "done";

export interface WithdrawResult {
  amount: number;
  utr: string;
  at: number;
}

function genUtr() {
  let s = "";
  for (let i = 0; i < 12; i++) s += Math.floor(Math.random() * 10);
  return s;
}

const STEP_INDEX: Record<Step, number> = { amount: 0, destination: 1, review: 2, processing: 2, done: 2 };

export function WithdrawFlow({
  open,
  onOpenChange,
  available,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: number;
  onComplete: (r: WithdrawResult) => void;
}) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState(available);
  const [result, setResult] = useState<WithdrawResult | null>(null);

  useEffect(() => {
    if (open) {
      setStep("amount");
      setAmount(available);
      setResult(null);
    }
  }, [open, available]);

  const valid = amount > 0 && amount <= available;

  const submit = () => {
    setStep("processing");
    setTimeout(
      () => {
        const r = { amount, utr: genUtr(), at: Date.now() };
        setResult(r);
        setStep("done");
        onComplete(r);
        toast("Withdrawal initiated", { description: `${inr(amount)} to Acme Pay ••6642` });
      },
      1500 + Math.random() * 900,
    );
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md" title="Withdraw to corporate account">
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Withdraw</div>
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-text-primary">
              To corporate account
            </h2>
          </div>
          <Stepper active={STEP_INDEX[step]} done={step === "done"} />
        </div>
      </div>

      <div className="px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === "amount" && (
              <AmountStep amount={amount} setAmount={setAmount} available={available} valid={valid} />
            )}
            {step === "destination" && <DestinationStep />}
            {step === "review" && <ReviewStep amount={amount} />}
            {step === "processing" && <ProcessingStep amount={amount} />}
            {step === "done" && result && <DoneStep result={result} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-5 py-4">
        {step === "amount" && (
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="primary" disabled={!valid} onClick={() => setStep("destination")} trailingIcon={<ArrowRight className="size-4" />}>
              Continue
            </Button>
          </>
        )}
        {step === "destination" && (
          <>
            <Button variant="ghost" onClick={() => setStep("amount")}>Back</Button>
            <Button variant="primary" onClick={() => setStep("review")} trailingIcon={<ArrowRight className="size-4" />}>
              Review
            </Button>
          </>
        )}
        {step === "review" && (
          <>
            <Button variant="ghost" onClick={() => setStep("destination")}>Back</Button>
            <Button variant="primary" onClick={submit}>Withdraw now</Button>
          </>
        )}
        {step === "processing" && (
          <Button variant="primary" fullWidth loading disabled>Processing…</Button>
        )}
        {step === "done" && (
          <DialogClose asChild>
            <Button variant="primary" fullWidth>Done</Button>
          </DialogClose>
        )}
      </div>
    </Modal>
  );
}

function Stepper({ active, done }: { active: number; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < active || done ? "w-5 bg-brand" : i === active ? "w-5 bg-brand" : "w-2.5 bg-surface-3",
          )}
        />
      ))}
    </div>
  );
}

function AmountStep({
  amount,
  setAmount,
  available,
  valid,
}: {
  amount: number;
  setAmount: (n: number) => void;
  available: number;
  valid: boolean;
}) {
  return (
    <div>
      <label className="eyebrow">Amount</label>
      <div className="mt-2 flex items-center gap-1 rounded-[12px] border border-border-default bg-surface-2 px-4 py-3 focus-within:border-brand/60">
        <span className="font-mono text-[26px] text-text-tertiary">₹</span>
        <input
          autoFocus
          inputMode="numeric"
          value={amount ? groupIN(amount) : ""}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d]/g, ""));
            setAmount(Number.isFinite(n) ? n : 0);
          }}
          className="w-full bg-transparent font-mono text-[26px] font-semibold tabular-nums text-text-primary outline-none"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("text-[12px]", valid ? "text-text-tertiary" : "text-crit")}>
          {amount > available ? "Exceeds available balance" : `${inr(available)} available`}
        </span>
        <div className="flex gap-1.5">
          {[0.25, 0.5, 1].map((p) => (
            <button
              key={p}
              onClick={() => setAmount(Math.round(available * p))}
              className="rounded-[7px] border border-border-subtle px-2 py-1 font-mono text-[11px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              {p === 1 ? "MAX" : `${p * 100}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DestinationStep() {
  return (
    <div>
      <label className="eyebrow">Destination</label>
      <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-brand/40 bg-brand-fill px-4 py-3.5">
        <span className="grid size-10 place-items-center rounded-[10px] bg-surface-3 text-brand">
          <Landmark className="size-5" />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-text-primary">Acme Pay · Current account</div>
          <div className="font-mono text-[12px] text-text-secondary">HDFC0001234 · A/C ••6642</div>
        </div>
        <Check className="size-5 text-brand" />
      </div>
      <button className="mt-3 flex items-center gap-2 text-[12.5px] text-text-secondary transition-colors hover:text-brand">
        <Building2 className="size-4" /> Manage accounts
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-medium text-text-primary">{children}</span>
    </div>
  );
}

function ReviewStep({ amount }: { amount: number }) {
  return (
    <div>
      <div className="rounded-[12px] border border-border-subtle bg-surface-2/50 px-4">
        <Row label="Amount"><span className="font-mono tabular-nums">{inr(amount)}</span></Row>
        <div className="h-px bg-border-subtle" />
        <Row label="Destination">Acme Pay ••6642</Row>
        <div className="h-px bg-border-subtle" />
        <Row label="Expected arrival">
          <span className="flex items-center gap-1.5 text-pos"><Zap className="size-3.5" /> Instant · RazorpayX</span>
        </Row>
        <div className="h-px bg-border-subtle" />
        <Row label="Fee"><span className="font-mono tabular-nums text-text-tertiary">₹0.00</span></Row>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
        You&apos;re withdrawing <span className="font-mono font-medium text-text-primary">{inr(amount)}</span> to Acme
        Pay <span className="font-mono">••6642</span>.
      </p>
    </div>
  );
}

function ProcessingStep({ amount }: { amount: number }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="relative grid size-16 place-items-center">
        <div className="absolute inset-0 rounded-full border-2 border-brand/20" />
        <div className="absolute inset-0 animate-[spin_0.9s_linear_infinite] rounded-full border-2 border-transparent border-t-brand" />
        <Landmark className="size-6 text-brand" />
      </div>
      <p className="mt-4 text-[14px] font-medium text-text-primary">Moving {inr(amount)} to your bank…</p>
      <p className="mt-1 font-mono text-[12px] text-text-tertiary">Burning INRT · queuing UPI payout</p>
    </div>
  );
}

function DoneStep({ result }: { result: WithdrawResult }) {
  return (
    <div className="flex flex-col items-center py-3 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 18 }}
        className="grid size-14 place-items-center rounded-full bg-pos-fill"
      >
        <Check className="size-7 text-pos" />
      </motion.div>
      <p className="mt-3 text-[16px] font-semibold text-text-primary">Withdrawal initiated</p>
      <p className="mt-1 text-[13px] text-text-secondary">
        {inr(result.amount)} is on its way to Acme Pay ••6642.
      </p>
      <div className="mt-4 w-full rounded-[12px] border border-border-subtle bg-surface-2/50 px-4">
        <Row label="UTR"><Copyable value={result.utr} className="text-[13px] font-medium text-text-primary" /></Row>
        <div className="h-px bg-border-subtle" />
        <Row label="Initiated"><span className="font-mono tabular-nums">{clockIST(result.at)} IST</span></Row>
      </div>
    </div>
  );
}
