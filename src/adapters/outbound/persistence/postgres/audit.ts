import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AuditEntry } from '../../../../application/ports/workshop-repository';
export async function writeAudit(client: PoolClient, entry: AuditEntry) {
    await client.query('INSERT INTO audit_events(id,workspace_id,scenario_id,actor_id,actor_name,action,details,scenario_minute) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), entry.workspaceId, entry.scenarioId, entry.actorId || null, entry.actorName, entry.action, JSON.stringify(entry.details), entry.minute]);
}
