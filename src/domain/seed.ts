import type { Employee, Movement, WorkshopState } from './types';
export const employees: Employee[] = [
  { id: 'tamara', name: 'Tamara', role: 'Administrator', hourlyRateCents: 0 },
  { id: 'juan-jacobo', name: 'Juan Jacobo', role: 'Workshop manager', hourlyRateCents: 0 },
  { id: 'juanita', name: 'Juanita', role: 'Warehouse clerk', hourlyRateCents: 0 },
  ...[['brian', 'Brian'], ['nicolas', 'Nicolás'], ['alan', 'Álan'], ['anderson', 'Anderson']].map(([id, name]) => ({ id, name, role: 'Technician' as const, hourlyRateCents: 6000000 })),
];
export function createBaseline(now = Date.now()): WorkshopState {
  const movement = (id: string, itemId: string, quantity: number, price: number, at: number, orderId?: string, employeeId?: string): Movement => ({ id, kind: orderId ? 'Issue' : 'Receipt', itemId, quantity, unitCostCents: price, amountCents: Math.round(Math.abs(quantity) * price / 1000), at, actor: 'Synthetic baseline', reference: 'Synthetic opening scenario', orderId, employeeId });
  return {
    version: 1, clock: { minute: 70, running: false, speed: 30, wallAt: now, remainderMs: 0 }, sequence: 1100,
    employees: structuredClone(employees),
    customers: [{ id: 'CUS-01', name: 'Andes Freight', contact: 'Fleet operations' }, { id: 'CUS-02', name: 'Summit Transit', contact: 'Maintenance desk' }, { id: 'CUS-03', name: 'Highland Earthworks', contact: 'Workshop coordinator' }],
    vehicles: [{ id: 'VEH-01', customerId: 'CUS-01', name: 'Volvo FH 460', plate: 'TRK-042', kind: 'Truck' }, { id: 'VEH-02', customerId: 'CUS-02', name: 'Mercedes-Benz O 500', plate: 'BUS-018', kind: 'Bus' }, { id: 'VEH-03', customerId: 'CUS-03', name: 'Komatsu PC200', plate: 'EXC-007', kind: 'Heavy machinery' }],
    orders: [
      { id: 'SO-1042', vehicleId: 'VEH-01', description: 'Scheduled maintenance and hydraulic inspection', status: 'In progress', assigned: ['nicolas', 'brian'], createdAt: -30 },
      { id: 'SO-1043', vehicleId: 'VEH-02', description: 'Brake inspection and preventive maintenance', status: 'Open', assigned: ['alan'], createdAt: 30 },
      { id: 'SO-1041', vehicleId: 'VEH-03', description: 'Hydraulic system maintenance', status: 'Closed', assigned: ['anderson'], createdAt: -180, closedAt: 0, snapshot: { materials: 22000000, labor: 12000000, energy: 660000, total: 34660000, unknownMinutes: 0 } },
    ],
    items: [
      { id: 'filter', name: 'Heavy-duty oil filter', sku: 'FLT-004', unit: 'unit', stock: 4000, unitCostCents: 8500000, dailyDemand: 1000, leadDays: 3, safety: 2000, pack: 1000 },
      { id: 'oil', name: 'Hydraulic oil ISO 46', sku: 'OIL-046', unit: 'L', stock: 60000, unitCostCents: 1800000, dailyDemand: 5000, leadDays: 3, safety: 10000, pack: 5000 },
      { id: 'pads', name: 'Heavy-duty brake pad set', sku: 'BRK-012', unit: 'set', stock: 8000, unitCostCents: 12000000, dailyDemand: 500, leadDays: 4, safety: 2000, pack: 1000 },
      { id: 'hose', name: 'Hydraulic hose assembly', sku: 'HYD-008', unit: 'unit', stock: 3000, unitCostCents: 11000000, dailyDemand: 250, leadDays: 4, safety: 1000, pack: 1000 },
    ],
    requests: [{ id: 'REQ-208', orderId: 'SO-1042', employeeId: 'nicolas', itemId: 'filter', quantity: 2000, fulfilled: 0, cancelled: false, at: 65 }],
    movements: [movement('MOV-01', 'filter', 6000, 8500000, -180), movement('MOV-02', 'oil', 70000, 1800000, -180), movement('MOV-03', 'pads', 8000, 12000000, -180), movement('MOV-04', 'hose', 5000, 11000000, -180), movement('MOV-05', 'hose', -2000, 11000000, -100, 'SO-1041', 'anderson'), movement('MOV-06', 'filter', -2000, 8500000, 15, 'SO-1042', 'nicolas'), movement('MOV-07', 'oil', -10000, 1800000, 40, 'SO-1042', 'nicolas')],
    interventions: [{ id: 'INT-01', orderId: 'SO-1042', employeeId: 'nicolas', status: 'Running', segments: [{ start: 0, end: null }], hourlyRateCents: 6000000, outcome: '' }, { id: 'INT-02', orderId: 'SO-1041', employeeId: 'anderson', status: 'Completed', segments: [{ start: -120, end: 0 }], hourlyRateCents: 6000000, outcome: 'Synthetic historical maintenance completed.' }],
    equipment: [
      { id: 'C-01', name: 'Air compressor', workWatts: 5000, idleWatts: 1200, tariffCents: 90000, segments: [{ id: 'SEG-01', status: 'Working', start: 0, end: 60, orderId: 'SO-1042', workWatts: 5000, idleWatts: 1200, tariffCents: 90000 }, { id: 'SEG-02', status: 'Idle', start: 60, end: null, orderId: 'SO-1042', workWatts: 5000, idleWatts: 1200, tariffCents: 90000 }] },
      { id: 'L-02', name: 'Hydraulic lift', workWatts: 5500, idleWatts: 500, tariffCents: 90000, segments: [{ id: 'SEG-03', status: 'Working', start: -80, end: 0, orderId: 'SO-1041', workWatts: 5500, idleWatts: 500, tariffCents: 90000 }, { id: 'SEG-04', status: 'Off', start: 0, end: null, orderId: null, workWatts: 5500, idleWatts: 500, tariffCents: 90000 }] },
      { id: 'W-03', name: 'Welding station', workWatts: 7000, idleWatts: 300, tariffCents: 90000, segments: [{ id: 'SEG-05', status: 'Off', start: 0, end: null, orderId: null, workWatts: 7000, idleWatts: 300, tariffCents: 90000 }] },
    ],
    events: [], alerts: [], purchases: [],
    invoices: [{ id: 'INV-1041', orderId: 'SO-1041', at: 0, cost: { materials: 22000000, labor: 12000000, energy: 660000, total: 34660000, unknownMinutes: 0 }, customer: 'Highland Earthworks', vehicle: 'Komatsu PC200 · EXC-007', description: 'Hydraulic system maintenance', issuedBy: 'Synthetic baseline' }],
  };
}
