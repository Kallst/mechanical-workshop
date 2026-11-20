import { createBaseline } from './seed';
import type { Actor, AuditEvent, Command, Cost, Equipment, EquipmentStatus, Item, Role, WorkshopState } from './types';

export class DomainError extends Error { constructor(message: string, public status = 422) { super(message); this.name = 'DomainError'; } }
export function ensure(condition: unknown, message: string, status = 422): asserts condition { if (!condition) throw new DomainError(message, status); }
export function fixed(value: unknown, scale: number, signed = false): number {
  const text = String(value ?? ''); const digits = Math.log10(scale);
  ensure(new RegExp(`^${signed ? '-?' : ''}\\d{1,8}(?:\\.\\d{1,${digits}})?$`).test(text), `Enter a valid ${signed ? 'signed ' : ''}number with at most ${digits} decimal places.`);
  const sign = text.startsWith('-') ? -1 : 1; const [whole, fraction = ''] = text.replace('-', '').split('.');
  const result = sign * (Number(whole) * scale + Number(fraction.padEnd(digits, '0')));
  ensure(Number.isSafeInteger(result) && Math.abs(result) <= 100000000000, 'The amount exceeds the supported range.'); return result;
}
export function mulDiv(a: number, b: number, denominator: number): number {
  const product = BigInt(a) * BigInt(b); const divisor = BigInt(denominator);
  const value = Number((product + divisor / 2n) / divisor);
  ensure(Number.isSafeInteger(value) && Math.abs(value) <= 900000000000000, 'The calculated amount exceeds the supported range.'); return value;
}
function text(value: unknown, label: string, min = 1, max = 200): string { ensure(typeof value === 'string' && value.trim().length >= min && value.trim().length <= max, `${label} must contain ${min}–${max} characters.`); return value.trim(); }
function number(value: unknown, min: number, max: number) { ensure(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max, `Enter a whole number between ${min} and ${max}.`); return value; }
function positive(value: unknown, scale = 1000) { const result = fixed(value, scale); ensure(result > 0, 'The amount must be greater than zero.'); return result; }
function permit(actor: Actor, allowed: Role[]) { ensure(allowed.includes(actor.role), 'Your role cannot perform this operation.', 403); }
function next(state: WorkshopState, prefix: string) { return `${prefix}-${state.sequence++}`; }
const workStates = ['Open', 'In progress'];
const finalStates = ['Closed', 'Cancelled'];
const latest = (equipment: Equipment) => equipment.segments[equipment.segments.length - 1];
function getOrder(state: WorkshopState, value: unknown) { const order = state.orders.find(entry => entry.id === value); ensure(order, 'Service order not found.', 404); return order; }
function getItem(state: WorkshopState, value: unknown) { const item = state.items.find(entry => entry.id === value); ensure(item, 'Material not found.', 404); return item; }
function pending(state: WorkshopState, orderId: string) { return state.requests.some(request => request.orderId === orderId && !request.cancelled && request.fulfilled < request.quantity); }
function blockedEquipment(state: WorkshopState, orderId: string) { return state.equipment.some(equipment => latest(equipment).orderId === orderId && latest(equipment).status !== 'Off'); }
export function interval(start: number, end: number, from = -Infinity, to = Infinity) { return Math.max(0, Math.min(end, to) - Math.max(start, from)); }
export function equipmentStats(state: WorkshopState, equipment: Equipment, from = 0, to = state.clock.minute) {
  const result = { working: 0, idle: 0, off: 0, poweredUnknown: 0, unknown: 0, energy: 0, powered: 0, coverage: 1, utilization: 0 };
  for (const segment of equipment.segments) {
    const minutes = interval(segment.start, segment.end ?? state.clock.minute, from, to);
    if (segment.status === 'Working') { result.working += minutes; result.energy += mulDiv(minutes, segment.workWatts * segment.tariffCents, 60000); }
    if (segment.status === 'Idle') { result.idle += minutes; result.energy += mulDiv(minutes, segment.idleWatts * segment.tariffCents, 60000); }
    if (segment.status === 'Off') result.off += minutes;
    if (segment.status === 'Powered unknown activity') result.poweredUnknown += minutes;
    if (segment.status === 'Unknown power') result.unknown += minutes;
  }
  result.powered = result.working + result.idle + result.poweredUnknown;
  const observed = result.working + result.idle + result.off;
  const all = observed + result.unknown + result.poweredUnknown;
  result.coverage = all ? observed / all : 1; result.utilization = result.powered ? result.working / result.powered : 0; return result;
}
export function costFor(state: WorkshopState, orderId: string, from = -Infinity, to = state.clock.minute, snapshot = true): Cost {
  const order = getOrder(state, orderId);
  if (snapshot && from === -Infinity && to === state.clock.minute && order.snapshot) return structuredClone(order.snapshot);
  let materials = 0, labor = 0, energy = 0, unknownMinutes = 0;
  for (const movement of state.movements.filter(entry => entry.orderId === orderId && entry.at >= from && entry.at <= to)) {
    if (movement.kind === 'Issue') materials += movement.amountCents;
    if (movement.kind === 'Return') materials -= movement.amountCents;
  }
  for (const intervention of state.interventions.filter(entry => entry.orderId === orderId)) {
    const minutes = intervention.segments.reduce((sum, segment) => sum + interval(segment.start, segment.end ?? state.clock.minute, from, to), 0);
    labor += mulDiv(minutes, intervention.hourlyRateCents, 60);
  }
  for (const equipment of state.equipment) for (const segment of equipment.segments.filter(entry => entry.orderId === orderId)) {
    const minutes = interval(segment.start, segment.end ?? state.clock.minute, from, to);
    if (segment.status === 'Working' || segment.status === 'Idle') energy += mulDiv(minutes, (segment.status === 'Working' ? segment.workWatts : segment.idleWatts) * segment.tariffCents, 60000);
    else if (segment.status !== 'Off') unknownMinutes += minutes;
  }
  return { materials, labor, energy, total: materials + labor + energy, unknownMinutes };
}
export function replenishment(state: WorkshopState, item: Item) {
  const outstanding = state.purchases.filter(purchase => purchase.itemId === item.id && !['Received', 'Cancelled'].includes(purchase.status)).reduce((sum, purchase) => sum + purchase.quantity - purchase.received, 0);
  const completedDays = Math.floor(state.clock.minute / 1440);
  const history = item.demandHistory || Array.from({ length: 30 }, () => item.dailyDemand);
  let demand = 0;
  for (let day = completedDays - 30; day < completedDays; day++) {
    if (day < 0) demand += history[(day + 30) % 30] ?? item.dailyDemand;
    else demand += Math.max(0, state.movements.filter(movement => movement.itemId === item.id && movement.at >= day * 1440 && movement.at < (day + 1) * 1440 && ['Issue', 'Return'].includes(movement.kind)).reduce((sum, movement) => sum - movement.quantity, 0));
  }
  const dailyDemand = Math.round(demand / 30);
  const position = item.stock + outstanding; const point = dailyDemand * item.leadDays + item.safety; const target = dailyDemand * (item.leadDays + 7) + item.safety;
  return { outstanding, position, dailyDemand, point, target, quantity: position < point ? Math.ceil(Math.max(0, target - position) / item.pack) * item.pack : 0 };
}
export function updateAlerts(state: WorkshopState): void {
  for (const equipment of state.equipment) {
    const segment = latest(equipment);
    if (segment.status === 'Idle' && state.clock.minute - segment.start >= 15 && !state.alerts.some(alert => alert.episode === segment.id)) {
      state.alerts.push({ id: next(state, 'ALT'), equipmentId: equipment.id, episode: segment.id, at: segment.start + 15, status: 'Open', unverified: false });
    }
  }
}
export function settleClock(state: WorkshopState, now = Date.now()): boolean {
  if (!state.clock.running) return false;
  const elapsed = Math.max(0, Math.min(now - state.clock.wallAt, 86400000));
  const scaled = elapsed * state.clock.speed + state.clock.remainderMs;
  const minutes = Math.floor(scaled / 60000);
  state.clock.minute = Math.min(43200, state.clock.minute + minutes); state.clock.remainderMs = scaled % 60000; state.clock.wallAt = now;
  if (state.clock.minute === 43200) { state.clock.running = false; state.clock.remainderMs = 0; }
  updateAlerts(state); return elapsed > 0;
}
function addStock(item: Item, quantity: number, unitCostCents: number) {
  const total = item.stock + quantity;
  const weighted = BigInt(item.stock) * BigInt(item.unitCostCents) + BigInt(quantity) * BigInt(unitCostCents);
  item.unitCostCents = total ? Number((weighted + BigInt(total) / 2n) / BigInt(total)) : unitCostCents; item.stock = total;
}
export const actions = ['customer.create', 'vehicle.create', 'order.create', 'order.submit', 'order.assign', 'order.hold', 'order.resume', 'order.review', 'order.rework', 'order.close', 'order.cancel', 'intervention.start', 'intervention.pause', 'intervention.resume', 'intervention.finish', 'request.create', 'request.cancel', 'material.issue', 'material.return', 'stock.receive', 'stock.adjust', 'item.create', 'item.settings', 'purchase.approve', 'purchase.order', 'purchase.receive', 'purchase.cancel', 'equipment.event', 'equipment.settings', 'alert.acknowledge', 'invoice.create', 'clock.advance', 'clock.configure', 'scenario.reset', 'simulation.run'] as const;

