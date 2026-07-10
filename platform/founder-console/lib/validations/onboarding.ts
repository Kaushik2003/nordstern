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
// The asset the anchor issues/settles. A founder either picks a well-known asset (USDC/EURC)
// or names a custom token. The Stellar asset code is 1–12 alphanumerics; for presets it's the
// symbol itself. This is what previously got silently derived from the business name.
export const PRESET_ASSETS = [
  { type: 'USDC', code: 'USDC', name: 'USD Coin' },
  { type: 'EURC', code: 'EURC', name: 'Euro Coin' },
] as const;

export const productSchema = z
  .object({
    mode: z.enum(['test', 'production']),
    assetType: z.enum(['USDC', 'EURC', 'custom'], { message: 'Choose the asset your anchor issues.' }),
    assetCode: z.string().optional(),
    assetName: z.string().optional(),
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
    // Custom asset requires a valid Stellar asset code (1–12 letters/digits).
    if (data.assetType === 'custom') {
      const code = (data.assetCode ?? '').trim();
      if (!code) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a token code.', path: ['assetCode'] });
      } else if (!/^[A-Za-z0-9]{1,12}$/.test(code)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '1–12 letters or digits only.', path: ['assetCode'] });
      }
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

// Resolve the final { code, name } from the product form, whichever path was chosen.
export function resolveAsset(product: { assetType?: string; assetCode?: string; assetName?: string }): { code: string; name: string } {
  const preset = PRESET_ASSETS.find((p) => p.type === product.assetType);
  if (preset) return { code: preset.code, name: preset.name };
  const code = (product.assetCode ?? '').trim().toUpperCase();
  return { code, name: (product.assetName ?? '').trim() || code };
}

export const onboardingSchema = z.object({
  companyProfile: businessProfileSchema,
  product: productSchema,
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
