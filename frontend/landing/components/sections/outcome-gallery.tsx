"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Clock,
  Fingerprint
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// Card 1: Network Image Card (Left Column)
function ImageCard() {
  return (
    <Card 
      tone="outline" 
      className="group relative overflow-hidden h-[600px] flex flex-col justify-between border-line/60 bg-cover bg-center p-8 text-white bg-[url('/stellar_bg.jpg')]"
    >
      {/* Dimming overlay layers that light up on hover */}
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-500 group-hover:opacity-15 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-0" />


      {/* Main Overlay Text */}
      <div className="relative z-10 flex flex-col gap-2 mt-auto">
        <span className="text-[clamp(4.5rem,7vw,5.5rem)] font-black leading-none tracking-tighter text-white">
          ~5s
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
          Stellar network settlement
        </span>
        <p className="text-xs text-slate-300 leading-relaxed max-w-xs mt-1">
          Deposits mint a Stellar asset; withdrawals redeem it and release fiat — memo-matched, tracked end to end.
        </p>
      </div>
    </Card>
  );
}

// Card 2: Noir Alert Card (Middle Column)
function NoirAlertCard() {
  return (
    <Card 
      tone="surface" 
      className="relative overflow-hidden h-[600px] flex flex-col justify-between border-slate-800 bg-[#0B0D10] text-slate-300 p-8 shadow-2xl"
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">Compliance workflows, built in.</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Verification pipelines powered by Didit. Sanctions, PEP, and identity screening keep every on/off-ramp flow compliant by default.
        </p>
      </div>

      {/* Simulated Live Alert UI (App Mockup style) */}
      <div className="my-auto rounded-3xl border border-white/5 bg-slate-950/60 p-5 overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span></span>
        </div>

        {/* Row 1 (Active/Glowing Purple Alert with white icon box) */}
        <div className="rounded-3xl border border-brand/20 bg-brand text-slate-950 p-3.5 flex items-center justify-between shadow-[0_4px_20px_rgba(171,159,242,0.15)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm shrink-0">
            <Fingerprint className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0 pl-3">
            <p className="text-xs font-bold text-slate-950 truncate">Aarav Sharma</p>
            <p className="text-[10px] text-slate-800 font-medium">Didit Verification</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold text-slate-950 tracking-wider">ACCEPTED</p>
            <p className="text-[9px] text-slate-800 font-semibold">98.4% match</p>
          </div>
        </div>

        {/* Row 2 (Muted Row, Opacity 30%) */}
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-3.5 flex items-center justify-between opacity-30 text-slate-400">
          <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-white/10 shrink-0">
            <img src="/priya_avatar.png" alt="Priya Patel avatar" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 pl-3">
            <p className="text-xs font-bold text-white truncate">Priya Patel</p>
            <p className="text-[10px] text-slate-400 font-medium">Didit Verification</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white">CLEARED</p>
            <p className="text-[9px] text-slate-400 font-medium">0.4s check</p>
          </div>
        </div>

        {/* Row 3 (Faded Row, Opacity 10% representing scrolling queue) */}
        <div className="rounded-3xl border border-white/[0.02] bg-white/[0.01] p-3.5 flex items-center justify-between opacity-[0.08] text-slate-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-white/5 shrink-0">
            <img src="/karan_avatar.png" alt="Karan Singh avatar" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 pl-3">
            <p className="text-xs font-bold text-white truncate">Karan Singh</p>
            <p className="text-[10px] text-slate-500 font-medium">Didit Verification</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">SCREENING</p>
          </div>
        </div>
      </div>

      {/* Bottom slider dots (Replicating reference page's dot, pill, dot indicator) */}
      <div className="flex justify-center items-center gap-2 pb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
        <span className="h-1.5 w-4 rounded-full bg-brand" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
      </div>
    </Card>
  );
}

// Card 3: Column 3 containing stacked Stat & Toggle cards
function StackedRightCards() {
  return (
    <div className="flex flex-col gap-6 h-[600px] justify-between">
      {/* Top Card - Giant Stat Card */}
      <Card 
        tone="outline" 
        className="flex-1 flex flex-col justify-between border-line/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)]"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[clamp(2.5rem,4vw,3.2rem)] font-extrabold tracking-tight text-brand-500 leading-none">
            SEP-24
          </span>
          <span className="text-xs font-bold text-subtle uppercase tracking-widest">
            Interactive deposit and withdrawal
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-line/40 pt-4 mt-4">
          <h4 className="text-lg font-bold text-ink">Protocol-native flows</h4>
          <p className="text-sm text-subtle leading-relaxed">
            Anchor Platform manages wallet authentication and transaction states while your team controls the customer experience.
          </p>
        </div>
      </Card>

      {/* Bottom Card - Active Toggle Card */}
      <Card 
        tone="outline" 
        className="flex-1 flex flex-col justify-between border-line/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)]"
      >
        {/* Settlement-network mark */}
        <div className="flex items-center self-start" aria-hidden="true">
          <span className="size-10 rounded-full bg-brand shadow-[0_6px_18px_rgba(171,159,242,0.32)]" />
          <span className="-ml-3 size-10 rounded-full bg-ink/90 shadow-[0_6px_18px_rgba(11,11,11,0.2)]" />
        </div>

        {/* Text Details */}
        <div className="mt-4">
          <h4 className="text-lg font-bold text-ink mb-1">Event-driven redemptions</h4>
          <p className="text-sm text-subtle leading-relaxed">
            The Stellar Observer matches incoming payments by memo and advances the withdrawal state, ready for your payout adapter.
          </p>
        </div>
      </Card>
    </div>
  );
}

/** 
 * Three-card editorial layout displaying NordStern's core platform capabilities 
 * in an asymmetrical configuration matching the reference image's composition.
 */
export function OutcomeGallery() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {/* Column 1: Image Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.6 }}
        whileHover={{ y: -4 }}
        className="cursor-default h-full"
      >
        <ImageCard />
      </motion.div>

      {/* Column 2: Noir Alert Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.6, delay: 0.15 }}
        whileHover={{ y: -4 }}
        className="cursor-default h-full"
      >
        <NoirAlertCard />
      </motion.div>

      {/* Column 3: Stacked Right Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        transition={{ duration: 0.6, delay: 0.3 }}
        whileHover={{ y: -4 }}
        className="cursor-default h-full"
      >
        <StackedRightCards />
      </motion.div>
    </div>
  );
}
