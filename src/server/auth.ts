import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PoolClient } from 'pg';
import type { Actor } from '../domain/types';
import { DomainError, ensure } from '../domain/engine';
import { createBaseline, employees } from '../domain/seed';
import { pool, transaction } from './db';
const derive = promisify(scrypt);
export const COOKIE_NAME = 'workshop_session';
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString('hex'); const key = await derive(password, salt, 64) as Buffer; return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expected] = encoded.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{48}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false;
  const actual = await derive(password, salt, 64) as Buffer; return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
export async function provisionWorkspace(client: PoolClient, code: string, name: string, password: string) {
  const workspaceId = randomUUID(); await client.query('INSERT INTO workspaces(id,code,name) VALUES($1,$2,$3)', [workspaceId, code, name]);
  let adminId = '';
  for (const employee of employees) {
    const id = randomUUID(); if (employee.id === 'tamara') adminId = id;
    await client.query('INSERT INTO app_users(id,workspace_id,username,display_name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)', [id, workspaceId, employee.id, employee.name, employee.role, await hashPassword(password)]);
  }
  const scenarioId = randomUUID(); const state = createBaseline();
  await client.query('INSERT INTO scenarios(id,workspace_id,name,state) VALUES($1,$2,$3,$4)', [scenarioId, workspaceId, 'Workshop demonstration', JSON.stringify(state)]);
  await client.query('INSERT INTO audit_events(id,workspace_id,scenario_id,actor_id,actor_name,action,details,scenario_minute) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), workspaceId, scenarioId, adminId, 'Tamara', 'workspace.created', JSON.stringify({ source: 'Explicit synthetic baseline', code }), state.clock.minute]);
  return { workspaceId, adminId, scenarioId, code };
}
async function sessionFor(userId: string) {
  const token = randomBytes(32).toString('base64url'); await pool().query('INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'8 hours\')', [tokenHash(token), userId]); return token;
}
export async function login(code: string, username: string, password: string) {
  ensure(code.length >= 3 && code.length <= 40 && username.length <= 40 && password.length <= 128, 'Invalid sign-in details.', 400);
  const accountKey = tokenHash(`${code.toLowerCase()}:${username.toLowerCase()}`);
  const result = await transaction(async client => {
    // Serialize the account attempt window, including unknown accounts.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [accountKey]);
    await client.query('DELETE FROM login_attempts WHERE attempted_at < now()-interval \'1 day\'');
    const attempts = await client.query('SELECT count(*)::int AS count FROM login_attempts WHERE account_key=$1 AND attempted_at > now()-interval \'15 minutes\'', [accountKey]);
    if (attempts.rows[0].count >= 20) return { failure: true };
    await client.query('INSERT INTO login_attempts(account_key) VALUES($1)', [accountKey]);
    const row = (await client.query('SELECT u.* FROM app_users u JOIN workspaces w ON w.id=u.workspace_id WHERE w.code=$1 AND u.username=$2 FOR UPDATE OF u', [code.toLowerCase(), username.toLowerCase()])).rows[0];
    const correct = await verifyPassword(password, row?.password_hash || await dummyHash);
    if (!row) return { failure: true };
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { failure: true };
    if (!correct) {
      const failed = (row.locked_until ? 0 : row.failed_attempts) + 1;
      await client.query('UPDATE app_users SET failed_attempts=$2,locked_until=CASE WHEN $2>=5 THEN now()+interval \'15 minutes\' ELSE NULL END WHERE id=$1', [row.id, failed]); return { failure: true };
    }
    await client.query('UPDATE app_users SET failed_attempts=0,locked_until=NULL WHERE id=$1', [row.id]); return { failure: false, userId: row.id as string };
  });
  if (result.failure || !result.userId) throw new DomainError('Unable to sign in. Check your details or retry after the 15-minute lock window.', 401);
  return sessionFor(result.userId);
}
export async function register(name: string, password: string) {
  ensure(process.env.ALLOW_DEMO_SIGNUP === 'true', 'Personal demonstration creation is disabled.', 403);
  ensure(name.trim().length >= 2 && name.trim().length <= 100 && password.length >= 12 && password.length <= 128, 'Use a workspace name and a password of 12–128 characters.');
  const record = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(713209125)');
    const count = Number((await client.query('SELECT count(*) FROM workspaces')).rows[0].count);
    ensure(count < Number(process.env.MAX_DEMO_WORKSPACES || 100), 'The demonstration workspace limit has been reached.', 429);
    return provisionWorkspace(client, `demo-${randomBytes(5).toString('hex')}`, name.trim(), password);
  });
  return { token: await sessionFor(record.adminId), code: record.code };
}
export async function authenticate(request: Request): Promise<Actor> {
  const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1); ensure(token && /^[\w-]{43}$/.test(token), 'Sign in to continue.', 401);
  const row = (await pool().query('SELECT u.id,u.workspace_id,u.username,u.display_name,u.role FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [tokenHash(token)])).rows[0];
  ensure(row, 'Your session has expired. Sign in again.', 401); return { id: row.id, workspaceId: row.workspace_id, username: row.username, name: row.display_name, role: row.role };
}
export function assertOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN; ensure(expected, 'APP_ORIGIN must be configured.', 503);
  ensure(request.headers.get('origin') === expected, 'This request origin is not allowed.', 403);
  ensure(request.headers.get('sec-fetch-site') !== 'cross-site', 'Cross-site commands are not allowed.', 403);
}
export async function logout(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
  if (cookie) await pool().query('DELETE FROM app_sessions WHERE token_hash=$1', [tokenHash(cookie.slice(COOKIE_NAME.length + 1))]);
}
