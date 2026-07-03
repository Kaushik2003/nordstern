import { KycProvider, CustomerQuery, CustomerResult, KycStatus } from './KycProvider.js';

// Mock KYC — always ACCEPTED. The default; preserves the original stub behaviour.
export class MockKycProvider implements KycProvider {
  async getCustomer(q: CustomerQuery): Promise<CustomerResult> {
    return { id: q.id ?? q.account ?? 'stub', status: 'ACCEPTED', fields: {} };
  }
  async putCustomer(params: { id?: string; account?: string }): Promise<{ id: string; status: KycStatus }> {
    return { id: params.id ?? params.account ?? 'stub', status: 'ACCEPTED' };
  }
  async deleteCustomer(): Promise<void> { /* no-op */ }
}
