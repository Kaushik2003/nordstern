import { z } from 'zod';

// ─── NordStern onboarding (business-facing, no Stellar internals) ────────────────
// A business tells us WHO they are and WHAT product they want to run. They never
// touch Stellar keypairs, asset issuance, SEP config, or a KYC vendor — NordStern
// provisions all of that and centrally owns identity verification. Secret payment
// credentials (Razorpay/Cashfree keys) are collected LATER, at invitation redemption
// (post-approval, one-time-token gated) — never in this pre-approval public form.

const publicEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'protonmail.com'];
export const isPublicEmail = (email: string) =>
  publicEmailDomains.some((d) => email.toLowerCase().endsWith(`@${d}`));

// Step 1 — Business Profile. Only registration status/number are optional so a
// business can pick Test Mode and experiment without any legal paperwork.
export const businessProfileSchema = z.object({
  legalEntityName: z.string().min(2, 'Business name is required.'),
  contactPerson: z.string().min(2, 'Contact person is required.'),
  businessEmail: z.string().email('Enter a valid email.'),
  country: z.string().min(1, 'Country is required.'),
  supportedFiat: z.string().min(1, 'Select the fiat currency you settle in.'),
  targetMarkets: z.array(z.string()).min(1, 'Select at least one market.'),
  corporateWebsiteUrl: z
    .string()
    .url('Must be a valid URL (e.g. https://mizupay.io).')
    .optional()
    .or(z.literal('')),
  businessRegistrationStatus: z
    .enum(['registered', 'in_progress', 'not_registered'])
    .optional(),
  companyRegistrationNumber: z.string().optional(),
});

// Step 2 — Product & Rails. `mode` is the Test/Production switch: Test provisions a
// testnet anchor with zero legal gating; Production is a deliberate, counsel-gated
// path (real money) and requires a registration status before it can be approved.
export const productSchema = z
  .object({
    mode: z.enum(['test', 'production']),
    supportedRails: z.array(z.string()).min(1, 'Select at least one payment rail.'),
    minTransactionBound: z.string().min(1, 'Required'),
    maxTransactionBound: z.string().min(1, 'Required'),
    feeArchitectureType: z.enum(['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'], {
      message: 'Please select a fee architecture.',
    }),
    flatFeeValue: z.string().optional(),
    percentageFeeValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
