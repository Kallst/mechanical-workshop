import type { PoolClient } from 'pg';
import type { WorkshopState } from '../../../../domain/types';
import type { WorkshopRepository, WorkshopUnitOfWork, CommandResult, AuditEntry, AuditRecord } from '../../../../application/ports/workshop-repository';
import { pool, transaction } from './pool';
import { writeAudit } from './audit';
class PostgresWorkshopUnit implements WorkshopUnitOfWork {
    constructor(private readonly client: PoolClient) { }
    async findScenario(workspaceId: string, id?: string) {
        const row = (id ? await this.client.query('SELECT * FROM scenarios WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [id, workspaceId]) : await this.client.query('SELECT * FROM scenarios WHERE workspace_id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE', [workspaceId])).rows[0];
        return row ? { id: row.id as string, name: row.name as string, revision: Number(row.revision), state: row.state as WorkshopState } : undefined;
    }
    async findReceipt(scenarioId: string, key: string) {
        const row = (await this.client.query('SELECT actor_id,payload_hash,result FROM command_receipts WHERE scenario_id=$1 AND command_key=$2', [scenarioId, key])).rows[0];
        return row ? { actorId: row.actor_id as string, payloadHash: row.payload_hash as string, result: row.result as CommandResult } : undefined;
    }
    async saveScenario(id: string, state: WorkshopState, revision: number) { await this.client.query('UPDATE scenarios SET state=$2,revision=$3,updated_at=now() WHERE id=$1', [id, JSON.stringify(state), revision]); }
    async appendAudit(entry: AuditEntry) { await writeAudit(this.client, entry); }
    async saveReceipt(scenarioId: string, key: string, actorId: string, payloadHash: string, result: CommandResult) { await this.client.query('INSERT INTO command_receipts(scenario_id,command_key,actor_id,payload_hash,result) VALUES($1,$2,$3,$4,$5)', [scenarioId, key, actorId, payloadHash, JSON.stringify(result)]); }
}
export class PostgresWorkshopRepository implements WorkshopRepository {
    async context(workspaceId: string) {
        const workspace = (await pool().query('SELECT code,name FROM workspaces WHERE id=$1', [workspaceId])).rows[0] as {
            code: string;
            name: string;
        };
        const rows = (await pool().query('SELECT id,name,revision FROM scenarios WHERE workspace_id=$1 ORDER BY created_at', [workspaceId])).rows;
        return { workspace, scenarios: rows.map(row => ({ id: String(row.id), name: String(row.name), revision: String(row.revision) })) };
    }
    async audit(workspaceId: string, scenarioId: string): Promise<AuditRecord[]> {
        const rows = (await pool().query('SELECT actor_name,action,details,scenario_minute,recorded_at FROM audit_events WHERE scenario_id=$1 AND workspace_id=$2 ORDER BY recorded_at DESC LIMIT 100', [scenarioId, workspaceId])).rows;
        return rows.map(row => ({ ...row, recorded_at: new Date(row.recorded_at).toISOString() })) as AuditRecord[];
    }
    transaction<T>(operation: (unit: WorkshopUnitOfWork) => Promise<T>): Promise<T> { return transaction(client => operation(new PostgresWorkshopUnit(client))); }
}
