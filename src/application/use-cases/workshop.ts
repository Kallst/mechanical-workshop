import { z } from 'zod';
import { applyCommand, comparePolicies, costFor, ensure, equipmentStats, replenishment, settleClock } from '../../domain/engine';
import type { Actor } from '../../domain/types';
import type { WorkshopRepository, CommandResult } from '../ports/workshop-repository';
import type { SecurityPort } from '../ports/security';
const envelope = z.object({ scenarioId: z.string().uuid(), key: z.string().uuid(), action: z.string().min(1).max(100), payload: z.record(z.string(), z.unknown()) }).strict();
function canonical(value: unknown): string { if (Array.isArray(value))
    return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`; return JSON.stringify(value); }
export function createWorkshopService(repository: WorkshopRepository, security: Pick<SecurityPort, 'digest'>) {
    async function contextFor(actor: Actor) { return { actor, ...await repository.context(actor.workspaceId) }; }
    async function commandFor(actor: Actor, input: unknown) {
        const command = envelope.parse(input), hash = security.digest(canonical({ action: command.action, payload: command.payload }));
        return repository.transaction(async (unit) => {
            const row = await unit.findScenario(actor.workspaceId, command.scenarioId);
            ensure(row, 'Scenario not found.', 404);
            const receipt = await unit.findReceipt(command.scenarioId, command.key);
            if (receipt) {
                ensure(receipt.actorId === actor.id && receipt.payloadHash === hash, 'This command key has already been used for different input.', 409);
                return { ...receipt.result, replayed: true };
            }
            const state = row.state;
            settleClock(state);
            const audit = applyCommand(state, actor, command);
            const revision = row.revision + 1;
            await unit.saveScenario(row.id, state, revision);
            await unit.appendAudit({ workspaceId: actor.workspaceId, scenarioId: row.id, actorId: actor.id, actorName: actor.name, action: audit.action, details: audit.details, minute: state.clock.minute });
            const result: CommandResult = { revision, action: audit.action, details: audit.details, replayed: false };
            await unit.saveReceipt(row.id, command.key, actor.id, hash, result);
            return result;
        });
    }
    async function readScenario(actor: Actor, id?: string) {
        if (id)
            ensure(z.string().uuid().safeParse(id).success, 'Invalid scenario reference.', 400);
        return repository.transaction(async (unit) => {
            const row = await unit.findScenario(actor.workspaceId, id);
            ensure(row, 'Scenario not found.', 404);
            const state = row.state, alertsBefore = state.alerts.length;
            if (settleClock(state)) {
                row.revision++;
                await unit.saveScenario(row.id, state, row.revision);
                if (state.alerts.length > alertsBefore)
                    await unit.appendAudit({ workspaceId: actor.workspaceId, scenarioId: row.id, actorName: 'Simulation clock', action: 'alert.detected', details: { newAlerts: state.alerts.length - alertsBefore }, minute: state.clock.minute });
            }
            return row;
        });
    }
    async function snapshotFor(actor: Actor, scenarioId?: string) {
        const scenario = await readScenario(actor, scenarioId);
        const full = scenario.state;
        const state = structuredClone(full);
        const technician = actor.role === 'Technician';
        const financial = ['Administrator', 'Workshop manager'].includes(actor.role);
        const allowedOrderIds = technician ? new Set(full.orders.filter(order => order.assigned.includes(actor.username)).map(order => order.id)) : new Set(full.orders.map(order => order.id));
        state.orders = state.orders.filter(order => allowedOrderIds.has(order.id));
        state.requests = state.requests.filter(request => !technician || request.employeeId === actor.username);
        state.movements = state.movements.filter(movement => !technician || (movement.orderId && allowedOrderIds.has(movement.orderId)));
        if (!financial) {
            state.interventions = technician ? state.interventions.filter(intervention => intervention.employeeId === actor.username) : [];
            state.interventions.forEach(intervention => { intervention.hourlyRateCents = 0; });
            state.employees.forEach(employee => { employee.hourlyRateCents = 0; });
            state.orders.forEach(order => { delete order.snapshot; });
            state.invoices = [];
        }
        if (technician) {
            state.purchases = [];
            state.events = [];
            state.equipment = [];
            state.alerts = [];
        }
        const costs = Object.fromEntries(state.orders.map(order => { const value = costFor(full, order.id); return [order.id, financial ? value : { materials: value.materials, labor: null, energy: null, total: null, unknownMinutes: null }]; }));
        const audit = actor.role === 'Administrator' ? await repository.audit(actor.workspaceId, scenario.id) : [];
        return { actor, scenario: { id: scenario.id, name: scenario.name, revision: scenario.revision }, state, costs, suggestions: technician ? [] : full.items.map(item => ({ itemId: item.id, ...replenishment(full, item) })), equipmentStats: technician ? {} : Object.fromEntries(full.equipment.map(equipment => [equipment.id, equipmentStats(full, equipment)])), audit, comparison: actor.role === 'Administrator' ? comparePolicies() : null };
    }
    return { contextFor, commandFor, readScenario, snapshotFor };
}
export type WorkshopService = ReturnType<typeof createWorkshopService>;
export type WorkshopSnapshot = Awaited<ReturnType<WorkshopService['snapshotFor']>>;
export type WorkshopContext = Awaited<ReturnType<WorkshopService['contextFor']>>;
