// Option lists for the institutional half of Step 1 (see `_display` in
// lib/validations/onboarding.ts). These fields are presentation-only today: an
// institutional signer expects to be asked who they are and what they represent,
// so the form asks — but nothing here is validated, stored, or sent to
// platform-api. Wire them up (schema + payload + admin review) before treating
// any of it as real onboarding data.

export const ENTITY_TYPES = [
  'Private Limited Company',
  'Public Limited Company',
  'Limited Liability Partnership',
  'Partnership Firm',
  'Bank / NBFC',
  'Payment Institution / PSP',
  'Foundation or Trust',
  'Sole Proprietorship',
  'Other',
];

export const INDUSTRIES = [
  'Banking',
  'Non-Banking Financial Company',
  'Payments / PSP',
  'Fintech',
  'Remittance / Money Transfer',
  'Exchange / Brokerage',
  'Treasury & Asset Management',
  'Other',
];

export const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+'];

export const DEPARTMENTS = [
  'Treasury',
  'Finance',
  'Compliance & Risk',
  'Technology / Engineering',
  'Operations',
  'Executive / Board',
  'Other',
];

/** Indicative monthly settlement volume. Copy is INR-first because India is our only live market. */
export const MONTHLY_VOLUMES = [
  'Under ₹10 lakh',
  '₹10 lakh – ₹1 crore',
  '₹1 crore – ₹10 crore',
  '₹10 crore – ₹100 crore',
  'Over ₹100 crore',
];
