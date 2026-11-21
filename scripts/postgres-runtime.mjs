import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { portAvailable } from './local-runtime.mjs';

export function pgExecutable(env, name) {
  const bin = env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
  return bin ? join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
}
function run(env, name, args, extra = {}) { return execFileSync(pgExecutable(env, name), args, { windowsHide: true, env, timeout: 30000, encoding: 'utf8', stdio: 'pipe', ...extra }); }
export function databaseRunning(config, env) { try { run(env, 'pg_ctl', ['-D', config.data, 'status']); return true; } catch { return false; } }
export function sameSystemIdentifier(control, reported) {
  const local = control.match(/Database system identifier:\s*(\d+)/)?.[1];
  return Boolean(local && /^\d+$/.test(String(reported)) && local === String(reported));
}
export async function ownsRunningDatabase(config, env) {
  // Windows pg_ctl/path output can lose accented characters. Authenticate and compare
  // the server's cluster identity with this directory instead of trusting a port/PID.
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000, query_timeout: 3000 });
  try {
    const control = run({ ...env, LC_ALL: 'C', LANG: 'C' }, 'pg_controldata', ['-D', config.data]);
    await client.connect();
    const result = await client.query('SELECT system_identifier::text FROM pg_control_system()');
    return sameSystemIdentifier(control, result.rows[0]?.system_identifier);
  } catch { return false; }
  finally { await client.end().catch(() => {}); }
}
export function stopDatabase(config, env) {
  if (databaseRunning(config, env)) {
    try { run(env, 'pg_ctl', ['-D', config.data, '-m', 'fast', '-w', 'stop']); }
    catch { throw new Error(`Could not stop this project's PostgreSQL. Inspect ${config.log}.`); }
  }
}
async function stopOwnedChild(child, config, env) {
  if (!child) { stopDatabase(config, env); return; }
  if (child.exitCode !== null || child.signalCode !== null) return;
  // Signal only the native child created by this launcher, never a guessed PID.
  try { run(env, 'pg_ctl', ['kill', 'INT', String(child.pid)]); } catch { child.kill(); }
  await Promise.race([once(child, 'exit'), delay(5000)]);
  if (child.exitCode === null && child.signalCode === null) child.kill();
}
export async function ensureDatabase(config, env, { foreground = true } = {}) {
  for (const name of ['postgres', 'initdb', 'pg_ctl', 'createdb', 'pg_controldata']) {
    try { run(env, name, ['--version']); } catch { throw new Error(`PostgreSQL tools are unavailable. Install PostgreSQL 18 or set PG_BIN to its bin directory (${name}).`); }
  }
  mkdirSync(join(config.root, '.local'), { recursive: true });
  if (!existsSync(join(config.data, 'PG_VERSION'))) {
    const passwordFile = join(config.root, '.local', 'initial-password');
    writeFileSync(passwordFile, config.password, { flag: 'wx', mode: 0o600 });
    try { run(env, 'initdb', ['-D', config.data, '-U', 'workshop_local', '-A', 'scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C']); }
    catch { throw new Error('Could not initialize the project PostgreSQL cluster. Check folder permissions; existing data was not removed.'); }
    finally { unlinkSync(passwordFile); }
  }
  let started = false, child;
  if (!await portAvailable(config.port)) {
    if (!await ownsRunningDatabase(config, env)) throw new Error(`Database port ${config.port} is occupied, but its cluster identity could not be verified as this project's database. No other cluster was changed.`);
  } else if (databaseRunning(config, env)) {
    const actualPort = Number(readFileSync(join(config.data, 'postmaster.pid'), 'utf8').split(/\r?\n/)[3]);
    if (actualPort !== config.port) throw new Error(`This cluster is already running on ${actualPort}, but DATABASE_URL uses ${config.port}. Stop this project's database before changing ports.`);
  } else {
    if (!await portAvailable(config.port)) throw new Error(`Database port ${config.port} is occupied by another process. No other cluster was changed. Restore this clone's saved port or choose another in DATABASE_URL.`);
    if (foreground) {
      const log = openSync(config.log, 'a');
      try { child = spawn(pgExecutable(env, 'postgres'), ['-D', config.data, '-p', String(config.port), '-h', '127.0.0.1'], { env, windowsHide: true, stdio: ['ignore', log, log] }); } finally { closeSync(log); }
      let failure;
      child.on('error', error => { failure = error; });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (failure || child.exitCode !== null) break;
        try { run(env, 'pg_isready', ['-h', '127.0.0.1', '-p', String(config.port)], { timeout: 1000 }); ready = true; break; } catch { await delay(100); }
      }
      if (!ready) { if (child.exitCode === null) child.kill(); throw new Error(`PostgreSQL did not become ready. Inspect ${config.log}; no data was removed.`); }
    } else {
      try { run(env, 'pg_ctl', ['-D', config.data, '-l', config.log, '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' }); }
      catch { throw new Error(`PostgreSQL did not start. Inspect ${config.log}.`); }
    }
    started = true;
  }
  try { run({ ...env, PGPASSWORD: config.password }, 'createdb', ['-h', '127.0.0.1', '-p', String(config.port), '-U', 'workshop_local', 'mechanical_workshop']); }
  catch (error) {
    if (!String(error.stderr).includes('already exists')) {
      if (started) await stopOwnedChild(child, config, env);
      throw new Error('Could not prepare the local database. Check the saved DATABASE_URL credentials; no data was reset.');
    }
  }
  return { started, child, stop: async () => { if (started) await stopOwnedChild(child, config, env); } };
}
