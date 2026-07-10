import crypto from 'crypto';
import { Account, Keypair, Networks, Operation, TransactionBuilder, Transaction } from '@stellar/stellar-sdk';

// ─── Wallet ownership proof (Identity Phase 1) ───────────────────────────────────
// A customer proves control of a Stellar address the SEP-10 way: the server issues a
// random nonce, embeds it in a challenge transaction whose SOURCE is the wallet address,
// and the wallet signs it. A signature that verifies against the address's ed25519 key —
// over a transaction we recognise and that carries our nonce — proves the holder controls
// the key. Nothing here is submitted to the network (sequence 0 makes it unsubmittable);
// it is a pure signing challenge.
//
// This mirrors the settlement path (the wallet already signs to move value); linking simply
// reuses the same capability at attach time. It is deliberately NOT a login mechanism —
// an external wallet is a signing capability, never an authenticator.

const CHALLENGE_DATA_KEY = 'nordstern wallet link';
export const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes — a link challenge is short-lived.

const isStellarAddress = (a: string) => /^G[A-Z2-7]{55}$/.test(a);

export function networkPassphrase(network: 'testnet' | 'mainnet'): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

// Fresh, URL-safe nonce. Stored server-side bound to (customer, address); echoed inside the
// challenge so verify can confirm the signature is over THIS issuance, not a replay.
export function newNonce(): string {
  return crypto.randomBytes(24).toString('base64url'); // 32 chars, < varchar(64)
}

// Build the unsigned challenge transaction (XDR) the wallet will sign. Source = the address
// under proof, sequence 0. A single manage_data op carries the nonce so the signed artifact
// is unambiguously tied to this challenge.
export function buildChallengeXdr(address: string, nonce: string, network: 'testnet' | 'mainnet'): string {
  if (!isStellarAddress(address)) throw new Error('invalid address');
  const source = new Account(address, '0');
  const tx = new TransactionBuilder(source, {
    fee: '100',
    networkPassphrase: networkPassphrase(network),
  })
    .addOperation(Operation.manageData({ name: CHALLENGE_DATA_KEY, value: nonce }))
    .setTimeout(Math.ceil(CHALLENGE_TTL_MS / 1000))
    .build();
  return tx.toXDR();
}

// Verify a signed challenge. Returns true iff:
//   • the XDR parses under the expected network,
//   • its source account IS the address under proof,
//   • it carries our manage_data op with EXACTLY the expected nonce,
//   • and at least one signature is a valid ed25519 signature by `address` over the tx hash.
// Any deviation (tampered tx, wrong signer, altered nonce, replayed different challenge)
// fails closed.
export function verifySignedChallenge(
  signedXdr: string,
  address: string,
  expectedNonce: string,
  network: 'testnet' | 'mainnet',
): boolean {
  if (!isStellarAddress(address)) return false;
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, networkPassphrase(network));
    // Fee-bump transactions are not a valid challenge shape here.
    if (!(parsed instanceof Transaction)) return false;
    tx = parsed;
  } catch {
    return false;
  }

  // Source must be the address whose ownership we are checking.
  if (tx.source !== address) return false;

  // Must carry our nonce, unmodified.
  const op = tx.operations.find(
    (o): o is Operation.ManageData => o.type === 'manageData' && o.name === CHALLENGE_DATA_KEY,
  );
  if (!op) return false;
  const value = op.value ? Buffer.from(op.value).toString('utf8') : '';
  if (value !== expectedNonce) return false; // security is the signature; the nonce just binds freshness

  // A signature by `address` over the transaction hash must be present.
  const kp = Keypair.fromPublicKey(address);
  const hash = tx.hash();
  return tx.signatures.some((sig) => {
    try {
      return kp.verify(hash, sig.signature());
    } catch {
      return false;
    }
  });
}
