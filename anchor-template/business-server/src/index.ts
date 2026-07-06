import { createApp } from './app.js';
import { startWithdrawalPoller } from './poller.js';
import { reconcileDepositReleases, startReleaseReconciler } from './releases.js';
import { initSchema } from './db.js';
import {
  PORT, ASSET_CODE, ASSET_ISSUER_PUBLIC, TREASURY_PUBLIC, PLATFORM_API_URL, IS_MAINNET,
} from './config.js';

// Ensure the durable stores exist before serving (idempotent DDL).
await initSchema();

// Recover any deposit release left mid-flight by a prior crash before we serve
// traffic — settles on-chain-completed transfers and re-drives ones that never
// landed, so a restart never leaves funds sent-but-unrecorded.
await reconcileDepositReleases().catch((e) =>
  console.error('[reconcile] startup pass:', e instanceof Error ? e.message : e),
);

const app = createApp();
startWithdrawalPoller();
startReleaseReconciler();

app.listen(PORT, () => {
  console.log(`\nNordStern Anchor — business-server on :${PORT}`);
  console.log(`  Network:   ${IS_MAINNET ? 'MAINNET' : 'TESTNET'}`);
  console.log(`  Asset:     ${ASSET_CODE}:${ASSET_ISSUER_PUBLIC || '(issuer not set)'}`);
  console.log(`  Treasury:  ${TREASURY_PUBLIC || '(not set)'}`);
  console.log(`  Platform:  ${PLATFORM_API_URL}`);
  console.log(`  Flows: SEP-24 deposit (USDC transfer) + withdrawal (poller payout)\n`);
});
