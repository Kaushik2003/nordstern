'use client';

// Ecosystem trust layer. The Anchor is the primary brand; NordStern is the infrastructure
// provider (think "Powered by Stripe"), DIDIT is the identity provider. These marks and badges
// express that hierarchy subtly and consistently — never as advertising, never louder than the
// anchor's own brand. All customer-language: no SEP/blockchain terms.

import { useState } from 'react';
import { ShieldCheck, X, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_IS_MAINNET === 'true';
export const ENVIRONMENT = IS_PRODUCTION ? 'Production' : 'Sandbox';

// ── Provider logos (mark + wordmark lockups) ──────────────────────────────────────
// Real logos, not plain text: NordStern uses its bundled mark; Stellar uses its official
// logo path; DIDIT uses its brand mark. Used inline as "powered by <logo>" attributions.

// NordStern — bundled logo mark + wordmark.
export function NordSternMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 align-middle', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/nordstern-mark.png" alt="" aria-hidden className="inline-block h-[1.15em] w-[1.15em] rounded-[3px] object-contain" />
      <span className="font-semibold tracking-tight text-ink">Nord<span className="text-brand-deep">Stern</span></span>
    </span>
  );
}

// DIDIT — brand mark (rounded check badge) + wordmark.
export function DiditMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)}>
      <svg viewBox="0 0 24 24" className="h-[1.15em] w-[1.15em]" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path d="M7 12.4l3 3 7-7.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-bold tracking-tight text-ink">didit</span>
    </span>
  );
}

// Stellar — official logo mark (two-swoosh rocket) + wordmark.
export function StellarMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)}>
      <svg viewBox="0 0 236.36 200" className="h-[1em] w-[1.18em]" aria-hidden fill="currentColor">
        <path d="M203,26.16l-28.46,14.5-137.43,70a82.49,82.49,0,0,1-.7-10.69A81.87,81.87,0,0,1,158.2,28.6l16.29-8.3,2.43-1.24A100,100,0,0,0,18.18,100q0,3.82.29,7.61a18.19,18.19,0,0,1-9.88,17.58L0,129.57V150l25.29-12.89,0,0,8.19-4.18,8.07-4.11v0L186.43,55l16.28-8.29,33.65-17.15V9.14Z" />
        <path d="M236.36,50,49.78,145,33.5,153.31,0,170.38v20.41l33.27-16.95,28.46-14.5L199.3,89.24A83.45,83.45,0,0,1,200,100,81.87,81.87,0,0,1,78.09,171.36l-1,.53-17.66,9A100,100,0,0,0,218.18,100c0-2.57-.1-5.14-.29-7.68a18.2,18.2,0,0,1,9.87-17.58l8.6-4.38Z" />
      </svg>
      <span className="font-semibold tracking-tight text-ink">Stellar</span>
    </span>
  );
}

// ── "Provisioned by NordStern" trust badge (for the nav rail / header) ──────────
export function ProvisionedByNordStern({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="group flex items-center gap-1.5 text-[11px] text-faint transition hover:text-muted">
        <span>{compact ? 'Provisioned by' : 'Financial infrastructure by'}</span>
        <NordSternMark className="text-[11px]" />
        <Info className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
      </button>
      {open && <NordSternModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ── "What is NordStern" modal ──────────────────────────────────────────────────
function NordSternModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-canvas p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <NordSternMark className="text-lg" />
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          NordStern is the financial infrastructure that powers this app. It provides the secure
          rails for buying and selling, identity verification, and payment settlement, so the
          service you’re using can focus on its product.
        </p>
        <div className="mt-4 space-y-2">
          <Row label="Your service" value="This app, its brand, and support" />
          <Row label="Infrastructure" value="NordStern — rails, security, settlement" />
          <Row label="Identity" value="DIDIT — verifies you once, reused across participating services" />
        </div>
        <button onClick={onClose} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white transition hover:opacity-90">Got it</button>
      </div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface/60 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

// ── Verification card — the informative KYC surface (dashboard + profile) ────────
type KycStatus = 'unverified' | 'pending' | 'approved' | 'declined' | string;

export function VerificationCard({ status, onAction }: { status: KycStatus; onAction?: () => void }) {
  const approved = status === 'approved';
  const pending = status === 'pending';
  const declined = status === 'declined';

  return (
    <div className={cn(
      'rounded-2xl border p-6',
      approved ? 'border-line bg-canvas'
        : declined ? 'border-[var(--color-danger)]/30 bg-canvas'
        : 'border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)]/25',
    )}>
      <div className="flex items-start gap-4">
        <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
          approved ? 'bg-[var(--color-success-bg)]' : 'bg-canvas')}>
          {approved ? <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" /> : <ShieldCheck className="h-6 w-6 text-[var(--color-warning)]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-ink">
              {approved ? 'Verified for the NordStern Network' : 'Identity Verification'}
            </p>
            {approved
              ? <Badge tone="success">✓ Verified by DIDIT</Badge>
              : <Badge tone={declined ? 'danger' : 'warning'}>{pending ? 'In review' : declined ? 'Action needed' : 'Required'}</Badge>}
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {approved
              ? 'You can buy and sell here, and across other participating services provisioned through NordStern, without verifying again.'
              : pending
                ? 'Handled securely by DIDIT. We’ll let you know the moment your verification clears.'
                : 'Handled securely by DIDIT. A one-time check that lets you buy and sell here and across participating NordStern-powered services.'}
          </p>

          {/* Provider lockup */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-faint">
            <span>Identity by</span>
            <DiditMark />
            <span aria-hidden>·</span>
            <span>Network by</span>
            <NordSternMark className="text-[11px]" />
          </div>

          {!approved && onAction && (
            <button onClick={onAction} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:opacity-90">
              {declined ? 'Try again' : pending ? 'Check status' : 'Start verification'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Infrastructure section (Profile) ────────────────────────────────────────────
export function InfrastructureSection({ anchorName }: { anchorName: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas">
      <div className="border-b border-line px-5 py-3">
        <p className="text-[13px] font-semibold text-ink">Infrastructure</p>
        <p className="text-xs text-muted">How this service is built, for your transparency.</p>
      </div>
      <div className="divide-y divide-line">
        <InfraRow label="Service" value={anchorName} note="The app you’re using" />
        <InfraRow label="Provisioned by" value={<NordSternMark />} note="Financial infrastructure" />
        <InfraRow label="Identity provider" value={<DiditMark />} note="Verifies you once, reused across services" />
        <InfraRow label="Environment" value={<Badge tone={IS_PRODUCTION ? 'success' : 'info'}>{ENVIRONMENT}</Badge>} />
      </div>
    </div>
  );
}
function InfraRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {note && <p className="text-[11px] text-muted">{note}</p>}
      </div>
      <div className="text-right text-sm text-ink">{value}</div>
    </div>
  );
}

// ── Small inline trust chips (Buy/Sell flows) ───────────────────────────────────
export function TrustChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-[11px] text-faint">
          <CheckCircle2 className="h-3 w-3 text-[var(--color-success)]" /> {t}
        </span>
      ))}
    </div>
  );
}
