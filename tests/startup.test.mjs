import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import net from 'node:net';
import { readConfiguration, prepareConfiguration, localDatabase, applicationOrigin, sourceFingerprint, startupLock } from '../scripts/local-runtime.mjs';
import { sameSystemIdentifier } from '../scripts/postgres-runtime.mjs';

test('cluster identity accepts the same system and rejects unrelated or missing control data', () => {
  const control = 'pg_control version number: 1800\nDatabase system identifier: 7654321098765432100\n';
  assert.equal(sameSystemIdentifier(control, '7654321098765432100'), true);
  assert.equal(sameSystemIdentifier(control, '7654321098765432101'), false);
  assert.equal(sameSystemIdentifier('', '7654321098765432100'), false);
  assert.equal(sameSystemIdentifier(control, undefined), false);
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'workshop-startup-'));
  t.after(() => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep + 'workshop-startup-'));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}
test('PowerShell BOM configuration is readable and saved ports need no shell override', t => {
  const root = fixture(t);
  writeFileSync(join(root, '.env.local'), '\uFEFFDATABASE_URL=postgresql://workshop_local:fictional@127.0.0.1:55433/mechanical_workshop\r\nAPP_ORIGIN=http://127.0.0.1:3071\r\n');
  const env = readConfiguration(root, {});
  assert.equal(localDatabase(root, env).port, 55433);
  assert.equal(applicationOrigin(env).port, 3071);
  assert.throws(() => localDatabase(root, { ...env, WORKSHOP_PG_PORT: '55432' }), /conflicts/);
});
test('new clone avoids occupied defaults and preserves generated configuration across restarts', async t => {
  const root = fixture(t);
  const blocker = net.createServer();
  await new Promise(done => blocker.listen(0, '127.0.0.1', done));
  t.after(() => blocker.close());
  const port = blocker.address().port;
  await assert.rejects(prepareConfiguration(root, { WORKSHOP_PG_PORT: String(port) }), /occupied/);
  const env = await prepareConfiguration(root, {});
  assert.ok(env.DATABASE_URL);
  assert.ok(env.DEMO_PASSWORD.length >= 12);
  const bytes = readFileSync(join(root, '.env.local'));
  assert.notEqual(bytes[0], 239);
  assert.deepEqual(await prepareConfiguration(root, {}), env);
  assert.deepEqual(readFileSync(join(root, '.env.local')), bytes);
});
test('missing configuration never regenerates credentials over an existing cluster', async t => {
  const root = fixture(t);
  mkdirSync(join(root, '.local/postgres'), { recursive: true });
  writeFileSync(join(root, '.local/postgres/PG_VERSION'), '18');
  await assert.rejects(prepareConfiguration(root, {}), /Restore its private/);
});
test('external database stays external and local HTTP rejects incompatible origins', t => {
  const root = fixture(t);
  assert.equal(localDatabase(root, { DATABASE_URL: 'postgresql://workshop:fictional@database:5432/mechanical_workshop' }), null);
  assert.throws(() => applicationOrigin({ APP_ORIGIN: 'https://example.com' }), /managed hosting/);
  assert.throws(() => applicationOrigin({ APP_ORIGIN: 'http://127.0.0.1:3071', COOKIE_SECURE: 'true' }), /COOKIE_SECURE/);
});
test('build fingerprint notices deleted or edited source and ignores runtime history', t => {
  const root = fixture(t);
  mkdirSync(join(root, 'src')); mkdirSync(join(root, '.local'));
  writeFileSync(join(root, 'src/page.tsx'), 'first');
  const original = sourceFingerprint(root);
  writeFileSync(join(root, '.local/postgres.log'), 'runtime history');
  assert.equal(sourceFingerprint(root), original);
  writeFileSync(join(root, 'src/page.tsx'), 'second');
  assert.notEqual(sourceFingerprint(root), original);
});
test('duplicate startup is rejected without releasing the first launcher lock', t => {
  const root = fixture(t);
  const release = startupLock(root);
  assert.throws(() => startupLock(root), /already running/);
  release();
  const nextRelease = startupLock(root); nextRelease();
});

test('Windows build directory retry is bounded and limited to recursive .next directories', async () => {
  const { buildMkdir } = await import('../scripts/windows-build-mkdir.mjs');
  const root = process.cwd(); const target = join(root, '.next', 'server', 'app', 'test.segments', 'test');
  let calls = 0; const waits = [];
  const transient = async () => { if (++calls < 3) throw Object.assign(new Error('Transient lock'), { code: 'EPERM' }); return 'created'; };
  assert.equal(await buildMkdir(transient, target, { recursive: true }, root, 'win32', async ms => { waits.push(ms); }), 'created');
  assert.equal(calls, 3); assert.deepEqual(waits, [20,40]);
  for (const [path, options, platform, code] of [[join(root,'db','migrations'),{recursive:true},'win32','EPERM'],[target,{},'win32','EPERM'],[target,{recursive:true},'linux','EPERM'],[target,{recursive:true},'win32','ENOSPC']]) {
    let tries=0; await assert.rejects(buildMkdir(async()=>{tries++;throw Object.assign(new Error('Failure'),{code});},path,options,root,platform,async()=>{})); assert.equal(tries,1);
  }
  let tries=0;await assert.rejects(buildMkdir(async()=>{tries++;throw Object.assign(new Error('Still denied'),{code:'EACCES'});},target,{recursive:true},root,'win32',async()=>{}));assert.equal(tries,7);
});
