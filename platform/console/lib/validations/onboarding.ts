import { z } from 'zod';

const publicEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'protonmail.com'];

export const companyProfileSchema = z.object({
  legalEntityName: z.string().min(2, 'Legal entity name is required.'),
  corporateWebsiteUrl: z.string().url('Must be a valid URL (e.g. https://nexuspay.io).'),
  countryOfIncorporation: z.string().min(1, 'Country is required.'),
  businessEmail: z.string().email('Invalid email.'),
  targetCorridors: z.array(z.string()).min(1, 'Select at least one target market.'),
});

export const stellarConfigSchema = z.object({
  targetAssetCode: z.string()
    .min(1, 'Asset code required.')
    .max(12, 'Cannot exceed 12 characters.')
    .transform(val => val.toUpperCase()),
  assetType: z.enum(['AlphaNum4', 'AlphaNum12'], { 
    message: 'Please select an asset type.'
  }),
  issuerPublicKey: z.string().regex(/^G[A-Z2-7]{55}$/, 'Must be a valid 56-character Stellar public key starting with G.'),
  distributionPublicKey: z.string().regex(/^G[A-Z2-7]{55}$/, 'Must be a valid 56-character Stellar public key starting with G.'),
  sep10SigningPublicKey: z.string().regex(/^G[A-Z2-7]{55}$/, 'Must be a valid 56-character Stellar public key starting with G.'),
  keyGenerationMode: z.enum(['auto', 'manual']),
  hasBackedUpKeys: z.boolean().optional(),
}).refine(data => {
  if (data.keyGenerationMode === 'auto' && !data.hasBackedUpKeys) return false;
  return true;
}, { message: 'You must acknowledge that you have backed up your Secret Keys.', path: ['hasBackedUpKeys'] });

export const paymentRailsSchema = z.object({
  supportedRails: z.array(z.string()).min(1, 'Select at least one payment rail.'),
  minTransactionBound: z.string().min(1, 'Required'),
  maxTransactionBound: z.string().min(1, 'Required'),
  feeArchitectureType: z.enum(['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'], {
    message: 'Please select a fee architecture.'
  }),
  flatFeeValue: z.string().optional(),
  percentageFeeValue: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.feeArchitectureType === 'Flat Fee Only' || data.feeArchitectureType === 'Hybrid Fee (Flat + %)') {
    if (!data.flatFeeValue || data.flatFeeValue.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: ['flatFeeValue'],
      });
    }
  }
  if (data.feeArchitectureType === 'Percentage Fee Only' || data.feeArchitectureType === 'Hybrid Fee (Flat + %)') {
    if (!data.percentageFeeValue || data.percentageFeeValue.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: ['percentageFeeValue'],
      });
    }
  }
});

export const complianceSchema = z.object({
  financialRegulatoryStatus: z.enum([
    'Fully Licensed - Holds an active MSB, MTL, EMI, or equivalent domestic license.',
    'Authorized Agent - Operating under an umbrella agreement with a licensed sponsor bank.',
    'In-Progress - Application submitted to regional regulators, pending final approval.'
  ], {
    message: 'Please select your regulatory status.'
  }),
  kycProvider: z.enum(['Sumsub', 'Persona', 'Trulioo', 'Veriff', 'In-House / Custom API'], {
    message: 'Please select a KYC provider.'
  }),
  verificationFields: z.array(z.string()).min(1, 'Select at least one required field.'),
});

export const reviewSubmitSchema = z.object({
  tenantServerUrl: z.string().url('Must be a valid URL (e.g. https://api.yourcompany.com).'),
  webhookSigningToken: z.string().min(1)
});

export const onboardingSchema = z.object({
  companyProfile: companyProfileSchema,
  stellarConfig: stellarConfigSchema,
  paymentRails: paymentRailsSchema,
  compliance: complianceSchema,
  reviewSubmit: reviewSubmitSchema,
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
