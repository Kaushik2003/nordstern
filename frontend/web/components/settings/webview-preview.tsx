"use client";

import { BrandMark } from "@/components/brand/mark";
import { ShieldCheck } from "lucide-react";

/** A live preview of the end-user SEP-24 deposit webview, themed by the
 *  operator's accent + logo, rendered in a phone frame. */
export function WebviewPreview({ accent, brandName }: { accent: string; brandName: string }) {
  return (
    <div className="mx-auto w-[260px]">
      <div className="relative rounded-[34px] border-[7px] border-[#2a2833] bg-base shadow-lg">
        <div className="absolute left-1/2 top-2 z-10 h-1 w-14 -translate-x-1/2 rounded-full bg-[#2a2833]" />
        <div className="h-[500px] overflow-hidden rounded-[27px]">
          {/* webview content */}
          <div className="flex h-full flex-col" style={{ background: "linear-gradient(180deg, rgba(171,159,242,0.06), transparent 40%)" }}>
            <div className="flex items-center gap-2 px-4 pb-3 pt-6">
              <BrandMark size={20} />
              <span className="text-[13px] font-semibold text-text-primary">{brandName}</span>
              <span className="ml-auto rounded-full px-2 py-0.5 font-mono text-[9px]" style={{ background: `${accent}22`, color: accent }}>SECURE</span>
            </div>

            <div className="flex-1 px-4">
              <div className="eyebrow mb-1">Deposit amount</div>
              <div className="rounded-[14px] border border-border-default bg-surface-2 px-3 py-3">
                <div className="font-mono text-[26px] font-semibold tabular-nums text-text-primary">₹2,000</div>
                <div className="mt-0.5 font-mono text-[10.5px] text-text-tertiary">≈ 2,000.00 INRT</div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {["₹500", "₹1,000", "₹2,000"].map((p) => (
                  <span key={p} className="flex-1 rounded-[8px] py-1.5 text-center font-mono text-[11px]" style={{ background: `${accent}1a`, color: accent }}>{p}</span>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2.5 rounded-[12px] border border-border-subtle bg-surface-1 px-3 py-2.5">
                  <ShieldCheck className="size-4" style={{ color: accent }} />
                  <div className="text-[11.5px] text-text-secondary">KYC verified · liveness ✓</div>
                </div>
                <div className="flex items-center gap-2.5 rounded-[12px] border border-border-subtle bg-surface-1 px-3 py-2.5">
                  <span className="grid size-5 place-items-center rounded-[6px] text-[9px] font-bold" style={{ background: accent, color: "#15131f" }}>U</span>
                  <div className="text-[11.5px] text-text-secondary">Pay via UPI · Razorpay</div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid place-items-center rounded-full py-3 text-[13px] font-semibold" style={{ background: accent, color: "#15131f" }}>
                Continue
              </div>
              <div className="mt-2 text-center font-mono text-[9px] text-text-tertiary">Powered by NordStern · Testnet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
