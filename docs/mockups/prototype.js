'use strict';

// This is a browser-only design prototype. Role previews and local guards are
// illustrative and do not implement authentication, persistence, or isolation.
const employees = [
  { name: 'Tamara', role: 'Administrator' },
  { name: 'Juan Jacobo', role: 'Workshop manager' },
  { name: 'Juanita', role: 'Warehouse clerk' },
  { name: 'Brian', role: 'Technician' },
  { name: 'Nicolás', role: 'Technician' },
  { name: 'Álan', role: 'Technician' },
  { name: 'Anderson', role: 'Technician' },
];
const views = [
  ['overview', 'Overview', '01'], ['orders', 'Service orders', '02'],
  ['inventory', 'Warehouse', '03'], ['purchasing', 'Purchasing', '04'],
  ['equipment', 'Equipment', '05'], ['costs', 'Costs & invoices', '06'],
  ['reports', 'Reports & history', '07'],
];
const roleViews = {
  Administrator: views.map(view => view[0]),
  'Workshop manager': ['overview', 'orders', 'equipment', 'costs', 'reports'],
  'Warehouse clerk': ['overview', 'inventory', 'purchasing', 'reports'],
  Technician: ['orders', 'inventory'],
};
const money = amount => `COP ${Math.round(amount).toLocaleString('en-US')}`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const badge = (text, color = '') => `<span class="badge ${color}">${escapeHtml(text)}</span>`;
const clock = minutes => `${String(9 + Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2);
const $ = selector => document.querySelector(selector);
let state;
let currentView = 'overview';
let currentEmployee = employees[0];
let selectedOrder = 'SO-1042';
let reportFilter = 'all';
let noticeTimer;

function baseline() {
  return {
    minute: 70,
    items: [
      { id: 'filter', name: 'Heavy-duty oil filter', sku: 'FLT-004', unit: 'unit', stock: 4, price: 85000, demand: 1, lead: 3, safety: 2, pack: 1 },
      { id: 'oil', name: 'Hydraulic oil ISO 46', sku: 'OIL-046', unit: 'L', stock: 60, price: 18000, demand: 5, lead: 3, safety: 10, pack: 5 },
      { id: 'pads', name: 'Heavy-duty brake pad set', sku: 'BRK-012', unit: 'set', stock: 8, price: 120000, demand: .5, lead: 4, safety: 2, pack: 1 },
    ],
    orders: [
      { id: 'SO-1042', vehicle: 'Volvo FH 460', plate: 'TRK-042', customer: 'Andes Freight', status: 'In progress', assigned: ['Nicolás', 'Brian'], service: 'Scheduled maintenance and hydraulic inspection', materials: 350000, fixedLabor: 0, fixedEnergy: 0, invoice: null },
      { id: 'SO-1043', vehicle: 'Mercedes-Benz O 500', plate: 'BUS-018', customer: 'Summit Transit', status: 'Open', assigned: ['Álan'], service: 'Brake inspection and preventive maintenance', materials: 0, fixedLabor: 0, fixedEnergy: 0, invoice: null },
      { id: 'SO-1041', vehicle: 'Komatsu PC200', plate: 'EXC-007', customer: 'Highland Earthworks', status: 'Closed', assigned: ['Anderson'], service: 'Hydraulic system maintenance', materials: 220000, fixedLabor: 120000, fixedEnergy: 6600, invoice: 'INV-2026-1041' },
    ],
    interventions: [{ employee: 'Nicolás', order: 'SO-1042', status: 'Running', segments: [{ start: 0, end: null }] }],
    requests: [{ id: 'REQ-208', employee: 'Nicolás', order: 'SO-1042', item: 'filter', quantity: 2, fulfilled: 0 }],
    equipmentSegments: [{ state: 'Working', start: 0, end: 60 }, { state: 'Idle', start: 60, end: null }],
    alerts: [], purchase: null,
    audit: [
      { minute: 60, actor: 'Simulated telemetry', message: 'Air compressor activity changed to Idle.' },
      { minute: 40, actor: 'Juanita', message: 'Issued 10 L of hydraulic oil to SO-1042; material cost COP 180,000.' },
      { minute: 15, actor: 'Juanita', message: 'Issued 2 oil filters to SO-1042; material cost COP 170,000.' },
      { minute: 0, actor: 'Nicolás', message: 'Started an intervention on SO-1042.' },
    ],
  };
}
function log(message, actor = currentEmployee.name) { state.audit.unshift({ minute: state.minute, actor, message }); }
function notify(message) {
  const notification = $('#notification');
  notification.textContent = message; notification.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notification.hidden = true; }, 6000);
}
function can(role) { return currentEmployee.role === role; }
function orderById(id) { return state.orders.find(order => order.id === id); }
function itemById(id) { return state.items.find(item => item.id === id); }
function currentEquipment() { return state.equipmentSegments[state.equipmentSegments.length - 1]; }
function equipmentTotals() {
  const totals = { Working: 0, Idle: 0, Off: 0, 'Unknown power': 0 };
  for (const segment of state.equipmentSegments) totals[segment.state] += (segment.end ?? state.minute) - segment.start;
  const powered = totals.Working + totals.Idle;
  return { ...totals, powered, energy: Math.round((totals.Working * 5 + totals.Idle * 1.2) * 900 / 60), utilization: powered ? totals.Working / powered : 0, coverage: state.minute ? (state.minute - totals['Unknown power']) / state.minute : 1 };
}
function laborMinutes(intervention) { return intervention.segments.reduce((sum, segment) => sum + (segment.end ?? state.minute) - segment.start, 0); }
function costs(order) {
  const labor = order.fixedLabor + state.interventions.filter(intervention => intervention.order === order.id).reduce((sum, intervention) => sum + laborMinutes(intervention) * 1000, 0);
  const energy = order.id === 'SO-1042' ? equipmentTotals().energy : order.fixedEnergy;
  return { materials: order.materials, labor, energy, total: order.materials + labor + energy };
}
function reorder(item) {
  const outstanding = state.purchase?.item === item.id && state.purchase.status !== 'Received' ? state.purchase.quantity : 0;
  const position = item.stock + outstanding;
  const point = item.demand * item.lead + item.safety;
  const target = item.demand * (item.lead + 7) + item.safety;
  return { position, point, target, quantity: position < point ? Math.ceil(Math.max(0, target - position) / item.pack) * item.pack : 0 };
}
function evaluateAlerts() {
  const segment = currentEquipment();
  if (segment.state === 'Idle' && state.minute - segment.start >= 15 && !state.alerts.some(alert => alert.episode === segment.start)) {
    state.alerts.push({ id: `ALT-${state.alerts.length + 1}`, episode: segment.start, minute: segment.start + 15, status: 'Open', unverified: false });
    log('Opened an idle alert for air compressor C-01 after 15 continuous simulated minutes.', 'System');
  }
}
function heading(eyebrow, title, description, actions = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${description}</p></div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}
function metric(label, value, note, color = '') { return `<div class="metric"><span class="metric-label">${label}</span><span class="metric-value ${color}">${value}</span><span class="metric-note">${note}</span></div>`; }
function panel(title, body, subtitle = '', action = '') { return `<section class="panel"><div class="panel-header"><div><h2>${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>${action}</div>${body}</section>`; }
function orderStatus(status) { return badge(status, ({ 'In progress': 'teal', Open: 'blue', 'On hold': 'amber', Closed: '', 'Ready for review': 'amber' })[status]); }
function orderTable(orders, compact = false) {
  const canOpen = roleViews[currentEmployee.role].includes('orders');
  return `<div class="table-wrap"><table><thead><tr><th>Service order</th><th>Technicians</th><th>Status</th>${compact ? '' : '<th class="number">Operating cost</th>'}${canOpen ? '<th></th>' : ''}</tr></thead><tbody>${orders.map(order => `<tr><td><strong>${order.id}</strong><small>${order.vehicle} · ${order.plate}</small></td><td>${order.assigned.map(name => `<div class="avatar-row"><span class="avatar">${initials(name)}</span>${escapeHtml(name)}</div>`).join('')}</td><td>${orderStatus(order.status)}</td>${compact ? '' : `<td class="number">${money(costs(order).total)}</td>`}${canOpen ? `<td><button class="text-button" data-action="open-order" data-id="${order.id}">Open</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function costChart() {
  const total = state.orders.reduce((sum, order) => sum + costs(order).total, 0);
  const values = ['materials', 'labor', 'energy'].map(key => state.orders.reduce((sum, order) => sum + costs(order)[key], 0));
  const labels = ['Materials', 'Labor', 'Estimated energy'];
  const colors = ['#147b70', '#4e7ea4', '#d5a65a'];
  return `<div class="cost-chart" role="img" aria-label="Operating cost composition. ${labels.map((label, index) => `${label}: ${money(values[index])}`).join('. ')}">${values.map((value, index) => `<div class="cost-mark"><div class="cost-mark-label"><span>${labels[index]}</span><strong>${money(value)}</strong></div><div class="cost-track"><span style="width:${value / Math.max(1, total) * 100}%;background:${colors[index]}"></span></div></div>`).join('')}</div>`;
}
function overviewView() {
  const totals = equipmentTotals();
  const open = state.orders.filter(order => order.status !== 'Closed').length;
  const alerts = state.alerts.filter(alert => alert.status !== 'Resolved');
  const lowItems = state.items.filter(item => reorder(item).quantity > 0);
  const orderCost = state.orders.reduce((sum, order) => sum + costs(order).total, 0);
  const materialCost = state.orders.reduce((sum, order) => sum + order.materials, 0);
  const canReadCost = can('Administrator') || can('Workshop manager');
  const completed = state.orders.filter(order => order.status === 'Closed').length;
  const requestCount = state.requests.filter(request => request.fulfilled < request.quantity).length;
  const minutes = state.minute - currentEquipment().start;
  const attention = `<ul class="list"><li class="list-item"><div><h3>${lowItems.length ? 'Oil filters need replenishment' : 'Stock coverage restored'}</h3><p>${lowItems.length ? `${itemById('filter').stock} units on hand · reorder point 5 units` : 'No inventory shortfall against current reorder points.'}</p></div>${badge(lowItems.length ? 'Review' : 'Covered', lowItems.length ? 'amber' : 'teal')}</li><li class="list-item"><div><h3>Air compressor C-01</h3><p>${currentEquipment().state === 'Idle' ? `${minutes} min idle · ${Math.max(0, 15 - minutes)} min until alert threshold` : `${currentEquipment().state} · ${(totals.coverage * 100).toFixed(0)}% observed coverage`}</p></div>${badge(alerts.length ? 'Alert open' : currentEquipment().state, alerts.length ? 'amber' : '')}</li><li class="list-item"><div><h3>${requestCount} pending material request${requestCount === 1 ? '' : 's'}</h3><p>Material requests do not reserve warehouse stock.</p></div>${badge('Warehouse')}</li></ul>`;
  return heading('WORKSHOP CONTROL', 'Workshop overview', 'A connected view of work, materials, and equipment.') +
    `<div class="kpis">${metric('Open service orders', String(open), `${completed} completed order${completed === 1 ? '' : 's'} in this scenario`)}${metric(canReadCost ? 'Recorded operating cost' : 'Recorded material cost', money(canReadCost ? orderCost : materialCost), canReadCost ? 'Materials, labor, and known energy' : 'Net issued materials across service orders')}${metric('Compressor utilization', `${Math.round(totals.utilization * 100)}%`, 'Useful work / observed powered time', 'accent')}${metric('Unresolved idle alerts', String(alerts.length), alerts.length ? 'Corrective action required' : 'Advance time to test the 15 min threshold', alerts.length ? 'warning' : '')}</div>` +
    `<div class="columns"><div>${panel('Service orders', orderTable(state.orders, true), 'Responsibility and current work status', roleViews[currentEmployee.role].includes('orders') ? '<button class="text-button" data-action="navigate" data-view="orders">View orders</button>' : '')}${canReadCost ? panel('Operating cost composition', `<div class="panel-body">${costChart()}<p class="small-note">Scenario totals · COP · Energy is an estimate from known intervals.</p></div>`, 'Costs are calculated from the same scenario records.') : panel('Warehouse coverage', `<div class="panel-body"><ul class="list">${state.items.map(item => `<li class="list-item"><div><h3>${item.name}</h3><p>${item.stock} ${item.unit} on hand</p></div>${badge(reorder(item).quantity ? 'Replenish' : 'Covered', reorder(item).quantity ? 'amber' : 'teal')}</li>`).join('')}</ul></div>`)}</div><div>${panel('Needs attention', `<div class="panel-body">${attention}</div>`, 'Signals for the next operational decision')}${panel('Equipment use', `<div class="panel-body"><div class="asset-line"><strong>Air compressor</strong>${badge(currentEquipment().state, currentEquipment().state === 'Idle' ? 'amber' : 'teal')}</div><div class="equipment-strip"><span style="width:${totals.Working / state.minute * 100}%"></span><span class="idle" style="width:${totals.Idle / state.minute * 100}%"></span><span class="unknown" style="width:${totals['Unknown power'] / state.minute * 100}%"></span></div><div class="legend"><span>Working ${totals.Working} min</span><span class="idle">Idle ${totals.Idle} min</span></div><p class="small-note">Lift and welding station are currently off. Unknown intervals are reported separately.</p></div>`)}</div></div>`;
}
function ordersView() {
  const visible = can('Technician') ? state.orders.filter(order => order.assigned.includes(currentEmployee.name)) : state.orders;
  if (!visible.some(order => order.id === selectedOrder)) selectedOrder = visible[0]?.id;
  const order = orderById(selectedOrder);
  if (!order) return heading('WORKSHOP OPERATIONS', 'Service orders', 'Your assigned work.') + '<div class="panel empty">No assigned orders.</div>';
  const intervention = state.interventions.find(entry => entry.order === order.id && entry.employee === currentEmployee.name);
  let actions = '';
  if (can('Technician') && order.status !== 'Closed') {
    if (!intervention || intervention.status === 'Paused') actions += '<button class="primary" data-action="start-work">Start intervention</button>';
    if (intervention?.status === 'Running') actions += '<button data-action="pause-work">Pause intervention</button>';
    if (intervention && intervention.status !== 'Completed') actions += '<button data-action="finish-work">Finish intervention</button>';
  }
  if (can('Workshop manager') && order.status === 'In progress') actions += '<button data-action="hold-order">Put on hold</button><button data-action="review-order">Request review</button>';
  if (can('Workshop manager') && order.status === 'On hold') actions += '<button class="primary" data-action="resume-order">Resume order</button>';
  if (can('Workshop manager') && order.status === 'Ready for review') actions += '<button class="primary" data-action="close-order">Close order</button>';
  const stages = ['Open', 'In progress', 'Ready for review', 'Closed'];
  const stage = stages.indexOf(order.status);
  const segments = state.interventions.filter(entry => entry.order === order.id);
  return heading('WORKSHOP OPERATIONS', 'Service orders', 'Assign responsibility, record work, and follow each service.') +
    panel('Orders', orderTable(visible)) +
    panel(`${order.id} · ${order.vehicle}`, `<div class="panel-body"><p class="muted">${order.service}</p><ul class="stepper">${stages.map((name, index) => `<li class="${index === stage ? 'current' : index < stage ? 'done' : ''}">${name}</li>`).join('')}</ul>${order.status === 'On hold' ? '<div class="notice">This order is on hold. New interventions and material issues are blocked.</div>' : ''}<dl class="detail-meta"><div><dt>Customer</dt><dd>${order.customer}</dd></div><div><dt>Vehicle reference</dt><dd>${order.plate}</dd></div><div><dt>Assigned technicians</dt><dd>${order.assigned.join(', ')}</dd></div><div><dt>Operating cost</dt><dd>${money(costs(order).total)}</dd></div></dl>${segments.length ? `<ul class="list">${segments.map(entry => `<li class="list-item"><div><h3>${entry.employee}</h3><p>${laborMinutes(entry)} recorded active minutes · COP 60,000 / hour</p></div>${badge(entry.status, entry.status === 'Running' ? 'teal' : '')}</li>`).join('')}</ul>` : '<p class="muted">No running or recorded intervention in this order preview.</p>'}<div class="actions section-space">${actions}</div><p class="small-note">Assignment alone does not start work. Paused time does not add labor cost.</p></div>`);
}
function inventoryView() {
  const requests = can('Technician') ? state.requests.filter(request => request.employee === currentEmployee.name) : state.requests;
  return heading('MATERIAL CONTROL', 'Warehouse', 'Every delivery belongs to an order and an assigned technician.', can('Technician') ? '<button class="primary" data-action="request-material">Request materials</button>' : '') +
    `<div class="kpis">${metric('Tracked materials', String(state.items.length), 'Quantities use each item’s declared unit')}${metric('Items below reorder point', String(state.items.filter(item => reorder(item).quantity).length), 'Includes outstanding approved purchases')}${metric('Pending requests', String(requests.filter(request => request.fulfilled < request.quantity).length), 'Requests do not reserve stock')}${metric('Material cost · SO-1042', money(orderById('SO-1042').materials), 'Historical issue unit costs retained')}</div>` +
    panel('Material requests', `<div class="table-wrap"><table><thead><tr><th>Request</th><th>Material</th><th>Requested / issued</th><th>Status</th><th></th></tr></thead><tbody>${requests.length ? requests.map(request => `<tr><td><strong>${request.id}</strong><small>${request.employee} · ${request.order}</small></td><td>${itemById(request.item).name}</td><td>${request.quantity} / ${request.fulfilled} ${itemById(request.item).unit}</td><td>${badge(request.fulfilled === request.quantity ? 'Fulfilled' : 'Pending', request.fulfilled === request.quantity ? 'teal' : 'amber')}</td><td>${can('Warehouse clerk') && request.fulfilled < request.quantity ? `<button class="primary" data-action="issue-material" data-id="${request.id}">Issue ${request.quantity - request.fulfilled}</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No material requests for this view.</td></tr>'}</tbody></table></div>`, 'Warehouse clerks confirm physical delivery; the prototype illustrates full-quantity delivery.') +
    panel('Inventory', `<div class="table-wrap"><table><thead><tr><th>Material</th><th class="number">On hand</th><th class="number">Reorder point</th><th class="number">Unit cost</th><th>Coverage</th></tr></thead><tbody>${state.items.map(item => `<tr><td><strong>${item.name}</strong><small>${item.sku}</small></td><td class="number">${item.stock} ${item.unit}</td><td class="number">${reorder(item).point} ${item.unit}</td><td class="number">${money(item.price)}</td><td>${badge(reorder(item).quantity ? 'Replenish' : 'Covered', reorder(item).quantity ? 'amber' : 'teal')}</td></tr>`).join('')}</tbody></table></div>`);
}
function purchasingView() {
  const item = itemById('filter'); const policy = reorder(item); const purchase = state.purchase;
  return heading('REPLENISHMENT', 'Purchasing', 'Turn an inventory signal into an approved purchase and an actual receipt.') +
    `<div class="kpis">${metric('Available oil filters', `${item.stock} units`, 'Only receipts add stock')}${metric('Reorder point', `${policy.point} units`, '1 unit/day × 3 days + 2 safety units')}${metric('Target stock', `${policy.target} units`, 'Lead time + 7-day review period')}${metric('Suggested quantity', `${policy.quantity} units`, 'Pack size 1 unit; seeded demand history')}</div>` +
    panel('Replenishment workflow', `<div class="panel-body"><div class="list-item"><div><h3>Heavy-duty oil filter</h3><p>Inventory position: ${policy.position} units · Lead time: 3 scenario days</p></div>${badge(purchase ? purchase.status : policy.quantity ? 'Suggested' : 'Covered', purchase?.status === 'Received' ? 'teal' : 'amber')}</div>${purchase ? `<dl class="detail-meta section-space"><div><dt>Purchase</dt><dd>PO-031</dd></div><div><dt>Quantity</dt><dd>${purchase.quantity} units</dd></div><div><dt>Estimated purchase value</dt><dd>${money(purchase.quantity * item.price)}</dd></div><div><dt>Status</dt><dd>${purchase.status}</dd></div></dl>` : '<p class="small-note">A suggestion does not increase stock. Approval records an outstanding quantity; an actual receipt changes availability.</p>'}<div class="actions section-space">${!purchase && policy.quantity && can('Administrator') ? '<button class="primary" data-action="approve-purchase">Approve suggested purchase</button>' : ''}${purchase?.status === 'Approved' && can('Administrator') ? '<button class="primary" data-action="order-purchase">Record purchase order</button>' : ''}${purchase?.status === 'Ordered' && can('Warehouse clerk') ? '<button class="primary" data-action="receive-purchase">Receive full delivery</button>' : ''}</div>${purchase?.status === 'Received' ? '<p class="small-note">This delivery is already received. Repeating the receipt is blocked.</p>' : ''}</div>`);
}
function equipmentView() {
  const totals = equipmentTotals(); const current = currentEquipment();
  const alerts = state.alerts.filter(alert => alert.status !== 'Resolved');
  const duration = state.minute - current.start;
  const controls = can('Workshop manager') ? `<div class="actions"><button class="primary" data-action="equipment-working">${current.state === 'Working' ? 'Confirm useful work' : 'Resume useful work'}</button><button data-action="equipment-idle">Record idle</button><button data-action="equipment-off">Power off</button><button class="text-button" data-action="equipment-stale">Mark telemetry stale</button></div>` : '';
  return heading('EQUIPMENT CONTROL', 'Equipment', 'Power state and useful activity are separate observations.') +
    (totals['Unknown power'] ? `<div class="notice">${totals['Unknown power']} min has unknown power coverage. Energy totals include known intervals only; unknown consumption is not measured as zero.</div>` : '') +
    `<div class="equipment-grid"><section class="equipment-card"><h2>Air compressor</h2><span class="asset-code">C-01 · Assigned to SO-1042</span>${badge(current.state, current.state === 'Idle' ? 'amber' : current.state === 'Unknown power' ? 'red' : 'teal')}<div class="asset-value">${duration} <span class="muted">min</span></div><p class="muted">In current observed state</p><dl><div><dt>Effective time</dt><dd>${totals.Working} min</dd></div><div><dt>Observed idle time</dt><dd>${totals.Idle} min</dd></div><div><dt>Known energy estimate</dt><dd>${money(totals.energy)}</dd></div><div><dt>Observation coverage</dt><dd>${Math.round(totals.coverage * 100)}%</dd></div></dl>${controls}</section><section class="equipment-card"><h2>Hydraulic lift</h2><span class="asset-code">L-02 · No active order</span>${badge('Off')}<div class="asset-value">0 <span class="muted">min</span></div><p class="muted">Powered in the current window</p><p class="small-note">Previous usage on SO-1041 is retained in that closed order’s snapshot.</p></section><section class="equipment-card"><h2>Welding station</h2><span class="asset-code">W-03 · No active order</span>${badge('Off')}<div class="asset-value">0 <span class="muted">min</span></div><p class="muted">Powered in the current window</p><p class="small-note">No current operating cost attributed to a service order.</p></section></div>` +
    `<div class="section-space">${panel('Idle alert workflow', `<div class="panel-body">${alerts.length ? alerts.map(alert => `<div class="list-item"><div><h3>${alert.id} · Air compressor idle</h3><p>Detected ${clock(alert.minute)} · ${alert.status}${alert.unverified ? ' · Unverified observation' : ''}</p><p>Acknowledgement records responsibility. A confirmed equipment action resolves the alert.</p></div>${can('Workshop manager') && alert.status === 'Open' ? `<button data-action="acknowledge-alert" data-id="${alert.id}">Acknowledge</button>` : badge(alert.status, 'amber')}</div>`).join('') : `<p class="muted">${state.alerts.length ? 'No unresolved idle alerts. The corrective action is recorded in history.' : 'No open alert. Advance the scenario to reach 15 continuous idle minutes.'}</p>`}<p class="small-note">Working profile 5 kW · Idle profile 1.2 kW · Tariff COP 900/kWh · All readings are simulated.</p></div>`)}</div>`;
}
function costsView() {
  const order = orderById(selectedOrder) || state.orders[0]; const breakdown = costs(order);
  const lines = [['Net materials', breakdown.materials], ['Recorded labor', breakdown.labor], ['Estimated allocated energy', breakdown.energy]];
  return heading('SERVICE FINANCE', 'Costs & invoices', 'Keep operating cost, pricing, and historical records distinct.') +
    `<div class="form-row" style="margin-bottom:22px"><label class="field">Service order<select id="cost-order">${state.orders.map(entry => `<option value="${entry.id}" ${entry.id === order.id ? 'selected' : ''}>${entry.id} · ${entry.vehicle}</option>`).join('')}</select></label></div>` +
    `<div class="columns"><div>${panel('Order cost breakdown', `<div class="panel-body">${lines.map(([label, amount]) => `<div class="cost-row"><span>${label}</span><span>${money(amount)}</span></div>`).join('')}<div class="invoice-total"><span>Operating cost</span><span>${money(breakdown.total)}</span></div><p class="small-note">COP · Recorded material unit costs, COP 60,000 per active labor hour, and known equipment intervals. ${order.id === 'SO-1042' && equipmentTotals()['Unknown power'] ? 'Energy coverage is incomplete.' : 'Energy remains a modeled estimate.'}</p></div>`)}</div><div>${panel(order.invoice ? 'Issued educational invoice' : 'Invoice readiness', `<div class="invoice"><div class="invoice-heading"><div><h2>${order.invoice || order.id}</h2><p>${order.customer}</p><p>${order.vehicle} · ${order.plate}</p></div>${orderStatus(order.status)}</div>${order.invoice ? `${lines.map(([label, amount]) => `<div class="cost-row"><span>${label}</span><span>${money(amount)}</span></div>`).join('')}<div class="invoice-total"><span>Total</span><span>${money(breakdown.total)}</span></div><p class="small-note">Educational invoice · Cost-based demonstration pricing · No tax or markup modeled.</p>` : `<p class="muted">${order.status === 'Closed' ? 'The order is closed and ready for an invoice snapshot.' : 'Close and reconcile the order before issuing an invoice.'}</p>${can('Administrator') ? `<button class="primary" data-action="create-invoice" ${order.status === 'Closed' ? '' : 'disabled'}>Issue educational invoice</button>` : ''}<p class="small-note">An issued invoice retains its original totals.</p>`}</div>`)}</div></div>`;
}
function reportsView() {
  const rows = state.orders.filter(order => reportFilter === 'all' || order.id === reportFilter);
  const permittedCost = can('Administrator') || can('Workshop manager');
  const body = `<div class="table-wrap"><table><thead><tr><th>Service order</th><th>Status</th><th class="number">${permittedCost ? 'Materials' : 'Material issue value'}</th>${permittedCost ? '<th class="number">Labor</th><th class="number">Estimated energy</th><th class="number">Operating cost</th>' : ''}</tr></thead><tbody>${rows.map(order => { const value = costs(order); return `<tr><td><strong>${order.id}</strong><small>${order.vehicle}</small></td><td>${orderStatus(order.status)}</td><td class="number">${money(value.materials)}</td>${permittedCost ? `<td class="number">${money(value.labor)}</td><td class="number">${money(value.energy)}</td><td class="number">${money(value.total)}</td>` : ''}</tr>`; }).join('')}<tr><td><strong>Total</strong></td><td></td><td class="number"><strong>${money(rows.reduce((sum, order) => sum + costs(order).materials, 0))}</strong></td>${permittedCost ? `<td class="number">${money(rows.reduce((sum, order) => sum + costs(order).labor, 0))}</td><td class="number">${money(rows.reduce((sum, order) => sum + costs(order).energy, 0))}</td><td class="number"><strong>${money(rows.reduce((sum, order) => sum + costs(order).total, 0))}</strong></td>` : ''}</tr></tbody></table></div>`;
  return heading('OPERATIONAL EVIDENCE', 'Reports & history', `Current scenario through ${clock(state.minute)} · November 20, 2026.`, '<button data-action="export-report">Export CSV</button>') +
    `<div class="form-row" style="margin-bottom:22px"><label class="field">Order filter<select id="report-filter"><option value="all">All service orders</option>${state.orders.map(order => `<option value="${order.id}" ${reportFilter === order.id ? 'selected' : ''}>${order.id} · ${order.vehicle}</option>`).join('')}</select></label></div>` +
    panel('Service cost report', body, 'Seeded closed-order snapshots plus current recorded operations; no real-world savings claim.') +
    (can('Administrator') ? panel('Operation history', `<div class="panel-body">${state.audit.slice(0, 12).map(record => `<div class="audit-item"><time>${clock(record.minute)}</time><div>${escapeHtml(record.message)}<small>${escapeHtml(record.actor)} · Current scenario</small></div></div>`).join('')}</div>`, 'Original records remain visible; this preview has temporary browser state.') : '<p class="small-note">Full audit inspection is restricted to the administrator view.</p>');
}
const renderers = { overview: overviewView, orders: ordersView, inventory: inventoryView, purchasing: purchasingView, equipment: equipmentView, costs: costsView, reports: reportsView };
function render() {
  if (!roleViews[currentEmployee.role].includes(currentView)) currentView = roleViews[currentEmployee.role][0];
  $('#navigation').innerHTML = views.filter(view => roleViews[currentEmployee.role].includes(view[0])).map(([id, label, glyph]) => `<a class="nav-item ${id === currentView ? 'active' : ''}" href="#${id}" ${id === currentView ? 'aria-current="page"' : ''}><span class="nav-glyph" aria-hidden="true">${glyph}</span>${label}</a>`).join('');
  $('#section-label').textContent = views.find(view => view[0] === currentView)[1];
  $('#scenario-time').textContent = `Scenario time ${clock(state.minute)}`;
  $('#main').innerHTML = renderers[currentView]();
}
function navigate(view) { if (roleViews[currentEmployee.role].includes(view)) { currentView = view; history.replaceState(null, '', `#${view}`); render(); } }
function handleAction(action, id) {
  const order = orderById(selectedOrder);
  if (action === 'open-order') { selectedOrder = id; navigate('orders'); return; }
  if (action === 'request-material') {
    if (!can('Technician')) return;
    const assigned = state.orders.filter(entry => entry.assigned.includes(currentEmployee.name) && ['Open', 'In progress'].includes(entry.status));
    if (!assigned.length) { notify('No assigned order currently accepts material requests.'); return; }
    $('#request-order').innerHTML = assigned.map(entry => `<option value="${entry.id}">${entry.id} · ${entry.vehicle}</option>`).join('');
    $('#request-item').innerHTML = state.items.map(item => `<option value="${item.id}">${item.name} (${item.unit})</option>`).join('');
    $('#request-error').textContent = ''; $('#request-dialog').showModal(); return;
  }
  if (action === 'issue-material') {
    if (!can('Warehouse clerk')) return;
    const request = state.requests.find(entry => entry.id === id); const recipientOrder = orderById(request.order); const item = itemById(request.item); const quantity = request.quantity - request.fulfilled;
    if (!['Open', 'In progress'].includes(recipientOrder.status) || !recipientOrder.assigned.includes(request.employee)) { notify('Delivery rejected: the order must accept issues and the technician must be assigned.'); return; }
    if (quantity <= 0) { notify('This request is already fulfilled.'); return; }
    if (quantity > item.stock) { notify(`Insufficient stock: ${item.stock} ${item.unit} available. No stock or cost changed. Partial fulfillment is specified in the design, not included in this preview.`); return; }
    item.stock -= quantity; request.fulfilled += quantity; recipientOrder.materials += quantity * item.price;
    log(`Issued ${quantity} ${item.unit} of ${item.name} to ${request.order}; cost ${money(quantity * item.price)}.`);
    notify('Delivery recorded. Stock, fulfillment, and order material cost updated together.');
  } else if (['start-work', 'pause-work', 'finish-work'].includes(action)) {
    if (!can('Technician') || !order.assigned.includes(currentEmployee.name)) return;
    let intervention = state.interventions.find(entry => entry.order === order.id && entry.employee === currentEmployee.name);
    if (action === 'start-work') {
      if (!['Open', 'In progress'].includes(order.status)) { notify('This order does not currently permit work.'); return; }
      if (state.interventions.some(entry => entry.employee === currentEmployee.name && entry.status === 'Running')) { notify('A technician can have only one running intervention.'); return; }
      if (intervention?.status === 'Completed') { notify('Completed interventions are retained. A new intervention is outside this preview.'); return; }
      if (!intervention) { intervention = { employee: currentEmployee.name, order: order.id, status: 'Planned', segments: [] }; state.interventions.push(intervention); }
      intervention.status = 'Running'; intervention.segments.push({ start: state.minute, end: null }); order.status = 'In progress';
      log(`Started an intervention on ${order.id}.`);
    } else {
      if (!intervention || intervention.status === 'Completed') return;
      if (action === 'pause-work' && intervention.status !== 'Running') return;
      const last = intervention.segments[intervention.segments.length - 1]; if (last && last.end === null) last.end = state.minute;
      intervention.status = action === 'pause-work' ? 'Paused' : 'Completed'; log(`${intervention.status} intervention on ${order.id}.`);
    }
    notify('Intervention updated. Paused time is excluded from recorded labor.');
  } else if (['hold-order', 'resume-order', 'review-order', 'close-order'].includes(action)) {
    if (!can('Workshop manager')) return;
    const running = state.interventions.some(entry => entry.order === order.id && entry.status === 'Running');
    const activeEquipment = order.id === 'SO-1042' && currentEquipment().state !== 'Off';
    if (action === 'hold-order' || action === 'review-order') {
      if (order.status !== 'In progress') return;
      if (running || activeEquipment) { notify('Stop running interventions and confirm equipment power-off before changing the order. Unknown power cannot prove a stopped session.'); return; }
    }
    if (action === 'review-order' && (state.interventions.some(entry => entry.order === order.id && entry.status !== 'Completed') || state.requests.some(request => request.order === order.id && request.fulfilled < request.quantity))) { notify('Complete interventions and settle pending material requests before review.'); return; }
    if (action === 'resume-order' && order.status !== 'On hold') return;
    if (action === 'close-order' && order.status !== 'Ready for review') return;
    order.status = ({ 'hold-order': 'On hold', 'resume-order': 'In progress', 'review-order': 'Ready for review', 'close-order': 'Closed' })[action];
    log(`${order.id} changed to ${order.status}.`); notify(`Order changed to ${order.status}.`);
  } else if (action.startsWith('equipment-')) {
    if (!can('Workshop manager')) return;
    const next = ({ 'equipment-working': 'Working', 'equipment-idle': 'Idle', 'equipment-off': 'Off', 'equipment-stale': 'Unknown power' })[action];
    if (!next || currentEquipment().state === next) { notify('The equipment is already in that state.'); return; }
    if (orderById('SO-1042').status === 'Closed' && next !== 'Off') { notify('This equipment preview is linked to a closed order. Reset the scenario to run another equipment session.'); return; }
    currentEquipment().end = state.minute; state.equipmentSegments.push({ state: next, start: state.minute, end: null });
    for (const alert of state.alerts.filter(entry => entry.status !== 'Resolved')) {
      if (next === 'Working' || next === 'Off') { alert.status = 'Resolved'; alert.unverified = false; }
      else if (next === 'Unknown power') alert.unverified = true;
    }
    log(`Air compressor observation changed to ${next}.`, 'Simulated telemetry'); notify(`Recorded a simulated ${next.toLowerCase()} observation.`);
  } else if (action === 'acknowledge-alert') {
    if (!can('Workshop manager')) return;
    const alert = state.alerts.find(entry => entry.id === id); if (!alert || alert.status !== 'Open') return;
    alert.status = 'Acknowledged'; log(`Acknowledged ${id}; equipment action still required.`); notify('Alert acknowledged. It remains unresolved until a confirmed corrective observation.');
  } else if (action === 'approve-purchase') {
    if (!can('Administrator') || state.purchase) return;
    const quantity = reorder(itemById('filter')).quantity; if (!quantity) return;
    state.purchase = { item: 'filter', quantity, status: 'Approved' }; log(`Approved replenishment of ${quantity} oil filters.`); notify('Purchase approved. Stock has not changed.');
  } else if (action === 'order-purchase') {
    if (!can('Administrator') || state.purchase?.status !== 'Approved') return;
    state.purchase.status = 'Ordered'; log('Recorded PO-031 as ordered.'); notify('Purchase order recorded. Awaiting physical receipt.');
  } else if (action === 'receive-purchase') {
    if (!can('Warehouse clerk') || state.purchase?.status !== 'Ordered') return;
    itemById(state.purchase.item).stock += state.purchase.quantity; state.purchase.status = 'Received'; log(`Received PO-031: ${state.purchase.quantity} oil filters.`); notify('Delivery received once. Available stock updated.');
  } else if (action === 'create-invoice') {
    if (!can('Administrator') || order.status !== 'Closed' || order.invoice) return;
    order.invoice = `INV-2026-${order.id.slice(3)}`; log(`Issued educational invoice ${order.invoice}.`); notify('Educational invoice snapshot created in temporary prototype state.');
  } else if (action === 'export-report') {
    const permittedCost = can('Administrator') || can('Workshop manager');
    const rows = state.orders.filter(entry => reportFilter === 'all' || entry.id === reportFilter);
    const header = permittedCost ? 'order,status,materials_cop,labor_cop,estimated_known_energy_cop,operating_cost_cop' : 'order,status,materials_cop';
    const lines = rows.map(entry => { const value = costs(entry); return permittedCost ? [entry.id, entry.status, value.materials, value.labor, value.energy, value.total].join(',') : [entry.id, entry.status, value.materials].join(','); });
    const blob = new Blob([[header, ...lines].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'workshop-scenario-report.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Exported the selected scenario report. Energy values cover known intervals only.');
  }
  render();
}
document.addEventListener('click', event => {
  const nav = event.target.closest('.nav-item, .brand');
  if (nav) { event.preventDefault(); navigate(nav.hash.slice(1)); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'navigate') navigate(button.dataset.view);
  else handleAction(button.dataset.action, button.dataset.id);
});
document.addEventListener('change', event => {
  if (event.target.id === 'cost-order') { selectedOrder = event.target.value; render(); }
  if (event.target.id === 'report-filter') { reportFilter = event.target.value; render(); }
});
$('#profile').innerHTML = employees.map((employee, index) => `<option value="${index}">${employee.name} · ${employee.role}</option>`).join('');
$('#profile').addEventListener('change', event => { currentEmployee = employees[Number(event.target.value)]; render(); });
$('#advance-time').addEventListener('click', () => { if (state.minute >= 480) { notify('This prototype covers one 09:00–17:00 scenario day. Reset to repeat it.'); return; } state.minute += 5; evaluateAlerts(); render(); });
$('#reset-scenario').addEventListener('click', () => { state = baseline(); selectedOrder = 'SO-1042'; reportFilter = 'all'; $('#request-dialog').close(); render(); notify('Your temporary prototype scenario was reset.'); });
$('#close-dialog').addEventListener('click', () => $('#request-dialog').close());
$('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.target); const quantity = Number(form.get('quantity')); const order = orderById(form.get('order')); const item = itemById(form.get('item'));
  if (!can('Technician') || !order || !item || !order.assigned.includes(currentEmployee.name) || !['Open', 'In progress'].includes(order.status) || !Number.isSafeInteger(quantity) || quantity <= 0) { $('#request-error').textContent = 'Choose an assigned open order and enter a positive whole quantity.'; return; }
  const request = { id: `REQ-${209 + state.requests.length - 1}`, employee: currentEmployee.name, order: order.id, item: item.id, quantity, fulfilled: 0 };
  state.requests.push(request); log(`Submitted ${request.id} for ${quantity} ${item.unit} of ${item.name}.`); $('#request-dialog').close(); render(); notify('Material request submitted. Stock remains unchanged until delivery.');
});
window.addEventListener('hashchange', () => { const view = location.hash.slice(1); if (renderers[view]) navigate(view); });
state = baseline();
if (renderers[location.hash.slice(1)]) currentView = location.hash.slice(1);
render();
// A read-only snapshot supports repeatable design checks without bypassing UI actions.
window.WorkshopPrototype = Object.freeze({ snapshot: () => JSON.parse(JSON.stringify({ state, currentView, currentEmployee, selectedOrder, equipment: equipmentTotals(), orderCosts: state.orders.map(order => ({ id: order.id, ...costs(order) })) })) });
