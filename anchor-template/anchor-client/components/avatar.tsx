'use client';

// Cute, friendly profile avatars. Every customer gets a delightful default assigned
// deterministically from their identity (so it's stable across sessions and devices), and can
// pick a different one in their profile. No letter monograms, no external image services —
// just emoji on a soft tint, fully self-contained.

import { cn } from '@/lib/cn';

// Curated "cute" set — animals + a few friendly faces. Order is stable: the stored value is the
// emoji itself, so reordering this list never remaps anyone's choice.
export const AVATARS = ['🦊', '🐼', '🐧', '🦁', '🐨', '🐸', '🦉', '🐙', '🦄', '🐳', '🦋', '🐷', '🐤', '🐻', '🐰', '🐝'] as const;

// Soft background tints (light/dark friendly). Paired to the seed, independent of the emoji, so
// changing the emoji keeps a person's colour stable and recognisable.
const TINTS = [
  '#EDE9FE', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#E0E7FF',
  '#CCFBF1', '#FEE2E2', '#F3E8FF', '#FFEDD5',
] as const;

// Small, stable string hash (FNV-ish) → non-negative int.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

type AvatarCustomer = { id?: string; email?: string | null; preferences?: Record<string, unknown> | null };

// The emoji a customer should show: their explicit pick, else a stable default from their seed.
export function avatarEmoji(customer: AvatarCustomer): string {
  const picked = customer.preferences?.avatar;
  if (typeof picked === 'string' && (AVATARS as readonly string[]).includes(picked)) return picked;
  const seed = customer.id || customer.email || 'guest';
  return AVATARS[hash(seed) % AVATARS.length];
}

function tintFor(customer: AvatarCustomer): string {
  const seed = customer.id || customer.email || 'guest';
  return TINTS[hash(`tint:${seed}`) % TINTS.length];
}

const SIZES = { sm: 'h-8 w-8 text-base', md: 'h-9 w-9 text-lg', lg: 'h-14 w-14 text-2xl', xl: 'h-20 w-20 text-4xl' } as const;

export function Avatar({ customer, size = 'md', className }: { customer: AvatarCustomer; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full leading-none select-none', SIZES[size], className)}
      style={{ backgroundColor: tintFor(customer) }}
    >
      {avatarEmoji(customer)}
    </span>
  );
}

// Grid picker for the profile. Highlights the current selection.
export function AvatarPicker({ value, onPick }: { value: string; onPick: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {AVATARS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className={cn(
            'grid aspect-square place-items-center rounded-xl border text-xl transition',
            value === e ? 'border-brand bg-brand/10 ring-2 ring-brand/30' : 'border-line hover:border-brand/50 hover:bg-surface',
          )}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
