import { ensure, equipmentStats, costFor, mulDiv, interval } from '../../domain/engine';
import type { Actor } from '../../domain/types';
import type { ScenarioRecord } from '../ports/workshop-repository';
export type ReportRows = unknown[][];
export function createReportService(readScenario: (actor: Actor, id?: string) => Promise<ScenarioRecord>) {
    async function reportFor(actor: Actor, scenarioId: string | undefined, orderId?: string, fromDate?: string, toDate?: string, kind = 'orders') {
        ensure(actor.role !== 'Technician', 'Your role cannot export workshop reports.', 403);
        const { state } = await readScenario(actor, scenarioId);
        const financial = actor.role !== 'Warehouse clerk';
        const epoch = Date.parse('2026-11-20T09:00:00-05:00');
        const from = fromDate ? (Date.parse(`${fromDate}T00:00:00-05:00`) - epoch) / 60000 : -Infinity;
        const to = toDate ? (Date.parse(`${toDate}T23:59:59-05:00`) - epoch) / 60000 : state.clock.minute;
        ensure((Number.isFinite(from) || from === -Infinity) && Number.isFinite(to) && from <= to, 'Choose a valid report date range.');
        const table = (rows: ReportRows) => rows;
        ensure(['orders', 'materials', 'equipment', 'vehicles', 'technicians'].includes(kind), 'Unknown report type.', 400);
        if (kind === 'materials')
            return table([
                ['movement', 'kind', 'item', 'unit', 'quantity', 'order', 'technician', 'scenario_minute', 'value_cop', 'reference'],
                ...state.movements.filter(m => m.at >= from && m.at <= to && (!orderId || m.orderId === orderId)).map(m => [m.id, m.kind, m.itemId, state.items.find(i => i.id === m.itemId)?.unit, m.quantity / 1000, m.orderId || '', m.employeeId || '', m.at, (m.amountCents / 100).toFixed(2), m.reference]),
            ]);
        if (kind === 'equipment') {
            const equipment = orderId ? state.equipment.map(e => ({ ...e, segments: e.segments.filter(s => s.orderId === orderId) })) : state.equipment;
            return table([['equipment', 'working_minutes', 'idle_minutes', 'off_minutes', 'powered_unknown_minutes', 'unknown_power_minutes', 'coverage_ratio', 'utilization_ratio', 'known_estimated_energy_cop'], ...equipment.map(e => { const s = equipmentStats(state, e, from, to); return [e.id, s.working, s.idle, s.off, s.poweredUnknown, s.unknown, s.coverage, s.utilization, (s.energy / 100).toFixed(2)]; })]);
        }
        if (kind === 'vehicles' || kind === 'technicians') {
            ensure(financial, 'Your role cannot export financial breakdowns.', 403);
            if (kind === 'vehicles')
                return table([['vehicle', 'materials_cop', 'labor_cop', 'known_estimated_energy_cop', 'operating_cost_cop'], ...state.vehicles.map(v => {
                        const costs = state.orders.filter(o => o.vehicleId === v.id && (!orderId || o.id === orderId)).map(o => costFor(state, o.id, from, to, false));
                        return [v.name, ...(['materials', 'labor', 'energy', 'total'] as const).map(key => (costs.reduce((sum, c) => sum + c[key], 0) / 100).toFixed(2))];
                    })]);
            return table([['technician', 'attributed_net_materials_cop', 'active_labor_cop', 'materials_plus_labor_cop', 'energy_allocation'], ...state.employees.filter(e => e.role === 'Technician').map(e => {
                    const materials = state.movements.filter(m => m.employeeId === e.id && m.at >= from && m.at <= to && (!orderId || m.orderId === orderId)).reduce((sum, m) => sum + (m.kind === 'Issue' ? m.amountCents : m.kind === 'Return' ? -m.amountCents : 0), 0);
                    const labor = state.interventions.filter(i => i.employeeId === e.id && (!orderId || i.orderId === orderId)).reduce((sum, i) => sum + mulDiv(i.segments.reduce((minutes, s) => minutes + interval(s.start, s.end ?? state.clock.minute, from, to), 0), i.hourlyRateCents, 60), 0);
                    return [e.name, (materials / 100).toFixed(2), (labor / 100).toFixed(2), ((materials + labor) / 100).toFixed(2), 'Allocated to service orders only'];
                })]);
        }
        const header = financial ? ['order', 'status', 'materials_cop', 'labor_cop', 'known_estimated_energy_cop', 'period_operating_cost_cop', 'unknown_minutes'] : ['order', 'status', 'materials_cop'];
        const lines = state.orders.filter(order => !orderId || order.id === orderId).map(order => { const cost = costFor(state, order.id, from, to, false); return financial ? [order.id, order.status, (cost.materials / 100).toFixed(2), (cost.labor / 100).toFixed(2), (cost.energy / 100).toFixed(2), (cost.total / 100).toFixed(2), cost.unknownMinutes] : [order.id, order.status, (cost.materials / 100).toFixed(2)]; });
        return table([header, ...lines]);
    }
    return { reportFor };
}
