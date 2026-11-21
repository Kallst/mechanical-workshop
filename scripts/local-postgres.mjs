import { prepareConfiguration, readConfiguration, localDatabase } from './local-runtime.mjs';
import { ensureDatabase, stopDatabase } from './postgres-runtime.mjs';
try {
  const root = process.cwd();
  const stopping = process.argv[2] === 'stop';
  const env = stopping ? readConfiguration(root) : await prepareConfiguration(root);
  const config = localDatabase(root, env);
  if (!config) throw new Error('This helper manages only the project-owned local cluster. Manage an external database yourself.');
  if (stopping) { stopDatabase(config, env); console.log('Project PostgreSQL stopped.'); }
  else { await ensureDatabase(config, env, { foreground: false }); console.log('Project PostgreSQL is ready. Run npm start for supervised application startup.'); }
} catch (error) { console.error(error.message); process.exitCode = 1; }
