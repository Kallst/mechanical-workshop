import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { prepareConfiguration, applicationOrigin, localDatabase, portAvailable, sourceFingerprint, startupLock } from './local-runtime.mjs';
import { ensureDatabase } from './postgres-runtime.mjs';

const root = process.cwd();
let releaseLock, database, server, activeStep, stopping = false;
async function cleanup() {
  stopping = true;
  if (activeStep && activeStep.exitCode === null) activeStep.kill();
  if (server && server.exitCode === null) { server.kill(); await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]); }
  try { await database?.stop(); } finally { releaseLock?.(); releaseLock = undefined; }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (!stopping) void cleanup().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
});
async function run(args, env, label) {
  console.log(`\n${label}`);
  const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: 'inherit' });
  activeStep = child;
  const [code] = await once(child, 'exit'); activeStep = undefined;
  if (code !== 0) throw new Error(`${label} failed. Correct the error above and run npm start again; existing data is preserved.`);
}
try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 19)) throw new Error('Install Node.js 24 (minimum 22.19) before starting this project.');
  releaseLock = startupLock(root);
  const env = await prepareConfiguration(root);
  const app = applicationOrigin(env);
  if (!await portAvailable(app.port)) throw new Error(`Application port ${app.port} is already occupied. Stop that application's terminal or deliberately update APP_ORIGIN in this clone's .env.local. No duplicate server was started.`);
  const lockHash = createHash('sha256').update(readFileSync(join(root, 'package-lock.json'))).digest('hex');
  const dependencyStamp = join(root, '.local', 'dependencies.sha256');
  if (!existsSync(join(root, 'node_modules/next/dist/bin/next')) || !existsSync(join(root, 'node_modules/tsx/dist/loader.mjs')) || !existsSync(dependencyStamp) || readFileSync(dependencyStamp, 'utf8') !== lockHash) {
    const npm = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    await run([npm, 'ci', '--include=dev'], env, 'Installing locked dependencies');
    writeFileSync(dependencyStamp, lockHash);
  } else console.log('Locked dependencies are already prepared.');
  const config = localDatabase(root, env);
  if (config) {
    database = await ensureDatabase(config, env);
    console.log(`PostgreSQL ready on 127.0.0.1:${config.port}${database.started ? ' (supervised by this launcher)' : ' (already running; will be left running)'}.`);
    database.child?.on('exit', () => {
      if (!stopping) { console.error('Project PostgreSQL stopped unexpectedly. Stopping the application; run npm start again.'); void cleanup().finally(() => process.exit(1)); }
    });
  } else console.log('Using the configured external database; its lifecycle is managed externally.');
  await run(['--import', 'tsx', 'scripts/migrate.ts'], env, 'Applying database migrations');
  await run(['--import', 'tsx', 'scripts/seed.ts'], env, 'Preparing the default demonstration');
  const buildStamp = join(root, '.local', 'build.sha256');
  const fingerprint = sourceFingerprint(root);
  if (!existsSync(join(root, '.next', 'BUILD_ID')) || !existsSync(buildStamp) || readFileSync(buildStamp, 'utf8') !== fingerprint) {
    if (process.platform === 'win32') for (const route of ['_not-found', '_global-error']) mkdirSync(join(root, '.next/server/app', `${route}.segments`, route), { recursive: true });
    await run(['node_modules/next/dist/bin/next', 'build', '--webpack'], env, 'Building the production application');
    writeFileSync(buildStamp, sourceFingerprint(root));
  } else console.log('Production build is current; skipping compilation.');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(app.port)], { cwd: root, env, windowsHide: true, stdio: 'inherit' });
  console.log(`\nWorkshop URL: ${app.origin}\nKeep this terminal open. Ctrl+C stops the application and any database started by this launcher.\n`);
  const [code] = await once(server, 'exit');
  if (!stopping && code !== 0) process.exitCode = 1;
} catch (error) { console.error(`\nStartup failed: ${error.message}`); process.exitCode = 1; }
finally { if (!stopping) await cleanup(); }
