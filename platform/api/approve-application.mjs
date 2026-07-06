import 'dotenv/config';
import { applicationService } from './src/services/application.service.js';

const appId = '8f829672-9b8e-4cc0-a7c1-7b46f8f01d3f';

async function approve() {
  console.log(`Approving application ${appId} programmatically...`);
  const result = await applicationService.approve(appId);
  console.log('\n✔ Success!');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

approve().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
