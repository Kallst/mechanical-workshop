import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const local = resolve(root, '.local');
const data = join(local, 'postgres');
const envFile = join(root, '.env.local');
const port = process.env.WORKSHOP_PG_PORT || '55432';
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const executable = name => bin ? join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
function run(name, args, quiet = false) {
  return execFileSync(executable(name), args, { windowsHide: true, encoding: 'utf8', timeout: 30000, stdio: name === 'pg_ctl' ? 'ignore' : quiet ? 'pipe' : ['ignore', 'pipe', 'pipe'] });
}
mkdirSync(local, { recursive: true });
if (process.argv[2] === 'stop') {
  if (existsSync(join(data, 'postmaster.pid'))) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  console.log('Project PostgreSQL stopped.');
  process.exit(0);
}
let password;
if (!existsSync(envFile)) {
  password = randomBytes(24).toString('hex');
  const demoPassword = randomBytes(15).toString('base64url');
  writeFileSync(envFile, `DATABASE_URL=postgresql://workshop_local:${password}@127.0.0.1:${port}/mechanical_workshop\nAPP_ORIGIN=http://127.0.0.1:3070\nCOOKIE_SECURE=false\nDEMO_PASSWORD=${demoPassword}\nALLOW_DEMO_SIGNUP=true\nMAX_DEMO_WORKSPACES=100\n`, { mode: 0o600 });
  console.log('Created ignored .env.local with generated database and demonstration credentials.');
} else {
  const match = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('DATABASE_URL is missing from .env.local.');
  const url = new URL(match[1]);
  if (url.hostname !== '127.0.0.1' || url.port !== port || url.username !== 'workshop_local') {
    throw new Error('The configured database is external. Start it yourself; this helper only manages its project-owned local cluster.');
  }
  password = decodeURIComponent(url.password);
}
if (!existsSync(join(data, 'PG_VERSION'))) {
  const passwordFile = join(local, 'initial-password');
  writeFileSync(passwordFile, password, { mode: 0o600 });
  try { run('initdb', ['-D', data, '-U', 'workshop_local', '-A', 'scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C']); }
  finally { if (existsSync(passwordFile)) unlinkSync(passwordFile); }
}
let started = false;
try { run('pg_ctl', ['-D', data, 'status'], true); started = true; } catch { /* Start only this project's cluster. */ }
if (!started) run('pg_ctl', ['-D', data, '-l', join(local, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
const childEnv = { ...process.env, PGPASSWORD: password };
try {
  execFileSync(executable('createdb'), ['-h', '127.0.0.1', '-p', port, '-U', 'workshop_local', 'mechanical_workshop'], { windowsHide: true, env: childEnv, stdio: 'pipe' });
} catch (error) {
  if (!String(error.stderr).includes('already exists')) throw error;
}
console.log(`Project PostgreSQL ready on 127.0.0.1:${port}. Run npm run db:migrate and npm run db:seed.`);
