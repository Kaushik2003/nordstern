import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { buildChallengeXdr, verifySignedChallenge, networkPassphrase } from '../../lib/walletProof.js';
import { TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';

// Mock the repositories so the service's authorization / uniqueness / replay branches are
// tested in isolation (no DB). The crypto lib itself is exercised for real.
const walletsRepo = {
  findByAddressAnyCustomer: vi.fn(),
  addProven: vi.fn(),
  listForCustomer: vi.fn(),
  listProvenAddresses: vi.fn(),
  remove: vi.fn(),
};
const challengesRepo = {
  create: vi.fn(),
  findActive: vi.fn(),
  consume: vi.fn(),
};

vi.mock('../../repositories/customerWallets.repo.js', () => ({ customerWalletsRepo: walletsRepo }));
vi.mock('../../repositories/customerWalletChallenges.repo.js', () => ({ customerWalletChallengesRepo: challengesRepo }));
vi.mock('../../repositories/customers.repo.js', () => ({ customersRepo: { findById: vi.fn() } }));

// Import AFTER mocks are registered.
const { customerService } = await import('../customer.service.js');

const ALICE = 'alice-id';
const BOB = 'bob-id';

function signChallenge(xdr: string, kp: Keypair, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase(network)) as Transaction;
  tx.sign(kp);
  return tx.toXDR();
}

beforeEach(() => {
  vi.clearAllMocks();
  challengesRepo.consume.mockResolvedValue(true); // default: consumes successfully
});

describe('customerService.createWalletChallenge — global uniqueness at issue time', () => {
  it('issues a challenge for an unclaimed wallet', async () => {
    const kp = Keypair.random();
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue(null);
    challengesRepo.create.mockResolvedValue({});
    const out = await customerService.createWalletChallenge(ALICE, kp.publicKey(), 'testnet');
    expect(out.challengeXdr).toBeTypeOf('string');
    expect(challengesRepo.create).toHaveBeenCalledOnce();
  });

  it('rejects a wallet already bound to ANOTHER customer (409)', async () => {
    const kp = Keypair.random();
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue({ customerId: BOB, address: kp.publicKey() });
    await expect(customerService.createWalletChallenge(ALICE, kp.publicKey(), 'testnet'))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(challengesRepo.create).not.toHaveBeenCalled();
  });

  it('allows re-issuing for the customer\'s OWN wallet (re-verification)', async () => {
    const kp = Keypair.random();
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue({ customerId: ALICE, address: kp.publicKey() });
    challengesRepo.create.mockResolvedValue({});
    await expect(customerService.createWalletChallenge(ALICE, kp.publicKey(), 'testnet')).resolves.toBeTruthy();
  });

  it('rejects a malformed address (400)', async () => {
    await expect(customerService.createWalletChallenge(ALICE, 'not-an-address', 'testnet'))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('customerService.verifyWalletChallenge — proof, replay, uniqueness', () => {
  it('records the proven bond for a valid signature', async () => {
    const kp = Keypair.random();
    const nonce = 'nonce-abc';
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    challengesRepo.findActive.mockResolvedValue({ id: 'ch1', nonce, network: 'testnet' });
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue(null);
    walletsRepo.addProven.mockImplementation((_c, addr) => ({ id: 'w1', address: addr, provenAt: new Date() }));

    const signed = signChallenge(xdr, kp);
    const w = await customerService.verifyWalletChallenge(ALICE, kp.publicKey(), signed, 'Main');
    expect(w).toMatchObject({ id: 'w1' });
    expect(walletsRepo.addProven).toHaveBeenCalledOnce();
    const proof = walletsRepo.addProven.mock.calls[0][4];
    expect(proof).toMatchObject({ proofType: 'signed_challenge', proofNonce: nonce });
  });

  it('rejects when there is no active challenge (expired or never issued)', async () => {
    const kp = Keypair.random();
    challengesRepo.findActive.mockResolvedValue(undefined);
    await expect(customerService.verifyWalletChallenge(ALICE, kp.publicKey(), 'x', null))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(walletsRepo.addProven).not.toHaveBeenCalled();
  });

  it('rejects a signature by the WRONG key (impersonation attempt)', async () => {
    const owner = Keypair.random();
    const attacker = Keypair.random();
    const nonce = 'nonce-xyz';
    const xdr = buildChallengeXdr(owner.publicKey(), nonce, 'testnet');
    challengesRepo.findActive.mockResolvedValue({ id: 'ch1', nonce, network: 'testnet' });
    const signed = signChallenge(xdr, attacker);
    await expect(customerService.verifyWalletChallenge(ALICE, owner.publicKey(), signed, null))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(walletsRepo.addProven).not.toHaveBeenCalled();
  });

  it('rejects a replayed challenge (consume returns false — already used)', async () => {
    const kp = Keypair.random();
    const nonce = 'nonce-replay';
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    challengesRepo.findActive.mockResolvedValue({ id: 'ch1', nonce, network: 'testnet' });
    challengesRepo.consume.mockResolvedValue(false); // lost the race / already consumed
    const signed = signChallenge(xdr, kp);
    await expect(customerService.verifyWalletChallenge(ALICE, kp.publicKey(), signed, null))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(walletsRepo.addProven).not.toHaveBeenCalled();
  });

  it('rejects at write time if the wallet got claimed by another account (TOCTOU, 409)', async () => {
    const kp = Keypair.random();
    const nonce = 'nonce-race';
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    challengesRepo.findActive.mockResolvedValue({ id: 'ch1', nonce, network: 'testnet' });
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue({ customerId: BOB, address: kp.publicKey() });
    const signed = signChallenge(xdr, kp);
    await expect(customerService.verifyWalletChallenge(ALICE, kp.publicKey(), signed, null))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(walletsRepo.addProven).not.toHaveBeenCalled();
  });

  it('is idempotent when re-verifying the customer\'s OWN already-linked wallet', async () => {
    const kp = Keypair.random();
    const nonce = 'nonce-idem';
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    const existing = { id: 'w-existing', customerId: ALICE, address: kp.publicKey() };
    challengesRepo.findActive.mockResolvedValue({ id: 'ch1', nonce, network: 'testnet' });
    walletsRepo.findByAddressAnyCustomer.mockResolvedValue(existing);
    const signed = signChallenge(xdr, kp);
    const w = await customerService.verifyWalletChallenge(ALICE, kp.publicKey(), signed, null);
    expect(w).toBe(existing);
    expect(walletsRepo.addProven).not.toHaveBeenCalled();
  });
});
