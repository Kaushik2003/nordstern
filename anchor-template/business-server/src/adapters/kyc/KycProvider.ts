// ─── KYC seam (SEP-12) ─────────────────────────────────────────────────────────
// The business server delegates SEP-12 customer decisions to a KycProvider. A
// mock is the default; real vendors (Surepass, HyperVerge, …) implement this
// interface without leaking into core flow logic. We store only the verification
// OUTCOME, never raw PAN/Aadhaar (COMPLIANCE Q5 — minimal PII).

export type KycStatus = 'ACCEPTED' | 'PROCESSING' | 'NEEDS_INFO' | 'REJECTED';

export interface CustomerQuery {
  id?: string;
  account?: string;
  memo?: string;
  type?: string;
}

export interface CustomerResult {
  id: string;
  status: KycStatus;
  fields?: Record<string, unknown>;
  message?: string;
}

export interface KycProvider {
  /** SEP-12 GET /customer — current verification status. */
  getCustomer(q: CustomerQuery): Promise<CustomerResult>;
  /** SEP-12 PUT /customer — submit/refresh KYC data; kicks off verification. */
  putCustomer(params: { id?: string; account?: string; fields: Record<string, any> }): Promise<{ id: string; status: KycStatus }>;
  /** SEP-12 DELETE /customer/:id */
  deleteCustomer(id: string): Promise<void>;
}
