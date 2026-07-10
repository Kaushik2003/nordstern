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

// Result of starting an interactive verification session (SEP-24 webview / customer app).
// `url` is where the user completes verification; a mock provider returns the caller's
// return URL because it auto-accepts and there is nothing to complete.
export interface KycSessionResult {
  url: string;
  sessionToken?: string;
  status: KycStatus;
}

export interface KycProvider {
  /** SEP-12 GET /customer — current verification status. */
  getCustomer(q: CustomerQuery): Promise<CustomerResult>;
  /** SEP-12 PUT /customer — submit/refresh KYC data; kicks off verification. */
  putCustomer(params: { id?: string; account?: string; fields: Record<string, any> }): Promise<{ id: string; status: KycStatus }>;
  /** SEP-12 DELETE /customer/:id */
  deleteCustomer(id: string): Promise<void>;
  /**
   * Current verification status for a subject (Stellar account or customer id).
   * This is the SEP-24 money gate — release is refused unless it returns ACCEPTED.
   */
  getStatus(subject: string): Promise<KycStatus>;
  /**
   * Begin (or reuse) an interactive verification session. `returnUrl` is where the
   * provider should send the user back after verifying (falls back to the SEP-24
   * interactive page). Mock auto-accepts and returns immediately.
   */
  startSession(subject: string, transactionId?: string, returnUrl?: string): Promise<KycSessionResult>;
}
