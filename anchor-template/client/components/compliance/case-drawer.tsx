"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, FileWarning, Send } from "lucide-react";
import { Sheet, SheetHeader, SheetBody } from "@/components/ui/dialog";
import { Modal, DialogClose } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { inr, absIST, relTime } from "@/lib/format";
import type { ComplianceCase, CaseStatus } from "@/lib/data/compliance";

const sevTone = { low: "cool", med: "warn", high: "crit" } as const;
const statusTone: Record<CaseStatus, "warn" | "cool" | "pos" | "brand"> = { open: "warn", in_review: "cool", cleared: "pos", reported: "brand" };
const statusLabel: Record<CaseStatus, string> = { open: "Open", in_review: "In review", cleared: "Cleared", reported: "Reported" };

export function CaseDrawer({ c, open, onOpenChange, onResolve }: { c: ComplianceCase | null; open: boolean; onOpenChange: (v: boolean) => void; onResolve: (id: string, status: CaseStatus) => void }) {
  const [strOpen, setStrOpen] = useState(false);
  if (!c) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width={560} title={`Case ${c.id}`}>
      <SheetHeader
        eyebrow={`${c.id} · opened ${relTime(c.at)}`}
        title={<span className="flex items-center gap-3"><Avatar name={c.user.name} initials={c.user.initials} size={34} />{c.user.name}</span>}
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill tone={sevTone[c.severity]}>{c.severity[0].toUpperCase() + c.severity.slice(1)} severity</Pill>
          <Pill tone={statusTone[c.status]}>{statusLabel[c.status]}</Pill>
          <span className="font-mono text-[11px] text-text-tertiary">Assignee: {c.assignee}</span>
        </div>
      </SheetHeader>
      <SheetBody>
        <div className="rounded-[12px] border border-crit/20 bg-crit-fill/60 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary"><FileWarning className="size-4 text-crit" /> Trigger</div>
          <p className="mt-1 text-[13px] text-text-secondary">{c.reason}</p>
          <div className="mt-2 flex gap-6 font-mono text-[12px]">
            <span className="text-text-tertiary">Amount <span className="ml-1 text-text-primary tabular-nums">{inr(c.amount)}</span></span>
            <span className="text-text-tertiary">Related txns <span className="ml-1 text-text-primary tabular-nums">{c.relatedTx}</span></span>
          </div>
        </div>

        <div className="mt-5 eyebrow mb-2">Related transaction graph</div>
        <RelatedGraph user={c.user.initials} n={Math.min(8, c.relatedTx)} />

        <div className="mt-5 eyebrow mb-2">Notes</div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-2/40 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Avatar name={c.assignee} size={26} />
            <div>
              <div className="text-[12.5px] text-text-primary">{c.note}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-text-tertiary">{c.assignee} · {absIST(c.at)}</div>
            </div>
          </div>
        </div>
      </SheetBody>

      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-5 py-4">
        <Button variant="secondary" size="sm" leadingIcon={<Check className="size-3.5" />} onClick={() => { onResolve(c.id, "cleared"); toast("Case cleared", { description: c.id }); onOpenChange(false); }}>Clear</Button>
        <Button variant="ghost" size="sm" onClick={() => { onResolve(c.id, "in_review"); toast("Escalated to MLRO", { description: c.id }); }}>Escalate</Button>
        <Button variant="destructive" size="sm" className="ml-auto" leadingIcon={<Send className="size-3.5" />} onClick={() => setStrOpen(true)}>File STR</Button>
      </div>

      <StrModal open={strOpen} onOpenChange={setStrOpen} c={c} onFiled={() => { onResolve(c.id, "reported"); onOpenChange(false); }} />
    </Sheet>
  );
}

function RelatedGraph({ user, n }: { user: string; n: number }) {
  const R = 62;
  const cx = 90, cy = 78;
  const nodes = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), inb: i % 3 !== 0 };
  });
  return (
    <svg viewBox="0 0 180 156" width="100%" height="156" className="rounded-[12px] border border-border-subtle bg-surface-2/30">
      {nodes.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border-default)" strokeWidth="1" />)}
      {nodes.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={p.inb ? "var(--color-pos)" : "var(--color-neg)"} fillOpacity="0.85" />)}
      <circle cx={cx} cy={cy} r="15" fill="var(--color-brand-fill-strong)" stroke="var(--color-brand)" strokeWidth="1" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" className="fill-brand font-mono text-[9px] font-semibold">{user}</text>
    </svg>
  );
}

function StrModal({ open, onOpenChange, c, onFiled }: { open: boolean; onOpenChange: (v: boolean) => void; c: ComplianceCase; onFiled: () => void }) {
  const [filed, setFiled] = useState<string | null>(null);
  return (
    <Modal open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setFiled(null); }} size="md" title="File Suspicious Transaction Report">
      <div className="border-b border-border-subtle px-5 py-4"><h2 className="font-display text-[16px] font-semibold text-text-primary">File STR · {c.id}</h2></div>
      <div className="px-5 py-5">
        {!filed ? (
          <div className="space-y-3">
            <Field label="Subject" value={c.user.name} />
            <Field label="Ground for suspicion" value={c.reason} />
            <Field label="Amount involved" value={inr(c.amount)} />
            <Field label="Report to" value="FIU-IND" />
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-pos-fill"><Check className="size-6 text-pos" /></span>
            <p className="mt-3 text-[15px] font-semibold text-text-primary">STR submitted</p>
            <p className="mt-1 font-mono text-[13px] text-brand">{filed}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-4">
        {!filed ? (
          <><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="primary" onClick={() => { const ref = `FIU-STR-2026-00${4400 + Math.floor(Math.random() * 99)}`; setFiled(ref); toast("STR filed", { description: ref }); onFiled(); }}>Submit STR</Button></>
        ) : (
          <DialogClose asChild><Button variant="primary">Done</Button></DialogClose>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2.5">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[13px] text-text-primary">{value}</div>
    </div>
  );
}
