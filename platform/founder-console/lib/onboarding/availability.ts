// Single source of truth for what NordStern can actually serve today.
//
// The onboarding form and the Zod schema both import from here, so a founder can
// never select an option the schema would reject (and vice versa). Everything not
// marked `available` still renders — dimmed, with a "Soon" chip — because showing
// the roadmap is the point. Flip `available` to true when a market goes live.

export interface Option {
  value: string;
  label: string;
  available: boolean;
}

const live = (value: string, label = value): Option => ({ value, label, available: true });
const soon = (value: string, label = value): Option => ({ value, label, available: false });

export const COUNTRIES: Option[] = [
  live('India'),
  soon('United States'),
  soon('United Kingdom'),
  soon('Singapore'),
  soon('Brazil'),
  soon('Nigeria'),
  soon('Germany'),
];

export const MARKETS: Option[] = [
  live('India'),
  soon('United States'),
  soon('Brazil'),
  soon('Nigeria'),
  soon('European Union'),
  soon('Singapore'),
  soon('Mexico'),
];

export const FIAT: Option[] = [
  live('INR', 'INR — Indian Rupee'),
  soon('USD', 'USD — US Dollar'),
  soon('EUR', 'EUR — Euro'),
  soon('BRL', 'BRL — Brazilian Real'),
  soon('NGN', 'NGN — Nigerian Naira'),
  soon('SGD', 'SGD — Singapore Dollar'),
];

export const RAILS: Option[] = [
  live('UPI (India)'),
  live('IMPS / Bank Transfer (India)'),
  soon('Pix (Brazil)'),
  soon('ACH / FedWire (US)'),
  soon('SEPA (Europe)'),
  soon('Mobile Money (Africa)'),
];

export const MODES: Option[] = [live('test', 'Test Mode'), soon('production', 'Production')];

/** The one country/currency we serve today — used for defaults and error copy. */
export const LIVE_COUNTRY = 'India';
export const LIVE_FIAT = 'INR';

export const isAvailable = (options: Option[], value: string): boolean =>
  options.some((o) => o.value === value && o.available);

export const allAvailable = (options: Option[], values: string[]): boolean =>
  values.every((v) => isAvailable(options, v));

/** Shared copy so the banner, the tooltips and the validation errors stay in sync. */
export const EXPANDING_SOON = "We're live in India today. We're expanding to other countries soon.";
export const COMING_SOON_LABEL = 'Soon';
