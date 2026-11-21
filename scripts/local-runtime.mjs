import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import net from 'node:net';

export function readConfiguration(root, inherited = process.env) {
  const file = join(root, '.env.local');
  const saved = existsSync(file) ? parseEnv(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
  return { ...saved, ...Object.fromEntries(Object.entries(inherited).filter(([, value]) => value !== undefined)) };
}
export async function portAvailable(port) {
  return new Promise(done => {
    const server = net.createServer();
    server.once('error', () => done(false));
    server.listen(port, '127.0.0.1', () => server.close(() => done(true)));
  });
}
export async function freePort(first) {
  for (let port = first; port < Math.min(first + 100, 65536); port++) if (await portAvailable(port)) return port;
  throw new Error(`No free loopback port found starting at ${first}.`);
}
export function validPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port between 1024 and 65535.');
  return port;
}
export async function prepareConfiguration(root, inherited = process.env) {
  const file = join(root, '.env.local');
  let env = readConfiguration(root, inherited);
  if (!env.DATABASE_URL) {
    if (existsSync(join(root, '.local', 'postgres', 'PG_VERSION'))) throw new Error('Existing local database has no DATABASE_URL. Restore its private .env.local; no data was changed.');
    if (existsSync(file)) throw new Error('DATABASE_URL is missing from .env.local. Correct that file; no configuration was overwritten.');
    const dbPort = inherited.WORKSHOP_PG_PORT ? validPort(inherited.WORKSHOP_PG_PORT) : await freePort(55432);
    if (!await portAvailable(dbPort)) throw new Error(`Database port ${dbPort} is occupied. Choose a free WORKSHOP_PG_PORT for this new clone.`);
    const appPort = inherited.PORT ? validPort(inherited.PORT) : await freePort(3070);
    const generated = {
      DATABASE_URL: `postgresql://workshop_local:${randomBytes(24).toString('hex')}@127.0.0.1:${dbPort}/mechanical_workshop`,
      APP_ORIGIN: inherited.APP_ORIGIN || `http://127.0.0.1:${appPort}`, COOKIE_SECURE: 'false',
      DEMO_PASSWORD: inherited.DEMO_PASSWORD || randomBytes(24).toString('base64url'), ALLOW_DEMO_SIGNUP: 'true', MAX_DEMO_WORKSPACES: '100',
    };
    mkdirSync(join(root, '.local'), { recursive: true });
    writeFileSync(file, Object.entries(generated).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    env = readConfiguration(root, inherited);
    console.log('Created private .env.local with generated credentials and available local ports.');
  }
  return env;
}
export function localDatabase(root, env) {
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL is invalid. Check its host and port in .env.local.'); }
  if (url.hostname !== '127.0.0.1' || url.username !== 'workshop_local' || url.pathname !== '/mechanical_workshop') return null;
  const port = validPort(url.port || '5432');
  if (env.WORKSHOP_PG_PORT && validPort(env.WORKSHOP_PG_PORT) !== port) throw new Error('WORKSHOP_PG_PORT conflicts with the saved DATABASE_URL. Keep the saved port or deliberately update both.');
  return { root: resolve(root), data: join(root, '.local', 'postgres'), log: join(root, '.local', 'postgres.log'), port, password: decodeURIComponent(url.password) };
}
export function applicationOrigin(env) {
  let url;
  try { url = new URL(env.APP_ORIGIN || 'http://127.0.0.1:3070'); } catch { throw new Error('APP_ORIGIN is invalid.'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('npm start is a local HTTP launcher. Set APP_ORIGIN to http://127.0.0.1:PORT, or use npm run start:server for managed hosting.');
  const port = validPort(url.port || '80');
  if (env.PORT && validPort(env.PORT) !== port) throw new Error('PORT conflicts with APP_ORIGIN. Use the port saved in APP_ORIGIN.');
  if (env.COOKIE_SECURE === 'true') throw new Error('Local HTTP requires COOKIE_SECURE=false. Use start:server behind HTTPS for deployment.');
  return { origin: url.origin, port };
}
export function sourceFingerprint(root) {
  const hash = createHash('sha256').update(process.versions.node);
  const visit = relative => {
    const full = join(root, relative);
    if (!existsSync(full)) return;
    for (const entry of readdirSync(full, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(relative, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) hash.update(child.replaceAll('\\', '/')).update(readFileSync(join(root, child)));
    }
  };
  for (const dir of ['src', 'public']) visit(dir);
  for (const name of ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', '.env.local']) if (existsSync(join(root, name))) hash.update(name).update(readFileSync(join(root, name)));
  return hash.digest('hex');
}
export function startupLock(root) {
  const file = join(root, '.local', 'startup.lock');
  mkdirSync(join(root, '.local'), { recursive: true });
  if (existsSync(file)) {
    let lock;
    try { lock = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('Unreadable .local/startup.lock. Check that no launcher is running before removing that lock file.'); }
    let alive = true;
    try { process.kill(lock.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; }
    if (alive) throw new Error(`A launcher for this clone is already running (PID ${lock.pid}). Use its URL or stop it with Ctrl+C.`);
    unlinkSync(file);
  }
  const token = randomBytes(12).toString('hex');
  writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
  return () => { if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).token === token) unlinkSync(file); };
}
