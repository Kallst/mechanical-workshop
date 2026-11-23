import type { PoolClient } from 'pg';
import type { Actor, WorkshopState } from '../../../../domain/types';
import type { IdentityRepository, IdentityUnitOfWork, NewUser } from '../../../../application/ports/identity-repository';
import type { AuditEntry } from '../../../../application/ports/workshop-repository';
import { pool, transaction } from './pool';
import { writeAudit } from './audit';
class PostgresIdentityUnit implements IdentityUnitOfWork {
    constructor(private readonly client: PoolClient) { }
    async lockAccount(key: string) { await this.client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]); }
    async removeExpiredAttempts(retentionSeconds: number) { await this.client.query("DELETE FROM login_attempts WHERE attempted_at < now()-$1 * interval '1 second'", [retentionSeconds]); }
    async recentAttempts(key: string, windowSeconds: number) { return Number((await this.client.query("SELECT count(*)::int AS count FROM login_attempts WHERE account_key=$1 AND attempted_at > now()-$2 * interval '1 second'", [key, windowSeconds])).rows[0].count); }
    async recordAttempt(key: string) { await this.client.query('INSERT INTO login_attempts(account_key) VALUES($1)', [key]); }
    async findAccount(code: string, username: string) { const row = (await this.client.query('SELECT u.* FROM app_users u JOIN workspaces w ON w.id=u.workspace_id WHERE w.code=$1 AND u.username=$2 FOR UPDATE OF u', [code, username])).rows[0]; return row ? { id: String(row.id), passwordHash: String(row.password_hash), failedAttempts: Number(row.failed_attempts), lockedUntil: row.locked_until ? new Date(row.locked_until).getTime() : null } : undefined; }
    async recordFailedLogin(id: string, failures: number, lockSeconds: number | null) { await this.client.query("UPDATE app_users SET failed_attempts=$2,locked_until=CASE WHEN $3::integer IS NULL THEN NULL ELSE now()+$3 * interval '1 second' END WHERE id=$1", [id, failures, lockSeconds]); }
    async clearFailedLogins(id: string) { await this.client.query('UPDATE app_users SET failed_attempts=0,locked_until=NULL WHERE id=$1', [id]); }
    async lockProvisioning() { await this.client.query('SELECT pg_advisory_xact_lock(713209125)'); }
    async workspaceCount() { return Number((await this.client.query('SELECT count(*) FROM workspaces')).rows[0].count); }
    async workspaceExists(code: string) { return Boolean((await this.client.query('SELECT id FROM workspaces WHERE code=$1', [code])).rowCount); }
    async createWorkspace(id: string, code: string, name: string) { await this.client.query('INSERT INTO workspaces(id,code,name) VALUES($1,$2,$3)', [id, code, name]); }
    async createUser(user: NewUser) { await this.client.query('INSERT INTO app_users(id,workspace_id,username,display_name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)', [user.id, user.workspaceId, user.username, user.name, user.role, user.passwordHash]); }
    async createScenario(id: string, workspaceId: string, name: string, state: WorkshopState) { await this.client.query('INSERT INTO scenarios(id,workspace_id,name,state) VALUES($1,$2,$3,$4)', [id, workspaceId, name, JSON.stringify(state)]); }
    async appendAudit(entry: AuditEntry) { await writeAudit(this.client, entry); }
}
export class PostgresIdentityRepository implements IdentityRepository {
    transaction<T>(operation: (unit: IdentityUnitOfWork) => Promise<T>): Promise<T> { return transaction(client => operation(new PostgresIdentityUnit(client))); }
    async createSession(userId: string, tokenHash: string, ttlSeconds: number) { await pool().query("INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+$3 * interval '1 second')", [tokenHash, userId, ttlSeconds]); }
    async actorForSession(hash: string): Promise<Actor | undefined> { const row = (await pool().query('SELECT u.id,u.workspace_id,u.username,u.display_name,u.role FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [hash])).rows[0]; return row ? { id: row.id, workspaceId: row.workspace_id, username: row.username, name: row.display_name, role: row.role } : undefined; }
    async revokeSession(hash: string) { await pool().query('DELETE FROM app_sessions WHERE token_hash=$1', [hash]); }
}
