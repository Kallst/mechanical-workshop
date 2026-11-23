import type { WorkshopState } from '../../domain/types';
export interface ScenarioRecord {
    id: string;
    name: string;
    revision: number;
    state: WorkshopState;
}
export interface ScenarioSummary {
    id: string;
    name: string;
    revision: string;
}
export interface WorkspaceContext {
    workspace: {
        code: string;
        name: string;
    };
    scenarios: ScenarioSummary[];
}
export interface CommandResult {
    revision: number;
    action: string;
    details: Record<string, unknown>;
    replayed: boolean;
}
export interface CommandReceipt {
    actorId: string;
    payloadHash: string;
    result: CommandResult;
}
export interface AuditEntry {
    workspaceId: string;
    scenarioId: string;
    actorId?: string;
    actorName: string;
    action: string;
    details: Record<string, unknown>;
    minute: number;
}
export interface AuditRecord {
    actor_name: string;
    action: string;
    details: Record<string, unknown>;
    scenario_minute: number;
    recorded_at: string;
}
/** All methods in this unit share one transaction and the same scenario row lock. */
export interface WorkshopUnitOfWork {
    findScenario(workspaceId: string, scenarioId?: string): Promise<ScenarioRecord | undefined>;
    findReceipt(scenarioId: string, key: string): Promise<CommandReceipt | undefined>;
    saveScenario(id: string, state: WorkshopState, revision: number): Promise<void>;
    appendAudit(entry: AuditEntry): Promise<void>;
    saveReceipt(scenarioId: string, key: string, actorId: string, payloadHash: string, result: CommandResult): Promise<void>;
}
export interface WorkshopRepository {
    context(workspaceId: string): Promise<WorkspaceContext>;
    audit(workspaceId: string, scenarioId: string): Promise<AuditRecord[]>;
    transaction<T>(operation: (unit: WorkshopUnitOfWork) => Promise<T>): Promise<T>;
}
