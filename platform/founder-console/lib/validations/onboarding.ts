import { z } from 'zod';
import {
  COUNTRIES,
  EXPANDING_SOON,
  FIAT,
  LIVE_FIAT,
  MARKETS,
  RAILS,
  allAvailable,
  isAvailable,
} from '@/lib/onboarding/availability';

// ─── NordStern onboarding (business-facing, no Stellar internals) ────────────────
// A business tells us WHO they are and WHAT product they want to run. They never
// touch Stellar keypairs, asset issuance, SEP config, or a KYC vendor — NordStern
// provisions all of that and centrally owns identity verification. Secret payment
// credentials (Razorpay/Cashfree keys) are collected LATER, at invitation redemption
// (post-approval, one-time-token gated) — never in this pre-approval public form.
//
// Availability gating: the form renders every country/market/rail but only lets a
// founder pick the ones NordStern serves today. These refinements are the backstop —
// they reject anything the UI shouldn't have allowed through in the first place.

const publicEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'protonmail.com'];
export const isPublicEmail = (email: string) =>
  publicEmailDomains.some((d) => email.toLowerCase().endsWith(`@${d}`));

// Step 1 — Business Profile. Only registration status/number are optional so a
// business can pick Test Mode and experiment without any legal paperwork.
export const businessProfileSchema = z.object({
  legalEntityName: z.string().min(2, 'Business name is required.'),
  contactPerson: z.string().min(2, 'Contact person is required.'),
  businessEmail: z.string().email('Enter a valid email.'),
  country: z
    .string()
    .min(1, 'Country is required.')
    .refine((c) => isAvailable(COUNTRIES, c), EXPANDING_SOON),
  supportedFiat: z
    .string()
    .min(1, 'Select the fiat currency you settle in.')
    .refine((f) => isAvailable(FIAT, f), `${LIVE_FIAT} is the only settlement currency available today.`),
  targetMarkets: z
    .array(z.string())
    .min(1, 'Select at least one market.')
    .refine((m) => allAvailable(MARKETS, m), EXPANDING_SOON),
  corporateWebsiteUrl: z
    .string()
    .url('Must be a valid URL (e.g. https://mizupay.io).')
    .optional()
    .or(z.literal('')),
  // The select's placeholder submits `''`, which an optional enum rejects — accept it
  // the same way the optional URL above does, or the whole step fails validation.
  businessRegistrationStatus: z
    .enum(['registered', 'in_progress', 'not_registered'])
    .optional()
    .or(z.literal('')),
  companyRegistrationNumber: z.string().optional(),
});

// Step 2 — Product & Rails. `mode` stays a two-value enum so the wire contract with
// platform-api is unchanged, but only `test` can be submitted today: Production is
// shown as "coming soon" and rejected here as a backstop. Test provisions a testnet
// anchor with zero legal gating.
export const productSchema = z
  .object({
    mode: z.enum(['test', 'production']),
    supportedRails: z
      .array(z.string())
      .min(1, 'Select at least one payment rail.')
      .refine((r) => allAvailable(RAILS, r), 'One of the rails you picked is not available yet.'),
    minTransactionBound: z.string().min(1, 'Required'),
    maxTransactionBound: z.string().min(1, 'Required'),
    feeArchitectureType: z.enum(['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'], {
      message: 'Please select a fee architecture.',
    }),
    flatFeeValue: z.string().optional(),
    percentageFeeValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== 'test') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Production is coming soon. Test Mode is available today.',
        path: ['mode'],
      });
    }
    if (data.feeArchitectureType === 'Flat Fee Only' || data.feeArchitectureType === 'Hybrid Fee (Flat + %)') {
      if (!data.flatFeeValue || data.flatFeeValue.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['flatFeeValue'] });
      }
    }
    if (data.feeArchitectureType === 'Percentage Fee Only' || data.feeArchitectureType === 'Hybrid Fee (Flat + %)') {
      if (!data.percentageFeeValue || data.percentageFeeValue.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['percentageFeeValue'] });
      }
    }
  });

export const onboardingSchema = z.object({
  companyProfile: businessProfileSchema,
  product: productSchema,
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

// ─── Presentation-only fields ───────────────────────────────────────────────────
// An institutional signer expects to be asked their designation, their department,
// the entity type they represent. We ask, because a form that doesn't looks like a
// toy — but none of it is validated, persisted, or sent to platform-api yet.
//
// They live under a TOP-LEVEL `_display` key, outside `onboardingSchema`, so
// react-hook-form carries them across step navigation while zod strips them from
// the submitted payload. The register page also whitelists `companyProfile` and
// `product` explicitly when it POSTs, so this can't leak by accident.
//
// To make any of these real: move the field into `businessProfileSchema`, add it to
// the POST body, and teach admin-console to display it.
export interface DecorativeProfile {
  entityType: string;
  industry: string;
  companySize: string;
  designation: string;
  department: string;
  workPhone: string;
  signingAuthority: boolean;
  expectedMonthlyVolume: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  yearOfIncorporation: string;
  lei: string;
  taxId: string;
  dba: string;
  linkedInProfile: string;
  nationality: string;
  buildingName: string;
  landmark: string;
  registrationDocument: string;
  issuingAuthority: string;
  primaryBank: string;
  sourceOfFunds: string;
  regulatoryLicenses: string;
  complianceOfficer: string;
  integrationType: string;
  techStack: string;
  kycTier: string;
  settlementSla: string;
  autoSweep: boolean;
}

/** What the form holds in memory. What we submit is `OnboardingFormValues`. */
export type OnboardingFormState = OnboardingFormValues & {
  _display?: Partial<DecorativeProfile>;
};
