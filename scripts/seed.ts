import { provisionWorkspace } from '../src/server/auth';
import { pool, transaction } from '../src/server/db';
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12 || password.length > 128) throw new Error('Set DEMO_PASSWORD to 12–128 characters in .env.local.');
await transaction(async client => {
  await client.query('SELECT pg_advisory_xact_lock(713209125)');
  const exists = (await client.query('SELECT id FROM workspaces WHERE code=$1', ['workshop-demo'])).rowCount;
  if (exists) { console.log('Default demonstration already exists; no existing data or passwords changed.'); return; }
  await provisionWorkspace(client, 'workshop-demo', 'Heavy vehicle workshop', password);
  console.log('Created workshop-demo with seven employee accounts. Password is configured privately in DEMO_PASSWORD.');
});
await pool().end();
