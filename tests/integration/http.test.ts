import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/server/db';
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:3070';
const password = `Integration-${randomUUID()}`;
type Client = { cookie: string; code: string; scenario: string };
async function call(path: string, options: RequestInit = {}, cookie = '') {
  const response = await fetch(origin + path, { ...options, headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie, ...options.headers } });
  return { response, data: await response.json() };
}
async function createWorkspace(): Promise<Client> {
  const { response, data } = await call('/api/session', { method: 'POST', body: JSON.stringify({ action: 'register', name: `Integration workshop ${randomUUID().slice(0, 8)}`, password }) });
  assert.equal(response.status, 200, JSON.stringify(data)); const cookie = response.headers.get('set-cookie')!.split(';')[0];
  const snapshot = await call('/api/workshop', {}, cookie); return { cookie, code: data.code, scenario: snapshot.data.scenario.id };
}
async function as(client: Client, username: string): Promise<Client> {
  const { response, data } = await call('/api/session', { method: 'POST', body: JSON.stringify({ code: client.code, username, password }) }); assert.equal(response.status, 200, JSON.stringify(data)); return { ...client, cookie: response.headers.get('set-cookie')!.split(';')[0] };
}
async function command(client: Client, action: string, payload: Record<string, unknown>, key = randomUUID()) { return call('/api/workshop', { method: 'POST', body: JSON.stringify({ scenarioId: client.scenario, action, payload, key }) }, client.cookie); }

