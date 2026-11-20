import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
const url = new URL(process.env.DATABASE_URL || '');
const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const executable = name => bin ? join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
function run(name, args) { try { return execFileSync(executable(name), args, { env, windowsHide: true, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], timeout: 240000 }); } catch { throw new Error(`${name} failed. Check database access and PostgreSQL client compatibility.`); } }
const directory = resolve('backups'); mkdirSync(directory, { recursive: true });
const file = join(directory, `workshop-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
const started = performance.now();
run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file]);
console.log(`Backup created: ${file} (${statSync(file).size} bytes). Protect backups as confidential application data.`);
if (process.argv.includes('--verify')) {
  // Create a new disposable database; never restore over the configured database.
  const target = `workshop_restore_check_${randomBytes(8).toString('hex')}`;
  run('createdb', [target]);
  try {
    run('pg_restore', ['--exit-on-error', '--no-owner', '--no-acl', '--dbname', target, file]);
    const before = run('psql', ['--tuples-only','--no-align','--command', 'SELECT (SELECT count(*) FROM workspaces),(SELECT count(*) FROM scenarios),(SELECT count(*) FROM audit_events)']).trim();
    const after = run('psql', ['--dbname',target,'--tuples-only','--no-align','--command', 'SELECT (SELECT count(*) FROM workspaces),(SELECT count(*) FROM scenarios),(SELECT count(*) FROM audit_events)']).trim();
    if (before !== after) throw new Error('Restoration counts differ. Run verification while the demonstration is paused.');
    console.log(`Restoration verified in a disposable database: ${after}; elapsed ${Math.round(performance.now()-started)} ms. This small-fixture exercise is not a production recovery SLA.`);
  } finally { run('dropdb', [target]); }
}