export function applyCommand(state: WorkshopState, actor: Actor, command: Command): AuditEvent {
  ensure(actions.includes(command.action as typeof actions[number]), 'Unknown command.');
  const { action, payload: p } = command; const at = state.clock.minute;
  const manager: Role[] = ['Workshop manager']; const warehouse: Role[] = ['Warehouse clerk']; const admin: Role[] = ['Administrator'];
  let details: Record<string, unknown> = { ...p };
  if (action === 'customer.create') {
    permit(actor, manager); const name = text(p.name, 'Customer name', 2, 100); ensure(!state.customers.some(customer => customer.name.toLowerCase() === name.toLowerCase()), 'A customer with this name already exists.');
    const record = { id: next(state, 'CUS'), name, contact: text(p.contact || 'Not provided', 'Contact', 1, 150) }; state.customers.push(record); details = record;
  } else if (action === 'vehicle.create') {
    permit(actor, manager); ensure(state.customers.some(customer => customer.id === p.customerId), 'Choose an existing customer.');
    const plate = text(p.plate, 'Vehicle reference', 2, 30).toUpperCase(); ensure(!state.vehicles.some(vehicle => vehicle.plate === plate), 'This vehicle reference already exists.');
    const record = { id: next(state, 'VEH'), customerId: String(p.customerId), name: text(p.name, 'Vehicle model', 2, 100), plate, kind: text(p.kind, 'Vehicle type', 2, 50) }; state.vehicles.push(record); details = record;
  } else if (action === 'order.create') {
    permit(actor, manager); ensure(state.vehicles.some(vehicle => vehicle.id === p.vehicleId), 'Choose an existing vehicle.');
    const order = { id: next(state, 'SO'), vehicleId: String(p.vehicleId), description: text(p.description, 'Service description', 5, 500), status: 'Draft' as const, assigned: [], createdAt: at }; state.orders.unshift(order); details = { orderId: order.id };
  } else if (action.startsWith('order.')) {
    permit(actor, manager); const order = getOrder(state, p.orderId); ensure(!finalStates.includes(order.status), 'Closed or cancelled orders cannot be changed.');
    if (action === 'order.assign') {
      ensure(Array.isArray(p.employeeIds) && p.employeeIds.every(id => typeof id === 'string' && state.employees.some(employee => employee.id === id && employee.role === 'Technician')), 'Choose valid technicians.');
      const ids = [...new Set(p.employeeIds as string[])];
      for (const removed of order.assigned.filter(id => !ids.includes(id))) ensure(!state.interventions.some(intervention => intervention.orderId === order.id && intervention.employeeId === removed && intervention.status !== 'Completed') && !state.requests.some(request => request.orderId === order.id && request.employeeId === removed && !request.cancelled && request.fulfilled < request.quantity), 'Settle work and material requests before removing a technician.');
      ensure(order.status !== 'In progress' || ids.length, 'An active order must retain an assigned technician.'); order.assigned = ids;
    } else if (action === 'order.submit') { ensure(order.status === 'Draft', 'Only Draft orders can be submitted.'); order.status = 'Open'; }
    else if (action === 'order.cancel') { ensure(['Draft', 'Open'].includes(order.status) && !state.interventions.some(intervention => intervention.orderId === order.id) && costFor(state, order.id).materials === 0 && !blockedEquipment(state, order.id), 'Only unused Draft or Open orders can be cancelled. Return issued material first.'); ensure(!pending(state, order.id), 'Cancel pending requests before cancelling the order.'); order.status = 'Cancelled'; }
    else if (action === 'order.resume') { ensure(order.status === 'On hold', 'Only an On hold order can resume.'); ensure(order.assigned.some(id => !state.interventions.some(intervention => intervention.employeeId === id && intervention.status === 'Running')), 'An available assigned technician is required.'); order.status = 'In progress'; }
    else if (action === 'order.rework') { ensure(order.status === 'Ready for review', 'Only an order awaiting review can return to work.'); text(p.reason, 'Rework reason', 5, 300); order.status = 'In progress'; }
    else {
      ensure(!state.interventions.some(intervention => intervention.orderId === order.id && intervention.status === 'Running') && !blockedEquipment(state, order.id), 'Stop running interventions and equipment sessions first. Unknown power cannot prove that equipment has stopped.');
      if (action === 'order.hold') { ensure(order.status === 'In progress', 'Only an In progress order can be held.'); text(p.reason, 'Hold reason', 5, 300); order.status = 'On hold'; }
      if (action === 'order.review') { ensure(order.status === 'In progress' && state.interventions.filter(intervention => intervention.orderId === order.id).every(intervention => intervention.status === 'Completed') && !pending(state, order.id), 'Complete interventions and settle requests before review.'); order.status = 'Ready for review'; }
      if (action === 'order.close') { ensure(order.status === 'Ready for review', 'Manager review is required before closure.'); order.snapshot = costFor(state, order.id, -Infinity, at, false); order.status = 'Closed'; order.closedAt = at; }
    }
  } else if (action.startsWith('intervention.')) {
    permit(actor, ['Technician']);
    if (action === 'intervention.start') {
      const order = getOrder(state, p.orderId); ensure(workStates.includes(order.status) && order.assigned.includes(actor.username), 'You must be assigned to an Open or In progress order.'); ensure(!state.interventions.some(intervention => intervention.employeeId === actor.username && intervention.status === 'Running'), 'A technician may have only one running intervention.');
      const employee = state.employees.find(entry => entry.id === actor.username)!;
      const intervention = { id: next(state, 'INT'), orderId: order.id, employeeId: actor.username, status: 'Running' as const, segments: [{ start: at, end: null }], hourlyRateCents: employee.hourlyRateCents, outcome: '' }; state.interventions.push(intervention); order.status = 'In progress'; details = { interventionId: intervention.id, orderId: order.id };
    } else {
      const intervention = state.interventions.find(entry => entry.id === p.interventionId); ensure(intervention && intervention.employeeId === actor.username, 'Your intervention was not found.', 404); ensure(intervention.status !== 'Completed', 'Completed interventions are immutable.'); const order = getOrder(state, intervention.orderId);
      if (action === 'intervention.resume') { ensure(intervention.status === 'Paused' && workStates.includes(order.status) && order.assigned.includes(actor.username), 'This intervention cannot resume in the current order state.'); ensure(!state.interventions.some(entry => entry.employeeId === actor.username && entry.status === 'Running'), 'Another intervention is already running.'); intervention.segments.push({ start: at, end: null }); intervention.status = 'Running'; }
      else { if (action === 'intervention.pause') ensure(intervention.status === 'Running', 'Only running interventions can pause.'); else intervention.outcome = text(p.outcome, 'Work outcome', 5, 500); const segment = intervention.segments.at(-1)!; if (segment.end === null) segment.end = at; intervention.status = action === 'intervention.pause' ? 'Paused' : 'Completed'; }
    }
  } else if (action === 'request.create') {
    permit(actor, ['Technician']); const order = getOrder(state, p.orderId); getItem(state, p.itemId); ensure(workStates.includes(order.status) && order.assigned.includes(actor.username), 'Material requests require your assignment to an Open or In progress order.');
    const request = { id: next(state, 'REQ'), orderId: order.id, employeeId: actor.username, itemId: String(p.itemId), quantity: positive(p.quantity), fulfilled: 0, cancelled: false, at }; state.requests.push(request); details = { requestId: request.id };
  } else if (action === 'request.cancel') {
    permit(actor, ['Technician', 'Warehouse clerk']); const request = state.requests.find(entry => entry.id === p.requestId); ensure(request, 'Request not found.', 404); ensure(actor.role !== 'Technician' || request.employeeId === actor.username, 'This request belongs to another technician.', 403); ensure(request.fulfilled < request.quantity && !request.cancelled, 'No unfulfilled quantity remains.'); request.cancelled = true;
  } else if (action === 'material.issue') {
    permit(actor, warehouse); const request = state.requests.find(entry => entry.id === p.requestId); ensure(request && !request.cancelled, 'Active material request not found.', 404); const order = getOrder(state, request.orderId); const item = getItem(state, request.itemId); const quantity = positive(p.quantity);
    ensure(workStates.includes(order.status) && order.assigned.includes(request.employeeId), 'The order must accept issues and the recipient must be assigned.'); ensure(quantity <= request.quantity - request.fulfilled, 'The issue exceeds the remaining request.'); ensure(quantity <= item.stock, 'Insufficient stock. No stock or cost was changed.');
    const movement = { id: next(state, 'MOV'), kind: 'Issue' as const, itemId: item.id, quantity: -quantity, unitCostCents: item.unitCostCents, amountCents: mulDiv(quantity, item.unitCostCents, 1000), at, actor: actor.name, orderId: order.id, employeeId: request.employeeId, requestId: request.id, reference: request.id }; item.stock -= quantity; request.fulfilled += quantity; state.movements.push(movement); details = { movementId: movement.id, orderId: order.id, quantity };
  } else if (action === 'material.return') {
    permit(actor, warehouse); const issue = state.movements.find(movement => movement.id === p.sourceId && movement.kind === 'Issue'); ensure(issue?.orderId, 'Original material issue not found.', 404); ensure(!finalStates.includes(getOrder(state, issue.orderId).status), 'Post-closure corrections require a separate credit workflow.'); const quantity = positive(p.quantity);
    const returns = state.movements.filter(movement => movement.kind === 'Return' && movement.sourceId === issue.id); const returned = returns.reduce((sum, movement) => sum + movement.quantity, 0); ensure(quantity + returned <= -issue.quantity, 'The return exceeds the unreturned issued quantity.');
    const amountCents = mulDiv(returned + quantity, issue.amountCents, -issue.quantity) - returns.reduce((sum, movement) => sum + movement.amountCents, 0); const item = getItem(state, issue.itemId); addStock(item, quantity, issue.unitCostCents);
    const movement = { id: next(state, 'MOV'), kind: 'Return' as const, itemId: item.id, quantity, unitCostCents: issue.unitCostCents, amountCents, at, actor: actor.name, orderId: issue.orderId, employeeId: issue.employeeId, sourceId: issue.id, reference: text(p.reason, 'Return reason', 5, 300) }; state.movements.push(movement); details = { movementId: movement.id };
  } else if (action === 'stock.receive' || action === 'stock.adjust') {
    permit(actor, warehouse); const item = getItem(state, p.itemId); const adjustment = action === 'stock.adjust'; const quantity = adjustment ? fixed(p.quantity, 1000, true) : positive(p.quantity); ensure(quantity !== 0 && item.stock + quantity >= 0, 'The adjustment must be nonzero and cannot overdraw stock.'); const reference = text(p.reference, adjustment ? 'Adjustment reason' : 'Delivery reference', 5, 200);
    if (!adjustment) ensure(!state.movements.some(movement => movement.kind === 'Receipt' && movement.reference === reference), 'This delivery reference is already recorded.');
    const price = adjustment ? item.unitCostCents : positive(p.unitCost, 100); if (quantity > 0) addStock(item, quantity, price); else item.stock += quantity;
    const movement = { id: next(state, 'MOV'), kind: adjustment ? 'Adjustment' as const : 'Receipt' as const, itemId: item.id, quantity, unitCostCents: price, amountCents: mulDiv(Math.abs(quantity), price, 1000), at, actor: actor.name, reference }; state.movements.push(movement); details = { movementId: movement.id };
  } else if (action === 'item.create' || action === 'item.settings') {
    permit(actor, admin); const item = action === 'item.create' ? { id: next(state, 'ITEM'), name: text(p.name, 'Material name', 2, 100), sku: text(p.sku, 'SKU', 2, 30).toUpperCase(), unit: text(p.unit, 'Unit', 1, 20), stock: 0, unitCostCents: positive(p.unitCost, 100), dailyDemand: 0, leadDays: 1, safety: 0, pack: 1000 } : getItem(state, p.itemId);
    item.dailyDemand = fixed(p.dailyDemand, 1000); item.demandHistory = Array.from({ length: 30 }, () => item.dailyDemand); item.leadDays = number(Number(p.leadDays), 1, 365); item.safety = fixed(p.safety, 1000); item.pack = positive(p.pack);
    if (action === 'item.create') { ensure(!state.items.some(entry => entry.sku === item.sku), 'SKU already exists.'); state.items.push(item); } details = { itemId: item.id };
  } else if (action === 'purchase.approve') {
    permit(actor, admin); const item = getItem(state, p.itemId); const recommendation = replenishment(state, item); ensure(recommendation.quantity > 0, 'Outstanding purchases already cover the reorder shortfall.');
    const purchase = { id: next(state, 'PO'), itemId: item.id, quantity: recommendation.quantity, received: 0, unitCostCents: positive(p.unitCost, 100), supplier: text(p.supplier, 'Supplier', 2, 100), status: 'Approved' as const, at }; state.purchases.push(purchase); details = { purchaseId: purchase.id };
  } else if (action.startsWith('purchase.')) {
    const purchase = state.purchases.find(entry => entry.id === p.purchaseId); ensure(purchase, 'Purchase order not found.', 404);
    if (action === 'purchase.order') { permit(actor, admin); ensure(purchase.status === 'Approved', 'Only approved purchases can be ordered.'); purchase.status = 'Ordered'; }
    if (action === 'purchase.cancel') { permit(actor, admin); ensure(['Approved', 'Ordered'].includes(purchase.status) && purchase.received === 0, 'Received or partially received purchases cannot be cancelled.'); purchase.status = 'Cancelled'; }
    if (action === 'purchase.receive') {
      permit(actor, warehouse); ensure(['Ordered', 'Partially received'].includes(purchase.status), 'Only ordered quantities can be received.'); const quantity = positive(p.quantity); ensure(quantity <= purchase.quantity - purchase.received, 'Receipt exceeds the outstanding quantity.'); const reference = text(p.reference, 'Delivery reference', 5, 100); ensure(!state.movements.some(movement => movement.kind === 'Receipt' && movement.reference === reference), 'This delivery is already recorded.');
      const item = getItem(state, purchase.itemId); addStock(item, quantity, purchase.unitCostCents); purchase.received += quantity; purchase.status = purchase.received === purchase.quantity ? 'Received' : 'Partially received'; const movement = { id: next(state, 'MOV'), kind: 'Receipt' as const, itemId: item.id, quantity, unitCostCents: purchase.unitCostCents, amountCents: mulDiv(quantity, purchase.unitCostCents, 1000), at, actor: actor.name, sourceId: purchase.id, reference }; state.movements.push(movement); details = { purchaseId: purchase.id, movementId: movement.id };
    }
  } else if (action === 'equipment.event') {
    permit(actor, manager); const equipment = state.equipment.find(entry => entry.id === p.equipmentId); ensure(equipment, 'Equipment not found.', 404); const eventId = text(p.eventId, 'Event ID', 5, 100); const priorEvent = state.events.find(event => event.id === eventId); if (priorEvent) { ensure(priorEvent.equipmentId === equipment.id && priorEvent.status === p.status, 'Event ID was already used for a different observation.'); return { action: 'equipment.event.replayed', details: { eventId } }; }
    const status = text(p.status, 'Equipment observation') as EquipmentStatus; ensure(['Off', 'Working', 'Idle', 'Powered unknown activity', 'Unknown power'].includes(status), 'Invalid equipment observation.'); const eventAt = p.at === undefined ? at : number(p.at, -43200, at); const current = latest(equipment);
    if (eventAt < current.start) { state.events.push({ id: eventId, equipmentId: equipment.id, at: eventAt, status, result: 'Quarantined' }); return { action: 'equipment.event.quarantined', details: { eventId, reason: 'Out-of-order observation' } }; }
    let orderId = status === 'Off' ? null : (p.orderId === undefined ? current.orderId : (p.orderId ? String(p.orderId) : null));
    if (orderId) ensure(workStates.includes(getOrder(state, orderId).status), 'Equipment can only be attached to an Open or In progress order.');
    state.events.push({ id: eventId, equipmentId: equipment.id, at: eventAt, status, result: 'Accepted' });
    if (current.status !== status || current.orderId !== orderId) { current.end = eventAt; equipment.segments.push({ id: next(state, 'SEG'), status, start: eventAt, end: null, orderId, workWatts: equipment.workWatts, idleWatts: equipment.idleWatts, tariffCents: equipment.tariffCents }); }
    for (const alert of state.alerts.filter(entry => entry.equipmentId === equipment.id && entry.status !== 'Resolved')) { if (status === 'Off' || status === 'Working') { alert.status = 'Resolved'; alert.resolvedAt = eventAt; alert.unverified = false; } else if (status.includes('unknown') || status === 'Unknown power') alert.unverified = true; }
    details = { equipmentId: equipment.id, eventId, status, orderId };
  } else if (action === 'equipment.settings') {
    permit(actor, admin); const equipment = state.equipment.find(entry => entry.id === p.equipmentId); ensure(equipment, 'Equipment not found.', 404); equipment.workWatts = number(Number(p.workWatts), 1, 1000000); equipment.idleWatts = number(Number(p.idleWatts), 0, 1000000); equipment.tariffCents = positive(p.tariff, 100); ensure(equipment.idleWatts <= equipment.workWatts, 'Idle power cannot exceed the working profile in this model.');
  } else if (action === 'alert.acknowledge') {
    permit(actor, manager); const alert = state.alerts.find(entry => entry.id === p.alertId); ensure(alert && alert.status === 'Open', 'An open alert was not found.'); alert.status = 'Acknowledged'; alert.acknowledgedBy = actor.name;
  } else if (action === 'invoice.create') {
    permit(actor, admin); const order = getOrder(state, p.orderId); ensure(order.status === 'Closed' && order.snapshot, 'Close and reconcile the order before invoicing.'); const existing = state.invoices.find(invoice => invoice.orderId === order.id); if (existing) return { action: 'invoice.existing', details: { invoiceId: existing.id } };
    const vehicle = state.vehicles.find(entry => entry.id === order.vehicleId)!; const customer = state.customers.find(entry => entry.id === vehicle.customerId)!; const invoice = { id: next(state, 'INV'), orderId: order.id, at, cost: structuredClone(order.snapshot), customer: customer.name, vehicle: `${vehicle.name} · ${vehicle.plate}`, description: order.description, issuedBy: actor.name }; state.invoices.push(invoice); details = { invoiceId: invoice.id };
  } else if (action === 'clock.advance') { permit(actor, admin); ensure(!state.clock.running, 'Pause the automatic clock before advancing manually.'); state.clock.minute += number(p.minutes, 1, 480); ensure(state.clock.minute <= 43200, 'The scenario supports at most 30 simulated days.'); }
  else if (action === 'clock.configure') { permit(actor, admin); ensure(typeof p.running === 'boolean', 'Choose a clock state.'); ensure([1, 5, 30, 60].includes(Number(p.speed)), 'Choose a supported clock speed.'); state.clock.running = p.running; state.clock.speed = Number(p.speed); state.clock.wallAt = Date.now(); state.clock.remainderMs = 0; }
  else if (action === 'scenario.reset') { permit(actor, admin); const reset = createBaseline(); Object.assign(state, reset); details = { reason: 'Owner-authorized reset of this scenario only' }; }
  else if (action === 'simulation.run') {
    permit(actor, admin); ensure(!state.clock.running, 'Pause the clock before running the guided scenario.');
    const tech = { ...actor, username: 'nicolas', name: 'Nicolás', role: 'Technician' as const }; const clerk = { ...actor, username: 'juanita', name: 'Juanita', role: 'Warehouse clerk' as const }; const lead = { ...actor, username: 'juan-jacobo', name: 'Juan Jacobo', role: 'Workshop manager' as const };
    ensure(getOrder(state, 'SO-1042').status === 'In progress', 'Reset to the baseline before running this guided scenario.');
    const request = state.requests.find(entry => entry.id === 'REQ-208')!;
    if (!request.cancelled && request.fulfilled < request.quantity) applyCommand(state, clerk, { action: 'material.issue', payload: { requestId: request.id, quantity: String((request.quantity - request.fulfilled) / 1000) } });
    state.clock.minute += 5; updateAlerts(state);
    const alert = state.alerts.find(entry => entry.equipmentId === 'C-01' && entry.status === 'Open'); if (alert) applyCommand(state, lead, { action: 'alert.acknowledge', payload: { alertId: alert.id } });
    applyCommand(state, lead, { action: 'equipment.event', payload: { equipmentId: 'C-01', status: 'Off', eventId: next(state, 'SIM-EVENT') } });
    for (const intervention of state.interventions.filter(entry => entry.orderId === 'SO-1042' && entry.status !== 'Completed')) applyCommand(state, { ...tech, username: intervention.employeeId, name: state.employees.find(employee => employee.id === intervention.employeeId)!.name }, { action: 'intervention.finish', payload: { interventionId: intervention.id, outcome: 'Guided synthetic maintenance completed.' } });
    ensure(!pending(state, 'SO-1042'), 'Settle additional material requests before running the guided closeout.'); applyCommand(state, lead, { action: 'order.review', payload: { orderId: 'SO-1042' } }); applyCommand(state, lead, { action: 'order.close', payload: { orderId: 'SO-1042' } }); applyCommand(state, actor, { action: 'invoice.create', payload: { orderId: 'SO-1042' } });
    details = { source: 'Explicit synthetic scenario engine', steps: ['Issue pending filters', 'Advance five simulated minutes', 'Acknowledge idle alert', 'Power off compressor', 'Finish interventions', 'Review and close order', 'Issue educational invoice'], initiator: actor.name };
  }
  updateAlerts(state);
  ensure(state.items.every(item => Number.isSafeInteger(item.stock) && item.stock >= 0), 'Inventory integrity check failed.', 409);
  return { action, details };
}