test('authenticated persisted workshop workflow, ownership, replay, concurrency, and audit integrity', async t => {
  let admin: Client; let clerk: Client; let tech: Client; let manager: Client;
  await t.test('anonymous reads fail and sign-up creates seven real accounts', async () => {
    assert.equal((await call('/api/workshop')).response.status, 401); admin = await createWorkspace();
    const snapshot = (await call('/api/workshop', {}, admin.cookie)).data;
    assert.equal(snapshot.state.employees.length, 7); assert.equal(snapshot.costs['SO-1042'].total, 42468000);
    clerk = await as(admin, 'juanita'); tech = await as(admin, 'nicolas'); manager = await as(admin, 'juan-jacobo');
  });
  await t.test('role is server-derived and cross-origin writes fail', async () => {
    const forbidden = await command(tech, 'material.issue', { requestId: 'REQ-208', quantity: '1', role: 'Warehouse clerk' }); assert.equal(forbidden.response.status, 403);
    const crossOrigin = await call('/api/workshop', { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: JSON.stringify({ scenarioId: admin.scenario, action: 'clock.advance', payload: { minutes: 5 }, key: randomUUID() }) }, admin.cookie); assert.equal(crossOrigin.response.status, 403);
  });
  await t.test('another workspace cannot read or mutate the scenario', async () => {
    const other = await createWorkspace(); assert.equal((await call(`/api/workshop?scenario=${admin.scenario}`, {}, other.cookie)).response.status, 404);
    assert.equal((await command({ ...other, scenario: admin.scenario }, 'scenario.reset', {})).response.status, 404);
  });
  await t.test('successful delivery survives a new HTTP request and uses database state', async () => {
    const key = randomUUID(); const result = await command(clerk, 'material.issue', { requestId: 'REQ-208', quantity: '2' }, key); assert.equal(result.response.status, 200);
    const replay = await command(clerk, 'material.issue', { requestId: 'REQ-208', quantity: '2' }, key); assert.equal(replay.data.replayed, true);
    assert.equal((await command(clerk, 'material.issue', { requestId: 'REQ-208', quantity: '1' }, key)).response.status, 409);
    const snapshot = (await call('/api/workshop', {}, admin.cookie)).data; assert.equal(snapshot.state.items[0].stock, 2000); assert.equal(snapshot.costs['SO-1042'].materials, 52000000);
    const persisted = (await pool().query('SELECT state FROM scenarios WHERE id=$1', [admin.scenario])).rows[0].state; assert.equal(persisted.items[0].stock, 2000);
  });
  await t.test('concurrent withdrawals serialize and cannot overdraw stock', async () => {
    await command(tech, 'request.create', { orderId: 'SO-1042', itemId: 'filter', quantity: '2' });
    await command(tech, 'request.create', { orderId: 'SO-1042', itemId: 'filter', quantity: '2' });
    const snapshot = (await call('/api/workshop', {}, clerk.cookie)).data; const pending = snapshot.state.requests.filter((request: { id: string; fulfilled: number }) => request.id !== 'REQ-208' && request.fulfilled === 0);
    const outcomes = await Promise.all(pending.map((request: { id: string }) => command(clerk, 'material.issue', { requestId: request.id, quantity: '2' })));
    assert.deepEqual(outcomes.map(result => result.response.status).sort(), [200, 422]);
    const after = (await call('/api/workshop', {}, admin.cookie)).data; assert.equal(after.state.items[0].stock, 0); assert.equal(after.costs['SO-1042'].materials, 69000000);
  });
  await t.test('server failure rolls back the whole aggregate and audit is append-only', async () => {
    const before = (await pool().query('SELECT revision,state FROM scenarios WHERE id=$1', [admin.scenario])).rows[0];
    const failure = await command(clerk, 'stock.adjust', { itemId: 'filter', quantity: '-1', reference: 'Impossible negative adjustment' }); assert.equal(failure.response.status, 422);
    const after = (await pool().query('SELECT revision,state FROM scenarios WHERE id=$1', [admin.scenario])).rows[0]; assert.deepEqual(after, before);
    await assert.rejects(pool().query('UPDATE audit_events SET actor_name=$1 WHERE scenario_id=$2', ['Tampered', admin.scenario]), /append-only/);
    await assert.rejects(pool().query("UPDATE scenarios SET state=jsonb_set(state,'{items,0,stock}','-1') WHERE id=$1", [admin.scenario]), /check constraint/);
  });
  await t.test('server filters confidential role views and CSV fields', async () => {
    const technician = (await call('/api/workshop', {}, tech.cookie)).data; assert.equal(technician.audit.length, 0); assert.equal(technician.costs['SO-1042'].labor, null); assert.equal(technician.state.invoices.length, 0);
    const response = await fetch(origin + `/api/reports?scenario=${clerk.scenario}`, { headers: { Cookie: clerk.cookie } }); assert.equal(response.status, 200); const csv = await response.text(); assert.equal(csv.split('\r\n')[0], '"order","status","materials_cop"');
    assert.equal((await fetch(origin + '/api/reports', { headers: { Cookie: tech.cookie } })).status, 403);
  });
  await t.test('guided closeout persists an invoice and resets only the owned scenario', async () => {
    await command(admin, 'scenario.reset', {}); const result = await command(admin, 'simulation.run', {}); assert.equal(result.response.status, 200, JSON.stringify(result.data));
    let snapshot = (await call('/api/workshop', {}, admin.cookie)).data; const invoice = snapshot.state.invoices.find((entry: { orderId: string }) => entry.orderId === 'SO-1042'); assert.equal(invoice.cost.total, 59977000);
    await command(admin, 'clock.advance', { minutes: 20 }); snapshot = (await call('/api/workshop', {}, admin.cookie)).data; assert.equal(snapshot.costs['SO-1042'].total, invoice.cost.total);
    assert.equal((await command(manager, 'invoice.create', { orderId: 'SO-1042' })).response.status, 403);
    await command(admin, 'scenario.reset', {}); assert.equal((await call('/api/workshop', {}, admin.cookie)).data.state.items[0].stock, 4000);
    const auditCount = Number((await pool().query('SELECT count(*) FROM audit_events WHERE scenario_id=$1', [admin.scenario])).rows[0].count); assert.ok(auditCount >= 8);
  });
  await t.test('period reports expose source movements and keep financial exports restricted', async () => {
    const report = async (kind: string, user = admin, window = '') => fetch(origin + `/api/reports?scenario=${admin.scenario}&kind=${kind}${window}`, { headers: { Cookie: user.cookie } });
    const materials = await (await report('materials', clerk)).text(); assert.match(materials, /"movement","kind","item"/); assert.match(materials, /"Issue"/);
    const spanishOrders = await (await report('orders', admin, '&lang=es')).text(); assert.match(spanishOrders, /"orden","estado","materiales_cop"/); assert.match(spanishOrders, /"SO-1042","En trabajo","350000.00"/);
    const spanishMaterials = await (await report('materials', clerk, '&lang=es')).text(); assert.match(spanishMaterials, /"movimiento","tipo","material"/); assert.match(spanishMaterials, /"Entrega"/); assert.match(spanishMaterials, /"MOV-06"/);
    const spanishError = await report('technicians', clerk, '&lang=es'); assert.equal(spanishError.status,403); assert.equal((await spanishError.json()).error,'Tu rol no permite exportar costos financieros.');
    const equipment = await (await report('equipment')).text(); assert.match(equipment, /coverage_ratio/); assert.match(equipment, /"C-01","60","10"/);
    assert.equal((await report('technicians', clerk)).status, 403);
    const technician = await (await report('technicians')).text(); assert.match(technician, /Nicolás/); assert.match(technician, /Allocated to service orders only/);
    const vehicle = await (await report('vehicles')).text(); assert.match(vehicle, /Volvo FH 460/); assert.match(vehicle, /424680.00/);
    const empty = await (await report('materials', clerk, '&from=2027-01-01&to=2027-01-01')).text(); assert.equal(empty.trim().split('\r\n').length, 1);
    assert.equal((await report('orders', admin, '&from=2027-02-01&to=2026-01-01')).status, 422);
    const malformed = await call('/api/session', { method: 'POST', body: '{' }); assert.equal(malformed.response.status, 400);
  });
  await t.test('five bad attempts lock only that account and session logout revokes access', async () => {
    for (let index = 0; index < 5; index++) assert.equal((await call('/api/session', { method: 'POST', body: JSON.stringify({ code: admin.code, username: 'brian', password: 'wrong-password' }) })).response.status, 401);
    assert.equal((await call('/api/session', { method: 'POST', body: JSON.stringify({ code: admin.code, username: 'brian', password }) })).response.status, 401);
    assert.equal((await call('/api/session', { method: 'DELETE' }, tech.cookie)).response.status, 200); assert.equal((await call('/api/workshop', {}, tech.cookie)).response.status, 401);
  });
});
test.after(async () => { await pool().end(); });
