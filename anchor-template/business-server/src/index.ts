import { createApp } from './app.js';
import {
  PORT, ASSET_CODE, ASSET_ISSUER_PUBLIC, TREASURY_PUBLIC, PLATFORM_API_URL, IS_MAINNET,
} from './config.js';

const app = createApp();

app.listen(PORT, () => {
  console.log(`\nNordStern Anchor — business-server on :${PORT}`);
  console.log(`  Network:   ${IS_MAINNET ? 'MAINNET' : 'TESTNET'}`);
  console.log(`  Asset:     ${ASSET_CODE}:${ASSET_ISSUER_PUBLIC || '(issuer not set)'}`);
  console.log(`  Treasury:  ${TREASURY_PUBLIC || '(not set)'}`);
  console.log(`  Platform:  ${PLATFORM_API_URL}`);
  console.log(`  Phase A skeleton — SEP-12 /customer mock, SEP-24 interactive stub\n`);
});
