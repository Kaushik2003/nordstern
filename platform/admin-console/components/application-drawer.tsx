'use client';

import * as React from 'react';
import { Badge, Button, cn } from '@nordstern/shared-ui';
import {
  Building2, Check, Copy, CreditCard, Hash, Loader2, Mail, Percent, Ticket, X,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { Field, StatusBadge } from '@/components/primitives';

// The submitted application payload is open JSONB (docs: profile + product are the
// founder wizard output). We render the KNOWN fields in premium, grouped cards and
// then sweep up anything else into "Additional details" so nothing submitted is ever
// hidden — the raw blob stays available as a collapsible fallback.

export interface Application {
  id: string;
  profile: Record<string, any>;
  product: Record<string, any>;
  status: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  applicationId: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

// Humanized labels for the persisted fields. Anything not here is caught by the
// "Additional details" sweep, so adding a backend field never silently drops it.
const PROFILE_LABELS: Record<string, string> = {
  legalEntityName: 'Legal entity',
  contactPerson: 'Contact person',
  businessEmail: 'Business email',
  country: 'Country',
  supportedFiat: 'Settlement currency',
  targetMarkets: 'Target markets',
  corporateWebsiteUrl: 'Website',
  businessRegistrationStatus: 'Registration status',
  companyRegistrationNumber: 'Registration number',
};

const PRODUCT_LABELS: Record<string, string> = {
  mode: 'Mode',
  supportedRails: 'Payment rails',
  minTransactionBound: 'Min transaction',
  maxTransactionBound: 'Max transaction',
  feeArchitectureType: 'Fee architecture',
  flatFeeValue: 'Flat fee',
  percentageFeeValue: 'Percentage fee',
};

const ENUM_LABELS: Record<string, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  not_registered: 'Not registered',
  test: 'Test',
  production: 'Production',
};

const isEmpty = (v: unknown) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Turn a persisted value into premium display markup (chips, links, humanized enums). */
function renderValue(key: string, value: any): React.ReactNode {
  if (isEmpty(value)) return <span className="text-muted-foreground/70">Not provided</span>;

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <Badge key={String(v)} variant="outline" className="font-normal">{String(v)}</Badge>
        ))}
      </div>
    );
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const str = String(value);
  if (key === 'corporateWebsiteUrl' || /^https?:\/\//.test(str)) {
    return (
      <a href={str} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">
        {str.replace(/^https?:\/\//, '')}
      </a>
    );
  }
  if (key === 'businessEmail') {
    return <a href={`mailto:${str}`} className="text-brand hover:underline break-all">{str}</a>;
  }
  return ENUM_LABELS[str] ?? str;
}

/** A grouped, titled card of label/value rows — matches the console's detail idiom. */
function CardSection({ icon: Icon, title, hint, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 py-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface/70 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4">{children}</dl>
    </section>
  );
}

/** Render every non-empty key from a payload, in a preferred label order, then leftovers. */
function payloadFields(payload: Record<string, any>, labels: Record<string, string>) {
  const seen = new Set(Object.keys(labels));
  const ordered = Object.keys(labels).filter((k) => k in (payload ?? {}));
  const extra = Object.keys(payload ?? {}).filter((k) => !seen.has(k));
  return [...ordered, ...extra].filter((k) => !isEmpty(payload?.[k]));
}

function humanizeKey(key: string): string {
  const s = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** An approved application's invitation can be redeemed, still waiting, or lapsed. */
function inviteState(invite: Invitation | undefined) {
  if (!invite) return null;
  if (invite.usedAt) return <Badge variant="success">Redeemed</Badge>;
  if (new Date(invite.expiresAt) < new Date()) return <Badge variant="warning">Invite expired</Badge>;
  return <Badge variant="outline">Awaiting redemption</Badge>;
}

export function ApplicationDrawer({
  app, invite, busy, onApprove, onReject, onClose,
}: {
  app: Application;
  invite?: Invitation;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Enter animation on mount; exit runs on `requestClose` before unmounting.
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = React.useCallback(() => {
    setOpen(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  // Escape to close + lock the underlying page scroll while the drawer is up.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [requestClose]);

  async function copyId() {
    await navigator.clipboard.writeText(app.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const p = app.profile ?? {};
  const prod = app.product ?? {};
  const mode = prod.mode ?? 'test';
  const name = p.legalEntityName || 'Unnamed business';
  const monogram = (p.legalEntityName || '?').trim().charAt(0).toUpperCase();

  const profileKeys = payloadFields(p, PROFILE_LABELS).filter((k) => k !== 'legalEntityName');
  // Product & fees split so the fee card reads as its own thing.
  const feeKeys = ['feeArchitectureType', 'flatFeeValue', 'percentageFeeValue'].filter((k) => !isEmpty(prod[k]));
  const productKeys = payloadFields(prod, PRODUCT_LABELS).filter((k) => !feeKeys.includes(k));

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim */}
      <div
        onClick={requestClose}
        className={cn(
          'absolute inset-0 bg-noir/50 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Application details for ${name}`}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-[540px] flex-col border-l border-line bg-background shadow-2xl',
          'transition-transform duration-300 ease-out will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line px-5 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-800 text-lg font-semibold text-white shadow-sm">
            {monogram}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold leading-tight">{name}</h2>
            {p.businessEmail && (
              <p className="truncate text-sm text-muted-foreground">{p.businessEmail}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={app.status} />
              <Badge variant={mode === 'production' ? 'warning' : 'outline'}>{mode}</Badge>
              {inviteState(invite)}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={requestClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 divide-y divide-line overflow-y-auto">
          <CardSection icon={Building2} title="Business profile">
            {profileKeys.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">No further profile details submitted.</p>
            )}
            {profileKeys.map((k) => (
              <Field key={k} label={PROFILE_LABELS[k] ?? humanizeKey(k)}>{renderValue(k, p[k])}</Field>
            ))}
          </CardSection>

          {productKeys.length > 0 && (
            <CardSection icon={CreditCard} title="Product & rails">
              {productKeys.map((k) => (
                <Field key={k} label={PRODUCT_LABELS[k] ?? humanizeKey(k)}>{renderValue(k, prod[k])}</Field>
              ))}
            </CardSection>
          )}

          {feeKeys.length > 0 && (
            <CardSection icon={Percent} title="Fee structure">
              {feeKeys.map((k) => (
                <Field key={k} label={PRODUCT_LABELS[k] ?? humanizeKey(k)}>{renderValue(k, prod[k])}</Field>
              ))}
            </CardSection>
          )}

          {invite && (
            <CardSection icon={Ticket} title="Invitation">
              <Field label="Sent to">{invite.email}</Field>
              <Field label="Status">{inviteState(invite)}</Field>
              <Field label="Expires">{formatDateTime(invite.expiresAt)}</Field>
              <Field label="Redeemed">{invite.usedAt ? formatDateTime(invite.usedAt) : 'Not yet'}</Field>
            </CardSection>
          )}

          <CardSection icon={Hash} title="Metadata">
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Application ID</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="truncate font-mono text-xs">{app.id}</code>
                <button
                  onClick={copyId}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-surface/70"
                >
                  {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
            <Field label="Submitted">{formatDateTime(app.createdAt)}</Field>
          </CardSection>

          {/* Raw payload — the guarantee that nothing submitted is unreachable. */}
          <div className="px-5 py-5">
            <details className="group rounded-lg border border-line bg-surface/50">
              <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Raw submission (JSON)
              </summary>
              <pre className="max-h-72 overflow-auto border-t border-line px-3 py-3 text-[11px] leading-relaxed">
                {JSON.stringify({ profile: p, product: prod }, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        {/* Footer actions — only for a pending application. */}
        {app.status === 'applied' && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
            <Button variant="outline" disabled={busy} onClick={onReject} className="hover:bg-destructive hover:text-white hover:border-destructive transition-colors duration-200">Reject</Button>
            <Button disabled={busy} onClick={onApprove} className="bg-brand text-white hover:bg-success hover:text-white transition-colors duration-200">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve application'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
