import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

async function verify() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- NordStern DB State Verification ---');

  // Query applications
  const apps = await client.query('SELECT id, status, created_at FROM applications ORDER BY created_at DESC LIMIT 5');
  console.log('\n[1] Applications:');
  console.table(apps.rows);

  // Query invitations
  const invites = await client.query('SELECT id, email, used_at FROM anchor_invitations ORDER BY created_at DESC LIMIT 5');
  console.log('\n[2] Anchor Invitations:');
  console.table(invites.rows);

  // Query provisioning jobs
  const jobs = await client.query('SELECT id, status, error, updated_at FROM provisioning_jobs ORDER BY created_at DESC LIMIT 5');
  console.log('\n[3] Provisioning Jobs:');
  console.table(jobs.rows);

  await client.end();
}

verify().catch(console.error);