export function comparePolicies(seed = 42, jobs = 30) {
  let randomState = seed >>> 0; const random = () => { randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0; return randomState / 4294967296; };
  let legitimate = 0, unassigned = 0, workMinutes = 0, unattendedMinutes = 0, controlledIdle = 0;
  for (let index = 0; index < jobs; index++) { legitimate += 1 + Math.floor(random() * 3); if (random() < .25) unassigned += 1; workMinutes += 30 + Math.floor(random() * 60); const gap = 10 + Math.floor(random() * 80); unattendedMinutes += gap; controlledIdle += Math.min(gap, 20); }
  const result = (controlled: boolean) => { const materials = (legitimate + (controlled ? 0 : unassigned)) * 8500000; const energy = mulDiv(workMinutes, 5000 * 90000, 60000) + mulDiv(controlled ? controlledIdle : unattendedMinutes, 1200 * 90000, 60000); return { materials, energy, total: materials + energy, idleMinutes: controlled ? controlledIdle : unattendedMinutes, rejectedUnassigned: controlled ? unassigned : 0 }; };
  return { seed, jobs, legitimateUnits: legitimate, unassignedAttempts: unassigned, workMinutes, controlled: result(true), uncontrolled: result(false), assumptions: ['Identical seeded jobs, legitimate demand, unit prices, power profiles, and unattended intervals.', 'Controls reject unassigned requests; the uncontrolled policy permits those same attempts.', 'Idle detection at 15 minutes plus an assumed five-minute human response; no automatic shutdown guarantee.', 'Replenishment capacity is assumed sufficient; this comparison is not a capacity or stockout simulation.', 'Synthetic policy comparison; no real-world saving or target achievement is claimed.'] };
}
