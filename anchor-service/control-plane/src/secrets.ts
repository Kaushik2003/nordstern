import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager';

// ─── Provisioner-side SecretStore reader (DL-010) ────────────────────────────────
// The control-plane is the local "provisioner": at container-launch it pulls an
// anchor's PSP/banking credentials from the SecretStore and injects them into the
// business-server. This is the exact role External Secrets Operator plays in prod
// (extract the per-anchor secret → envFrom into the pod) — same secret, same shape,
// so nothing about how secrets flow changes between local and Kubernetes.
//
// We only READ here. Writing/rotating/deleting is the platform-api's job (operators).

const PREFIX   = process.env.SECRETS_PREFIX ?? 'nordstern';
const SEC_ENV  = process.env.SECRETS_ENV    ?? 'testnet';
const REGION   = process.env.AWS_REGION     ?? 'us-east-1';
const ENDPOINT = process.env.SECRETS_ENDPOINT;             // LocalStack in dev; unset in prod

// nordstern/testnet/anchor/<slug> — identical to platform-api + terraform/secrets.tf.
export const anchorSecretPath = (slug: string) => `${PREFIX}/${SEC_ENV}/anchor/${slug}`;

function client(): SecretsManagerClient {
  return new SecretsManagerClient({
    region: REGION,
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
    ...(ENDPOINT
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
          },
        }
      : {}),
  });
}

// The whole per-anchor secret as a flat env map (TREASURY_SECRET, RAZORPAY_KEY_SECRET,
// CASHFREE_SECRET_KEY, …). Empty map if the anchor has no secrets yet — provisioning
// of a testnet/mock anchor must still succeed. Injected wholesale, mirroring envFrom.
export async function readAnchorSecrets(slug: string): Promise<Record<string, string>> {
  try {
    const res = await client().send(new GetSecretValueCommand({ SecretId: anchorSecretPath(slug) }));
    return res.SecretString ? (JSON.parse(res.SecretString) as Record<string, string>) : {};
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return {};
    throw err;
  }
}
