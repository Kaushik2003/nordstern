import { describe, it, expect } from 'vitest';
import { Account, Keypair, Networks, TransactionBuilder, Operation, Transaction } from '@stellar/stellar-sdk';
import { buildChallengeXdr, verifySignedChallenge, newNonce, networkPassphrase } from '../walletProof.js';

// Sign a challenge XDR with a keypair, the way a wallet would (over the tx hash).
function sign(xdr: string, kp: Keypair, network: 'testnet' | 'mainnet'): string {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase(network)) as Transaction;
  tx.sign(kp);
  return tx.toXDR();
}

describe('walletProof — ownership challenge', () => {
  it('accepts a challenge signed by the address under proof (happy path)', () => {
    const kp = Keypair.random();
    const nonce = newNonce();
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    const signed = sign(xdr, kp, 'testnet');
    expect(verifySignedChallenge(signed, kp.publicKey(), nonce, 'testnet')).toBe(true);
  });

  it('rejects a signature from a DIFFERENT key (cannot claim a wallet you do not own)', () => {
    const owner = Keypair.random();
    const attacker = Keypair.random();
    const nonce = newNonce();
    const xdr = buildChallengeXdr(owner.publicKey(), nonce, 'testnet');
    // Attacker signs a challenge built for the owner's address.
    const signed = sign(xdr, attacker, 'testnet');
    expect(verifySignedChallenge(signed, owner.publicKey(), nonce, 'testnet')).toBe(false);
  });

  it('rejects when the expected nonce differs from the one in the signed tx (replay of another challenge)', () => {
    const kp = Keypair.random();
    const nonce = newNonce();
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    const signed = sign(xdr, kp, 'testnet');
    // Server checks against a DIFFERENT (e.g. current) nonce.
    expect(verifySignedChallenge(signed, kp.publicKey(), newNonce(), 'testnet')).toBe(false);
  });

  it('rejects a tampered transaction (attacker substitutes a nonce the server never issued)', () => {
    const kp = Keypair.random();
    const serverNonce = newNonce();
    const attackerNonce = newNonce();
    // The wallet correctly signs a challenge carrying the attacker's own nonce — a valid
    // signature over the WRONG artifact. It must not satisfy the server's stored nonce.
    const signed = sign(buildChallengeXdr(kp.publicKey(), attackerNonce, 'testnet'), kp, 'testnet');
    expect(verifySignedChallenge(signed, kp.publicKey(), serverNonce, 'testnet')).toBe(false);
  });

  it('rejects an unsigned challenge (no signature present)', () => {
    const kp = Keypair.random();
    const nonce = newNonce();
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    expect(verifySignedChallenge(xdr, kp.publicKey(), nonce, 'testnet')).toBe(false);
  });

  it('rejects when verified under the wrong network passphrase', () => {
    const kp = Keypair.random();
    const nonce = newNonce();
    const xdr = buildChallengeXdr(kp.publicKey(), nonce, 'testnet');
    const signed = sign(xdr, kp, 'testnet');
    // Signature is over the testnet tx hash; verifying as mainnet recomputes a different hash.
    expect(verifySignedChallenge(signed, kp.publicKey(), nonce, 'mainnet')).toBe(false);
  });

  it("rejects a challenge whose source is NOT the address being proven", () => {
    const owner = Keypair.random();
    const other = Keypair.random();
    const nonce = newNonce();
    // Challenge built for `other`, signed by `other`, but we claim it proves `owner`.
    const xdr = buildChallengeXdr(other.publicKey(), nonce, 'testnet');
    const signed = sign(xdr, other, 'testnet');
    expect(verifySignedChallenge(signed, owner.publicKey(), nonce, 'testnet')).toBe(false);
  });

  it('rejects garbage / non-XDR input', () => {
    const kp = Keypair.random();
    expect(verifySignedChallenge('not-an-xdr', kp.publicKey(), 'n', 'testnet')).toBe(false);
    expect(verifySignedChallenge('', kp.publicKey(), 'n', 'testnet')).toBe(false);
  });

  it('rejects an invalid address', () => {
    expect(verifySignedChallenge('AAAA', 'not-a-G-address', 'n', 'testnet')).toBe(false);
    expect(() => buildChallengeXdr('nope', 'n', 'testnet')).toThrow();
  });

  it('rejects a challenge that omits the nordstern manage_data op', () => {
    const kp = Keypair.random();
    const nonce = newNonce();
    // Valid signature by the owner, but a tx with a DIFFERENT data key — wrong shape.
    const tx = new TransactionBuilder(new Account(kp.publicKey(), '0'), { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.manageData({ name: 'something else', value: nonce }))
      .setTimeout(300)
      .build();
    tx.sign(kp);
    expect(verifySignedChallenge(tx.toXDR(), kp.publicKey(), nonce, 'testnet')).toBe(false);
  });
});
