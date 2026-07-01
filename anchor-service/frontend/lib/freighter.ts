'use client';

// Freighter is a browser extension — never import at module level on the server.
// All functions in this file are only called from client components.

const NET_PASS = process.env.NEXT_PUBLIC_NET_PASS ?? 'Test SDF Network ; September 2015';

async function getFreighter() {
  if (typeof window === 'undefined') throw new Error('Not a browser environment');
  const mod = await import('@stellar/freighter-api');
  return mod.default ?? mod;
}

// Returns the connected address if Freighter is already allowed for this site,
// or null if not connected or not installed.
export async function checkConnected(): Promise<string | null> {
  try {
    const freighter = await getFreighter();
    const { isConnected } = await freighter.isConnected();
    if (!isConnected) return null;
    const { address } = await freighter.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// Opens the Freighter permission popup. Rejects after 90 s with a helpful message.
export async function connect(): Promise<string> {
  const freighter = await getFreighter();
  const { isConnected } = await freighter.isConnected();
  if (!isConnected) {
    throw new Error('Freighter extension not found. Install it at freighter.app');
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Timed out — click the Freighter 🚀 icon in your toolbar to approve')),
      90_000,
    )
  );

  const { address, error } = await Promise.race([
    freighter.requestAccess() as Promise<{ address: string; error?: string }>,
    timeout,
  ]);

  if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  if (!address) throw new Error('Connection cancelled or Freighter is locked');
  return address;
}

// Signs an XDR transaction with Freighter. Rejects if user declines.
export async function signTransaction(xdr: string): Promise<string> {
  const freighter = await getFreighter();
  const result = await freighter.signTransaction(xdr, { networkPassphrase: NET_PASS });
  // Freighter v6 returns { signedTxXdr } or { error }
  const { signedTxXdr, error } = result as { signedTxXdr: string; error?: string | { message: string } };
  if (error) {
    throw new Error(
      typeof error === 'string' ? error : (error as { message: string }).message ?? 'Freighter signing error',
    );
  }
  return signedTxXdr;
}
