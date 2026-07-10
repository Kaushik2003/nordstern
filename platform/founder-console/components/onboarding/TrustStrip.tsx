'use client';

import { Lock, KeyRound, UserCheck } from 'lucide-react';

// Every claim here must be literally true of the register flow as it exists today.
// Do not add encryption-at-rest, certification, or compliance claims we can't back.
const ASSURANCES = [
  { icon: Lock, text: 'Sent over an encrypted connection' },
  { icon: KeyRound, text: 'No payment keys or secrets are collected on this page' },
  { icon: UserCheck, text: 'Every application is reviewed manually' },
];

export function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-8 border-t border-line pt-6 pb-8">
      {ASSURANCES.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-2 text-xs text-subtle">
          <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
