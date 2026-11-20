import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { applyCommand, comparePolicies, costFor, DomainError, ensure, equipmentStats, interval, mulDiv, replenishment, settleClock } from '../domain/engine';
import type { Actor, WorkshopState } from '../domain/types';
import { pool, transaction } from './db';
const envelope = z.object({ scenarioId: z.string().uuid(), key: z.string().uuid(), action: z.string().min(1).max(100), payload: z.record(z.string(), z.unknown()) }).strict();
export async function contextFor(actor: Actor) {
  const workspace = (await pool().query('SELECT code,name FROM workspaces WHERE id=$1', [actor.workspaceId])).rows[0];
  const scenarios = (await pool().query('SELECT id,name,revision FROM scenarios WHERE workspace_id=$1 ORDER BY created_at', [actor.workspaceId])).rows;
  return { actor, workspace, scenarios };
}
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`; return JSON.stringify(value); }
export async function commandFor(actor: Actor, input: unknown) {
  const command = envelope.parse(input); const hash = createHash('sha256').update(canonical({ action: command.action, payload: command.payload })).digest('hex');
  return transaction(async client => {
    const row = (await client.query('SELECT state,revision FROM scenarios WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [command.scenarioId, actor.workspaceId])).rows[0]; ensure(row, 'Scenario not found.', 404);
    const receipt = (await client.query('SELECT actor_id,payload_hash,result FROM command_receipts WHERE scenario_id=$1 AND command_key=$2', [command.scenarioId, command.key])).rows[0];
    if (receipt) { ensure(receipt.actor_id === actor.id && receipt.payload_hash === hash, 'This command key has already been used for different input.', 409); return { ...receipt.result, replayed: true }; }
    const state = row.state as WorkshopState; settleClock(state);
    const audit = applyCommand(state, actor, command); const revision = Number(row.revision) + 1;
    await client.query('UPDATE scenarios SET state=$2,revision=$3,updated_at=now() WHERE id=$1', [command.scenarioId, JSON.stringify(state), revision]);
    await client.query('INSERT INTO audit_events(id,workspace_id,scenario_id,actor_id,actor_name,action,details,scenario_minute) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), actor.workspaceId, command.scenarioId, actor.id, actor.name, audit.action, JSON.stringify(audit.details), state.clock.minute]);
    const result = { revision, action: audit.action, details: audit.details, replayed: false };
    await client.query('INSERT INTO command_receipts(scenario_id,command_key,actor_id,payload_hash,result) VALUES($1,$2,$3,$4,$5)', [command.scenarioId, command.key, actor.id, hash, JSON.stringify(result)]);
    return result;
  });
}
export async function readScenario(actor: Actor, id?: string) {
  if (id) ensure(z.string().uuid().safeParse(id).success, 'Invalid scenario reference.', 400);
  return transaction(async client => {
    const row = (id ? await client.query('SELECT * FROM scenarios WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [id, actor.workspaceId]) : await client.query('SELECT * FROM scenarios WHERE workspace_id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE', [actor.workspaceId])).rows[0]; ensure(row, 'Scenario not found.', 404);
    const state = row.state as WorkshopState; const alertsBefore = state.alerts.length;
    if (settleClock(state)) {
      row.revision = Number(row.revision) + 1;
      await client.query('UPDATE scenarios SET state=$2,revision=$3,updated_at=now() WHERE id=$1', [row.id, JSON.stringify(state), row.revision]);
      if (state.alerts.length > alertsBefore) await client.query('INSERT INTO audit_events(id,workspace_id,scenario_id,actor_name,action,details,scenario_minute) VALUES($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), actor.workspaceId, row.id, 'Simulation clock', 'alert.detected', JSON.stringify({ newAlerts: state.alerts.length - alertsBefore }), state.clock.minute]);
    }
    return { id: row.id as string, name: row.name as string, revision: Number(row.revision), state };
  });
}
export async function snapshotFor(actor: Actor, scenarioId?: string) {
  const scenario = await readScenario(actor, scenarioId); const full = scenario.state;
  const state = structuredClone(full); const technician = actor.role === 'Technician'; const financial = ['Administrator', 'Workshop manager'].includes(actor.role);
  const allowedOrderIds = technician ? new Set(full.orders.filter(order => order.assigned.includes(actor.username)).map(order => order.id)) : new Set(full.orders.map(order => order.id));
  state.orders = state.orders.filter(order => allowedOrderIds.has(order.id));
  state.requests = state.requests.filter(request => !technician || request.employeeId === actor.username);
  state.movements = state.movements.filter(movement => !technician || (movement.orderId && allowedOrderIds.has(movement.orderId)));
  if (!financial) { state.interventions = technician ? state.interventions.filter(intervention => intervention.employeeId === actor.username) : []; state.interventions.forEach(intervention => { intervention.hourlyRateCents = 0; }); state.employees.forEach(employee => { employee.hourlyRateCents = 0; }); state.orders.forEach(order => { delete order.snapshot; }); state.invoices = []; }
  if (technician) { state.purchases = []; state.events = []; state.equipment = []; state.alerts = []; }
  const costs = Object.fromEntries(state.orders.map(order => { const value = costFor(full, order.id); return [order.id, financial ? value : { materials: value.materials, labor: null, energy: null, total: null, unknownMinutes: null }]; }));
  const audit = actor.role === 'Administrator' ? (await pool().query('SELECT actor_name,action,details,scenario_minute,recorded_at FROM audit_events WHERE scenario_id=$1 AND workspace_id=$2 ORDER BY recorded_at DESC LIMIT 100', [scenario.id, actor.workspaceId])).rows : [];
  return { actor, scenario: { id: scenario.id, name: scenario.name, revision: scenario.revision }, state, costs, suggestions: technician ? [] : full.items.map(item => ({ itemId: item.id, ...replenishment(full, item) })), equipmentStats: technician ? {} : Object.fromEntries(full.equipment.map(equipment => [equipment.id, equipmentStats(full, equipment)])), audit, comparison: actor.role === 'Administrator' ? comparePolicies() : null };
}
export async function csvFor(actor: Actor, scenarioId: string | undefined, orderId?: string, fromDate?: string, toDate?: string, kind = 'orders') {
  ensure(actor.role !== 'Technician', 'Your role cannot export workshop reports.', 403);
  const { state } = await readScenario(actor, scenarioId); const financial = actor.role !== 'Warehouse clerk';
  const epoch = Date.parse('2026-11-20T09:00:00-05:00');
  const from = fromDate ? (Date.parse(`${fromDate}T00:00:00-05:00`) - epoch) / 60000 : -Infinity;
  const to = toDate ? (Date.parse(`${toDate}T23:59:59-05:00`) - epoch) / 60000 : state.clock.minute;
  ensure((Number.isFinite(from) || from === -Infinity) && Number.isFinite(to) && from <= to, 'Choose a valid report date range.');
  const cell = (value: unknown) => `"${String(typeof value === 'string' && /^[=+@-]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const csv = (rows: unknown[][]) => rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
  ensure(['orders', 'materials', 'equipment', 'vehicles', 'technicians'].includes(kind), 'Unknown report type.', 400);
  if (kind === 'materials') return csv([
    ['movement', 'kind', 'item', 'unit', 'quantity', 'order', 'technician', 'scenario_minute', 'value_cop', 'reference'],
    ...state.movements.filter(m => m.at >= from && m.at <= to && (!orderId || m.orderId === orderId)).map(m => [m.id, m.kind, m.itemId, state.items.find(i => i.id === m.itemId)?.unit, m.quantity / 1000, m.orderId || '', m.employeeId || '', m.at, (m.amountCents / 100).toFixed(2), m.reference]),
  ]);
  if (kind === 'equipment') {
    const equipment = orderId ? state.equipment.map(e => ({ ...e, segments: e.segments.filter(s => s.orderId === orderId) })) : state.equipment;
    return csv([['equipment', 'working_minutes', 'idle_minutes', 'off_minutes', 'powered_unknown_minutes', 'unknown_power_minutes', 'coverage_ratio', 'utilization_ratio', 'known_estimated_energy_cop'], ...equipment.map(e => { const s = equipmentStats(state, e, from, to); return [e.id, s.working, s.idle, s.off, s.poweredUnknown, s.unknown, s.coverage, s.utilization, (s.energy / 100).toFixed(2)]; })]);
  }
  if (kind === 'vehicles' || kind === 'technicians') {
    ensure(financial, 'Your role cannot export financial breakdowns.', 403);
    if (kind === 'vehicles') return csv([['vehicle', 'materials_cop', 'labor_cop', 'known_estimated_energy_cop', 'operating_cost_cop'], ...state.vehicles.map(v => {
      const costs = state.orders.filter(o => o.vehicleId === v.id && (!orderId || o.id === orderId)).map(o => costFor(state, o.id, from, to, false));
      return [v.name, ...(['materials','labor','energy','total'] as const).map(key => (costs.reduce((sum, c) => sum + c[key], 0) / 100).toFixed(2))];
    })]);
    return csv([['technician', 'attributed_net_materials_cop', 'active_labor_cop', 'materials_plus_labor_cop', 'energy_allocation'], ...state.employees.filter(e => e.role === 'Technician').map(e => {
      const materials = state.movements.filter(m => m.employeeId === e.id && m.at >= from && m.at <= to && (!orderId || m.orderId === orderId)).reduce((sum,m) => sum + (m.kind === 'Issue' ? m.amountCents : m.kind === 'Return' ? -m.amountCents : 0), 0);
      const labor = state.interventions.filter(i => i.employeeId === e.id && (!orderId || i.orderId === orderId)).reduce((sum,i) => sum + mulDiv(i.segments.reduce((minutes,s) => minutes + interval(s.start,s.end ?? state.clock.minute,from,to),0),i.hourlyRateCents,60),0);
      return [e.name, (materials/100).toFixed(2), (labor/100).toFixed(2), ((materials+labor)/100).toFixed(2), 'Allocated to service orders only'];
    })]);
  }
  const header = financial ? ['order', 'status', 'materials_cop', 'labor_cop', 'known_estimated_energy_cop', 'period_operating_cost_cop', 'unknown_minutes'] : ['order', 'status', 'materials_cop'];
  const lines = state.orders.filter(order => !orderId || order.id === orderId).map(order => { const cost = costFor(state, order.id, from, to, false); return financial ? [order.id, order.status, (cost.materials / 100).toFixed(2), (cost.labor / 100).toFixed(2), (cost.energy / 100).toFixed(2), (cost.total / 100).toFixed(2), cost.unknownMinutes] : [order.id, order.status, (cost.materials / 100).toFixed(2)]; });
  return [header, ...lines].map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function publicError(error: unknown) {
  if (error instanceof DomainError) return { error: error.message, status: error.status };
  if (error instanceof z.ZodError || error instanceof SyntaxError) return { error: 'The request format is invalid.', status: 400 };
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === '23505') return { error: 'This record already exists. Refresh and try again.', status: 409 };
  console.error('Workshop request failed:', error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database]') : 'Unknown error');
  return { error: 'The operation could not be completed. No partial change was saved.', status: 500 };
}
