'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { snapshotFor, contextFor } from '@/server/workshop';
import type { EquipmentStatus, Role } from '@/domain/types';
import { I18nProvider, useI18n } from '@/i18n/provider';
import { Cockpit, OrderCards, StockVisual, EquipmentVisual, VehicleArt, materialName, Icon } from './visuals';
import { AppChrome, LoginScreen } from './chrome';
type Snapshot = Awaited<ReturnType<typeof snapshotFor>>;
type Context = Awaited<ReturnType<typeof contextFor>>;
type Option = {
    value: string;
    label: string;
};
type Field = {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'password' | 'textarea' | 'select' | 'multi' | 'hidden';
    value?: string | string[];
    options?: Option[];
    step?: string;
    min?: string;
    required?: boolean;
};
type ModalSpec = {
    title: string;
    action: string;
    fields: Field[];
    note?: string;
};
const staff = [{ value: 'tamara', label: 'Tamara · Administrator' }, { value: 'juan-jacobo', label: 'Juan Jacobo · Workshop manager' }, { value: 'juanita', label: 'Juanita · Warehouse clerk' }, { value: 'brian', label: 'Brian · Technician' }, { value: 'nicolas', label: 'Nicolás · Technician' }, { value: 'alan', label: 'Álan · Technician' }, { value: 'anderson', label: 'Anderson · Technician' }];
const screens = [['overview', 'Overview'], ['orders', 'Service orders'], ['directory', 'Customers & vehicles'], ['inventory', 'Warehouse'], ['purchasing', 'Purchasing'], ['equipment', 'Equipment'], ['costs', 'Costs & invoices'], ['reports', 'Reports & history'], ['simulation', 'Simulation']] as const;
type Screen = typeof screens[number][0];
const allowed: Record<Role, Screen[]> = { Administrator: screens.map(([id]) => id), 'Workshop manager': ['overview', 'orders', 'directory', 'equipment', 'costs', 'reports'], 'Warehouse clerk': ['overview', 'inventory', 'purchasing', 'equipment', 'reports'], Technician: ['overview', 'orders', 'inventory'] };
const hidden = (name: string, value: string): Field => ({ name, label: name, type: 'hidden', value });
function Badge({ children, color = '' }: {
    children: ReactNode;
    color?: string;
}) { const { t, localize, locale } = useI18n(); return <span className={`badge ${color}`}>{localize(children)}</span>; }
function Status({ value }: {
    value: string;
}) { const { t, localize, locale } = useI18n(); return <Badge color={['Working', 'Running', 'In progress', 'Fulfilled', 'Received'].includes(value) ? 'teal' : ['Idle', 'On hold', 'Pending', 'Open', 'Acknowledged', 'Ready for review'].includes(value) ? 'amber' : value.includes('Unknown') ? 'red' : ''}>{localize(value)}</Badge>; }
function Panel({ title, subtitle, action, children, literal = false }: {
    title: string;
    literal?: boolean;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}) { const { t, localize } = useI18n(); const collapsed=['Stock movement ledger','Event ingestion history','Operation history','Trace the system'].includes(title); const body=<><div className="panel-header"><div>{!collapsed&&<h2>{literal?title:t(title)}</h2>}{subtitle&&<p className="muted">{literal?subtitle:t(subtitle)}</p>}</div>{action}</div>{children}</>; return collapsed?<details className="panel collapsible-panel"><summary>{t(title)}</summary>{body}</details>:<section className="panel">{body}</section>; }
function Metric({ label, value, note }: {
    label: string;
    value: ReactNode;
    note: string;
}) { const { t, localize, locale } = useI18n(); return <div className="metric"><span className="metric-label">{localize(label)}</span><span className="metric-value">{localize(value)}</span><span className="metric-note">{localize(note)}</span></div>; }
function Modal({ spec, busy, error, close, submit }: {
    spec: ModalSpec;
    busy: boolean;
    error: string;
    close: () => void;
    submit: (values: Record<string, unknown>) => void;
}) {
    const { t, localize, locale } = useI18n();
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
    function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const values: Record<string, unknown> = Object.fromEntries(form); for (const field of spec.fields.filter(field => field.type === 'multi'))
        values[field.name] = form.getAll(field.name); submit(values); }
    return <dialog ref={ref} onCancel={event => { if (busy)
        event.preventDefault();
    else
        close(); }} aria-labelledby="modal-title"><form onSubmit={onSubmit}><div className="dialog-header"><h2 id="modal-title">{localize(spec.title)}</h2><button className="icon-button" aria-label={t("Close dialog")} type="button" disabled={busy} onClick={close}>{t("\u00D7")}</button></div>{localize(spec.note && <p className="muted">{localize(spec.note)}</p>)}{localize(spec.fields.map(field => field.type === 'hidden' ? <input type="hidden" name={field.name} value={String(field.value)} key={field.name}/> : field.type === 'multi' ? <fieldset key={field.name}><legend>{localize(field.label)}</legend>{localize(field.options?.map(option => <label className="check-field" key={option.value}><input type="checkbox" name={field.name} value={option.value} defaultChecked={Array.isArray(field.value) && field.value.includes(option.value)}/>{localize(option.label)}</label>))}</fieldset> : <label className="field" key={field.name}>{localize(field.label)}{localize(field.type === 'select' ? <select name={field.name} defaultValue={String(field.value || '')} required={field.required !== false}>{localize(field.options?.map(option => <option key={option.value} value={option.value}>{localize(option.label)}</option>))}</select> : field.type === 'textarea' ? <textarea name={field.name} rows={3} defaultValue={String(field.value || '')} required={field.required !== false} maxLength={500}/> : <input name={field.name} type={field.type || 'text'} defaultValue={String(field.value || '')} step={field.step || '0.001'} min={field.min} required={field.required !== false} maxLength={field.type === 'password' ? 128 : 300} autoComplete={field.type === 'password' ? 'current-password' : undefined}/>)}</label>))}<p role="alert" className="error">{localize(error)}</p><button type="submit" className="primary" disabled={busy}>{localize(busy ? 'Saving…' : spec.action === 'account.switch' ? 'Sign in to this account' : 'Confirm')}</button></form></dialog>;
}
function Workshop() {
    const { t, localize, locale, money, qty, dateAt } = useI18n();
    const [context, setContext] = useState<Context | null>(null);
    const [data, setData] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<Screen>('overview');
    const [selectedOrder, setSelectedOrder] = useState('SO-1042');
    const [modal, setModal] = useState<ModalSpec | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [connected, setConnected] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [workspaceCode, setWorkspaceCode] = useState('workshop-demo');
    const [loginUser, setLoginUser] = useState('tamara');
    const [reportKind, setReportKind] = useState('orders');
    const [reportOrder, setReportOrder] = useState('');
    const [reportFrom, setReportFrom] = useState('2026-11-20');
    const [reportTo, setReportTo] = useState('2026-11-20');
    const scenarioId = context?.scenarios[0]?.id;
    const refresh = useCallback(async (id?: string) => {
        const response = await fetch(`/api/workshop${id ? `?scenario=${id}` : ''}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                setContext(null);
                setData(null);
            }
            throw new Error(result.error);
        }
        setData((prior: Snapshot | null) => prior && prior.actor.id === result.actor.id && prior.scenario.id === result.scenario.id && prior.scenario.revision > result.scenario.revision ? prior : result);
        setConnected(true);
    }, []);
    const loadSession = useCallback(async () => {
        try {
            const response = await fetch('/api/session', { cache: 'no-store' });
            if (!response.ok) {
                setContext(null);
                setData(null);
                return;
            }
            const session: Context = await response.json();
            setData(null);
            setContext(session);
            setWorkspaceCode(session.workspace.code);
            await refresh(session.scenarios[0]?.id);
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to connect.');
        }
        finally {
            setLoading(false);
        }
    }, [refresh]);
    useEffect(() => { void loadSession(); }, [loadSession]);
    useEffect(() => { if (!scenarioId)
        return; const timer = setInterval(() => { if (!document.hidden)
        void refresh(scenarioId).catch(() => setConnected(false)); }, 2500); return () => clearInterval(timer); }, [scenarioId, refresh]);
    useEffect(() => { if (!notice)
        return; const timer = setTimeout(() => setNotice(''), 7000); return () => clearTimeout(timer); }, [notice]);
    useEffect(() => { if (context && !allowed[context.actor.role].includes(view))
        setView(allowed[context.actor.role][0]); }, [context, view]);
    async function signIn(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
            const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, action: registering ? 'register' : 'login' }) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error);
            if (result.code)
                setNotice(`Your private workspace code is ${result.code}. Keep it for your next sign-in.`);
            await loadSession();
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Sign-in failed.');
        }
        finally {
            setBusy(false);
        }
    }
    async function command(action: string, payload: Record<string, unknown> = {}) {
        if (!data || busy)
            return;
        setBusy(true);
        setError('');
        const body = JSON.stringify({ action, payload, scenarioId: data.scenario.id, key: crypto.randomUUID() });
        try {
            let response: Response;
            try {
                response = await fetch('/api/workshop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            }
            catch {
                response = await fetch('/api/workshop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            }
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error);
            setModal(null);
            setNotice(result.action === 'equipment.event.quarantined' ? 'The out-of-order observation was quarantined for review.' : 'Operation saved. The workshop records and indicators are updated.');
            await refresh(data.scenario.id);
        }
        catch (failure) {
            const message = failure instanceof Error ? failure.message : 'Operation failed.';
            setError(message);
            if (!modal)
                setNotice(message);
        }
        finally {
            setBusy(false);
        }
    }
    function open(spec: ModalSpec) { setError(''); setModal(spec); }
    async function modalSubmit(values: Record<string, unknown>) {
        if (!modal || !context)
            return;
        if (modal.action === 'account.switch') {
            setBusy(true);
            setError('');
            try {
                const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, code: context.workspace.code }) });
                const result = await response.json();
                if (!response.ok)
                    throw new Error(result.error);
                setModal(null);
                await loadSession();
            }
            catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Sign-in failed.');
            }
            finally {
                setBusy(false);
            }
            return;
        }
        if (modal.action === 'clock.configure') {
            values.running = values.running === 'true';
            values.speed = Number(values.speed);
        }
        await command(modal.action, values);
    }
    async function signOut() { setBusy(true); try {
        const response = await fetch('/api/session', { method: 'DELETE' });
        if (!response.ok)
            throw new Error('Unable to sign out.');
        setContext(null);
        setData(null);
        setError('');
    }
    catch (failure) {
        setNotice(String(failure));
    }
    finally {
        setBusy(false);
    } }
    if (loading)
        return <main className="loading"><span className="brand-mark">{t("MW")}</span><h1>{t("Opening your workshop\u2026")}</h1></main>;
    if (!context)
        return <LoginScreen registering={registering} setRegistering={value => { setRegistering(value); setError(''); }} code={workspaceCode} setCode={setWorkspaceCode} account={loginUser} setAccount={setLoginUser} busy={busy} error={error} notice={notice} submit={signIn}/>;
    if (!data || data.actor.id !== context.actor.id)
        return <main className="loading"><h1>{t("Loading workshop records\u2026")}</h1>{localize(error && <><p role="alert">{localize(error)}</p><button onClick={() => void loadSession()}>{t("Retry connection")}</button></>)}</main>;
    const role = data.actor.role;
    const is = (value: Role) => role === value;
    const admin = is('Administrator');
    const manager = is('Workshop manager');
    const clerk = is('Warehouse clerk');
    const technician = is('Technician');
    const financial = admin || manager;
    const state = data.state;
    const chosen = state.orders.find(order => order.id === selectedOrder) || state.orders[0];
    const orderOptions = state.orders.filter(order => ['Open', 'In progress'].includes(order.status)).map(order => ({ value: order.id, label: `${order.id} · ${state.vehicles.find(vehicle => vehicle.id === order.vehicleId)?.plate}` }));
    const itemOptions = state.items.map(item => ({ value: item.id, label: `${materialName(item,t)} (${t(item.unit)})` }));
    const orderSelect: Field = { name: 'orderId', label: 'Service order', type: 'select', options: orderOptions };
    const itemSelect: Field = { name: 'itemId', label: 'Material', type: 'select', options: itemOptions };
    const quantityField: Field = { name: 'quantity', label: 'Quantity', type: 'number', value: '1', min: '0.001' };
    function localizeRecord(value: unknown): unknown { if(Array.isArray(value)) return value.map(localizeRecord); if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[t(key),localizeRecord(item)])); return value; }
    const person = (id: string) => state.employees.find(employee => employee.id === id)?.name || id;
    const vehicleFor = (id: string) => state.vehicles.find(vehicle => vehicle.id === id)!;
    const orderButtons = (orderId: string, action: string, label: string, fields: Field[] = []) => <button disabled={busy} onClick={() => fields.length ? open({ title: label, action, fields: [hidden('orderId', orderId), ...fields] }) : void command(action, { orderId })}>{localize(label)}</button>;
    function ordersTable() { if (view === 'orders')
        return <OrderCards data={data!} selected={chosen?.id || ''} onSelect={setSelectedOrder}/>; return <div className="table-wrap"><table><thead><tr><th>{t("Service order")}</th><th>{t("Technicians")}</th><th>{t("Status")}</th><th className="number">{localize(financial ? 'Operating cost' : 'Material cost')}</th><th></th></tr></thead><tbody>{localize(state.orders.map(order => <tr key={order.id}><td><strong>{localize(order.id)}</strong><small>{vehicleFor(order.vehicleId)?.name}{t(" \u00B7 ")}{vehicleFor(order.vehicleId)?.plate}</small></td><td>{localize(order.assigned.length ? order.assigned.map(id => <div className="avatar-row" key={id}><span className="avatar">{localize(person(id).split(' ').map(part => part[0]).join('').slice(0, 2))}</span>{localize(person(id))}</div>) : <span className="muted">{t("Unassigned")}</span>)}</td><td><Status value={order.status}/></td><td className="number">{localize(money(financial ? data!.costs[order.id].total : data!.costs[order.id].materials))}</td><td>{localize(allowed[role].includes('orders') && <button className="text-button" onClick={() => { setSelectedOrder(order.id); setView('orders'); }}>{t("Open")}</button>)}</td></tr>))}</tbody></table></div>; }
    function pageHeading(eyebrow: string, title: string, description: string, actions?: ReactNode) { return <div className="page-heading"><div><p className="eyebrow">{localize(eyebrow)}</p><h1>{localize(title)}</h1><p className="muted">{localize(description)}</p></div><div className="actions">{localize(actions)}</div></div>; }
    const costsTotal = Object.values(data.costs).reduce((sum, cost) => sum + (financial ? cost.total || 0 : cost.materials), 0);
    const compressor = data.equipmentStats['C-01'];
    let content: ReactNode;
    if (view === 'overview')
        content = <Cockpit data={data} selected={selectedOrder} onSelect={setSelectedOrder} navigate={setView}/>;
    else if (view === 'orders')
        content = <>{localize(pageHeading('WORKSHOP OPERATIONS', 'Service orders', 'Plan assignments, record interventions, and close reconciled work.', manager && <button className="primary" onClick={() => open({ title: 'Create service order', action: 'order.create', fields: [{ name: 'vehicleId', label: 'Vehicle', type: 'select', options: state.vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.name} · ${vehicle.plate}` })) }, { name: 'description', label: 'Requested service', type: 'textarea' }] })}>{t("Create order")}</button>))}<Panel title="Order register">{localize(ordersTable())}</Panel>{localize(chosen && <Panel literal title={`${chosen.id} · ${vehicleFor(chosen.vehicleId)?.name}`} subtitle={['SO-1041','SO-1042','SO-1043'].includes(chosen.id)?t(chosen.description):chosen.description}><div className="panel-body"><div className="detail-meta"><div><dt>{t("Vehicle")}</dt><dd>{vehicleFor(chosen.vehicleId)?.plate}</dd></div><div><dt>{t("Status")}</dt><dd><Status value={chosen.status}/></dd></div><div><dt>{t("Assigned technicians")}</dt><dd>{localize(chosen.assigned.map(person).join(', ') || 'Not assigned')}</dd></div><div><dt>{localize(financial ? 'Operating cost' : 'Material cost')}</dt><dd>{localize(money(financial ? data.costs[chosen.id].total : data.costs[chosen.id].materials))}</dd></div></div><div className="actions wrap">{localize(manager && !['Closed', 'Cancelled'].includes(chosen.status) && <><button onClick={() => open({ title: 'Assign technicians', action: 'order.assign', fields: [hidden('orderId', chosen.id), { name: 'employeeIds', label: 'Technicians', type: 'multi', value: chosen.assigned, options: state.employees.filter(employee => employee.role === 'Technician').map(employee => ({ value: employee.id, label: employee.name })) }] })}>{t("Edit assignments")}</button>{localize(chosen.status === 'Draft' && orderButtons(chosen.id, 'order.submit', 'Submit order'))}{localize(chosen.status === 'In progress' && <>{localize(orderButtons(chosen.id, 'order.hold', 'Put on hold', [{ name: 'reason', label: 'Hold reason', type: 'textarea' }]))}{localize(orderButtons(chosen.id, 'order.review', 'Request review'))}</>)}{localize(chosen.status === 'On hold' && orderButtons(chosen.id, 'order.resume', 'Resume order'))}{localize(chosen.status === 'Ready for review' && <>{localize(orderButtons(chosen.id, 'order.close', 'Close order'))}{localize(orderButtons(chosen.id, 'order.rework', 'Return for work', [{ name: 'reason', label: 'Additional work reason', type: 'textarea' }]))}</>)}{localize(['Draft', 'Open'].includes(chosen.status) && orderButtons(chosen.id, 'order.cancel', 'Cancel unused order'))}</>)}{localize(technician && chosen.assigned.includes(data.actor.username) && ['Open', 'In progress'].includes(chosen.status) && <button className="primary" disabled={busy} onClick={() => void command('intervention.start', { orderId: chosen.id })}>{t("Start new intervention")}</button>)}</div><h3 className="section-space">{t("Interventions")}</h3><ul className="list">{localize(state.interventions.filter(intervention => intervention.orderId === chosen.id).map(intervention => <li key={intervention.id} className="list-item"><div><h3>{localize(person(intervention.employeeId))}{t(" \u00B7 ")}{localize(intervention.id)}</h3><p>{localize(intervention.segments.reduce((sum, segment) => sum + (segment.end ?? state.clock.minute) - segment.start, 0))}{t(" active minutes \u00B7 ")}{intervention.outcome ? (['INT-01','INT-02'].includes(intervention.id)?t(intervention.outcome):intervention.outcome) : t('Work in progress')}</p><Status value={intervention.status}/></div>{localize(technician && intervention.employeeId === data.actor.username && intervention.status !== 'Completed' && <div className="actions wrap"><button disabled={busy} onClick={() => void command(intervention.status === 'Running' ? 'intervention.pause' : 'intervention.resume', { interventionId: intervention.id })}>{localize(intervention.status === 'Running' ? 'Pause' : 'Resume')}</button><button onClick={() => open({ title: 'Finish intervention', action: 'intervention.finish', fields: [hidden('interventionId', intervention.id), { name: 'outcome', label: 'Work outcome', type: 'textarea' }] })}>{t("Finish")}</button></div>)}</li>))}</ul><p className="small-note">{t("Assignment does not start the timer. Paused time does not add labor cost. Review requires completed work, settled requests, and stopped equipment.")}</p></div></Panel>)}</>;
    else if (view === 'directory')
        content = <>{localize(pageHeading('CUSTOMER RECORDS', 'Customers & vehicles', 'Keep customer ownership and vehicle references connected.', manager && <><button onClick={() => open({ title: 'Register customer', action: 'customer.create', fields: [{ name: 'name', label: 'Customer name' }, { name: 'contact', label: 'Contact or department', required: false }] })}>{t("Register customer")}</button><button className="primary" onClick={() => open({ title: 'Register vehicle', action: 'vehicle.create', fields: [{ name: 'customerId', label: 'Customer', type: 'select', options: state.customers.map(customer => ({ value: customer.id, label: customer.name })) }, { name: 'name', label: 'Vehicle model' }, { name: 'plate', label: 'Plate or fleet reference' }, { name: 'kind', label: 'Vehicle type', type: 'select', options: ['Truck', 'Bus', 'Heavy machinery'].map(value => ({ value, label: value })) }] })}>{t("Register vehicle")}</button></>))}<Panel title="Vehicle register"><div className="table-wrap"><table><thead><tr><th>{t("Vehicle")}</th><th>{t("Type")}</th><th>{t("Customer")}</th><th>{t("Contact")}</th></tr></thead><tbody>{localize(state.vehicles.map(vehicle => { const customer = state.customers.find(entry => entry.id === vehicle.customerId)!; return <tr key={vehicle.id}><td><div className="directory-vehicle"><VehicleArt kind={vehicle.kind}/><strong>{vehicle.name}</strong></div><small>{vehicle.plate}{t(" \u00B7 ")}{localize(vehicle.id)}</small></td><td>{localize(vehicle.kind)}</td><td>{customer.name}</td><td>{customer.contact}</td></tr>; }))}</tbody></table></div></Panel><Panel title="Customers"><div className="panel-body"><ul className="list">{localize(state.customers.map(customer => <li className="list-item" key={customer.id}><div><h3>{customer.name}</h3><p>{customer.contact}{t(" \u00B7 ")}{localize(customer.id)}</p></div><Badge>{localize(state.vehicles.filter(vehicle => vehicle.customerId === customer.id).length)}{t(" vehicles")}</Badge></li>))}</ul></div></Panel></>;
    else if (view === 'inventory')
        content = <>{localize(pageHeading('MATERIAL CONTROL', 'Warehouse', 'Every issue belongs to an order and an assigned technician.', <>{localize(technician && <button className="primary" onClick={() => open({ title: 'Request materials', action: 'request.create', fields: [orderSelect, itemSelect, quantityField], note: 'Submitting a request does not reserve or deduct stock.' })}>{t("Request materials")}</button>)}{localize(clerk && <><button onClick={() => open({ title: 'Receive stock', action: 'stock.receive', fields: [itemSelect, quantityField, { name: 'unitCost', label: 'Unit purchase cost (COP)', type: 'number', min: '.01', step: '.01' }, { name: 'reference', label: 'Unique delivery reference' }] })}>{t("Record receipt")}</button><button onClick={() => open({ title: 'Adjust stock', action: 'stock.adjust', fields: [itemSelect, { ...quantityField, label: 'Signed adjustment quantity', min: undefined }, { name: 'reference', label: 'Adjustment reason', type: 'textarea' }] })}>{t("Justified adjustment")}</button></>)}{localize(admin && <button onClick={() => open({ title: 'Add material', action: 'item.create', fields: [{ name: 'name', label: 'Material name' }, { name: 'sku', label: 'SKU' }, { name: 'unit', label: 'Unit (unit, set, L…)' }, { name: 'unitCost', label: 'Initial unit cost (COP)', type: 'number', step: '.01' }, { name: 'dailyDemand', label: 'Baseline daily demand', type: 'number', value: '1' }, { name: 'leadDays', label: 'Supplier lead time (days)', type: 'number', step: '1', value: '3' }, { name: 'safety', label: 'Safety stock', type: 'number', value: '2' }, { name: 'pack', label: 'Purchase pack size', type: 'number', value: '1' }] })}>{t("Add material")}</button>)}</>))}<Panel title="Material requests" subtitle="Partial delivery is supported; warehouse availability is revalidated on the server."><div className="table-wrap"><table><thead><tr><th>{t("Request")}</th><th>{t("Material")}</th><th>{t("Requested / issued")}</th><th>{t("Status")}</th><th></th></tr></thead><tbody>{localize(state.requests.map(request => <tr key={request.id}><td><strong>{localize(request.id)}</strong><small>{localize(person(request.employeeId))}{t(" \u00B7 ")}{localize(request.orderId)}</small></td><td>{materialName(state.items.find(item => item.id === request.itemId),t)}</td><td>{localize(qty(request.quantity))}{t(" / ")}{localize(qty(request.fulfilled))}</td><td><Status value={request.cancelled ? 'Cancelled' : request.fulfilled >= request.quantity ? 'Fulfilled' : request.fulfilled ? 'Partially fulfilled' : 'Pending'}/></td><td><div className="actions wrap">{localize(!request.cancelled && request.fulfilled < request.quantity && <>{localize(clerk && <button className="primary" onClick={() => open({ title: `Issue ${request.id}`, action: 'material.issue', fields: [hidden('requestId', request.id), { ...quantityField, value: String((request.quantity - request.fulfilled) / 1000) }] })}>{t("Issue")}</button>)}{localize((clerk || technician) && <button disabled={busy} onClick={() => void command('request.cancel', { requestId: request.id })}>{t("Cancel remainder")}</button>)}</>)}</div></td></tr>))}</tbody></table></div></Panel><StockVisual data={data}/><Panel title="Inventory"><div className="table-wrap"><table><thead><tr><th>{t("Material")}</th><th className="number">{t("On hand")}</th><th className="number">{t("Unit cost")}</th><th className="number">{t("Reorder point")}</th><th></th></tr></thead><tbody>{localize(state.items.map(item => <tr key={item.id}><td><strong>{materialName(item,t)}</strong><small>{localize(item.sku)}{t(" \u00B7 ")}{localize(item.unit)}</small></td><td className="number">{localize(qty(item.stock))} {localize(item.unit)}</td><td className="number">{localize(money(item.unitCostCents))}</td><td className="number">{localize(technician ? '—' : qty(data.suggestions.find(suggestion => suggestion.itemId === item.id)?.point || 0))}</td><td>{localize(admin && <button className="text-button" onClick={() => open({ title: `Reorder policy · ${item.name}`, action: 'item.settings', fields: [hidden('itemId', item.id), { name: 'dailyDemand', label: 'Baseline daily demand', type: 'number', value: String(item.dailyDemand / 1000) }, { name: 'leadDays', label: 'Lead time (days)', type: 'number', step: '1', value: String(item.leadDays) }, { name: 'safety', label: 'Safety stock', type: 'number', value: String(item.safety / 1000) }, { name: 'pack', label: 'Purchase pack size', type: 'number', value: String(item.pack / 1000) }] })}>{t("Configure")}</button>)}</td></tr>))}</tbody></table></div></Panel><Panel title="Stock movement ledger" subtitle="Original issue costs are preserved. Returns append a compensating movement."><div className="table-wrap"><table><thead><tr><th>{t("Movement")}</th><th>{t("Material")}</th><th>{t("Quantity")}</th><th>{t("Reference")}</th><th>{t("Value")}</th><th></th></tr></thead><tbody>{localize([...state.movements].reverse().map(movement => <tr key={movement.id}><td><strong>{localize(movement.kind)}</strong><small>{localize(movement.id)}{t(" \u00B7 ")}{localize(dateAt(movement.at))}</small></td><td>{materialName(state.items.find(item => item.id === movement.itemId),t)}</td><td>{localize(qty(movement.quantity))}</td><td>{movement.orderId || (movement.reference==='Synthetic opening scenario'?t(movement.reference):movement.reference)}<small>{localize(movement.actor)}</small></td><td>{localize(money(movement.amountCents))}</td><td>{localize(clerk && movement.kind === 'Issue' && !['Closed', 'Cancelled'].includes(state.orders.find(order => order.id === movement.orderId)?.status || '') && <button className="text-button" onClick={() => open({ title: 'Accept material return', action: 'material.return', fields: [hidden('sourceId', movement.id), quantityField, { name: 'reason', label: 'Return reason', type: 'textarea' }] })}>{t("Return")}</button>)}</td></tr>))}</tbody></table></div></Panel></>;
    else if (view === 'purchasing')
        content = <>{localize(pageHeading('REPLENISHMENT', 'Purchasing', 'Suggestions become stock only after approval, ordering, and receipt.'))}<Panel title="Reorder suggestions" subtitle="Inventory position includes outstanding approved and ordered quantities."><div className="table-wrap"><table><thead><tr><th>{t("Material")}</th><th>{t("On hand / incoming")}</th><th>{t("Reorder / target")}</th><th>{t("Suggested quantity")}</th><th></th></tr></thead><tbody>{localize(data.suggestions.map(suggestion => { const item = state.items.find(entry => entry.id === suggestion.itemId)!; return <tr key={item.id}><td><strong>{materialName(item,t)}</strong><small>{localize(qty(item.dailyDemand))}{t(" / day \u00B7 ")}{localize(item.leadDays)}{t("-day lead time")}</small></td><td>{localize(qty(item.stock))}{t(" / ")}{localize(qty(suggestion.outstanding))}</td><td>{localize(qty(suggestion.point))}{t(" / ")}{localize(qty(suggestion.target))}</td><td>{localize(suggestion.quantity ? <Badge color="amber">{localize(qty(suggestion.quantity))} {localize(item.unit)}</Badge> : <Badge color="teal">{t("Covered")}</Badge>)}</td><td>{localize(admin && suggestion.quantity > 0 && <button className="primary" onClick={() => open({ title: 'Approve replenishment', action: 'purchase.approve', fields: [hidden('itemId', item.id), { name: 'supplier', label: 'Supplier', value: 'Central Heavy Parts' }, { name: 'unitCost', label: 'Purchase unit cost (COP)', type: 'number', step: '.01', value: String(item.unitCostCents / 100) }], note: `The server will re-evaluate the current shortfall. Current suggestion: ${qty(suggestion.quantity)} ${item.unit}.` })}>{t("Review purchase")}</button>)}</td></tr>; }))}</tbody></table></div></Panel><Panel title="Purchase orders"><div className="table-wrap"><table><thead><tr><th>{t("Purchase")}</th><th>{t("Material")}</th><th>{t("Ordered / received")}</th><th>{t("Status")}</th><th></th></tr></thead><tbody>{localize(state.purchases.length ? state.purchases.map(purchase => <tr key={purchase.id}><td><strong>{localize(purchase.id)}</strong><small>{purchase.supplier}</small></td><td>{materialName(state.items.find(item => item.id === purchase.itemId),t)}<small>{localize(money(purchase.unitCostCents))}{t(" / unit")}</small></td><td>{localize(qty(purchase.quantity))}{t(" / ")}{localize(qty(purchase.received))}</td><td><Status value={purchase.status}/></td><td><div className="actions wrap">{localize(admin && purchase.status === 'Approved' && <button disabled={busy} onClick={() => void command('purchase.order', { purchaseId: purchase.id })}>{t("Record order")}</button>)}{localize(admin && ['Approved', 'Ordered'].includes(purchase.status) && !purchase.received && <button disabled={busy} onClick={() => void command('purchase.cancel', { purchaseId: purchase.id })}>{t("Cancel purchase")}</button>)}{localize(clerk && ['Ordered', 'Partially received'].includes(purchase.status) && <button className="primary" onClick={() => open({ title: `Receive ${purchase.id}`, action: 'purchase.receive', fields: [hidden('purchaseId', purchase.id), { ...quantityField, value: String((purchase.quantity - purchase.received) / 1000) }, { name: 'reference', label: 'Unique delivery reference' }] })}>{t("Receive delivery")}</button>)}</div></td></tr>) : <tr><td colSpan={5} className="empty">{t("No purchase has been approved yet.")}</td></tr>)}</tbody></table></div></Panel></>;
    else if (view === 'equipment')
        content = <>{localize(pageHeading('EQUIPMENT CONTROL', 'Equipment', 'Power and useful activity are separate observations. Readings in this workspace are simulated.'))}<div className="equipment-grid">{localize(state.equipment.map(equipment => { const current = equipment.segments.at(-1)!; const stats = data.equipmentStats[equipment.id]; function event(status: EquipmentStatus) { return command('equipment.event', { equipmentId: equipment.id, status, eventId: crypto.randomUUID() }); } return <section className="equipment-card" key={equipment.id}><EquipmentVisual equipment={equipment} minute={state.clock.minute}/><h2>{localize(equipment.name)}</h2><span className="asset-code">{localize(equipment.id)}{t(" \u00B7 ")}{localize(current.orderId || 'Unallocated workshop overhead')}</span><Status value={current.status}/><div className="asset-value">{localize(state.clock.minute - current.start)} <span className="muted">{t("min")}</span></div><p className="muted">{t("In current observation state")}</p><dl><div><dt>{t("Effective time")}</dt><dd>{localize(stats.working)}{t(" min")}</dd></div><div><dt>{t("Observed idle")}</dt><dd>{localize(stats.idle)}{t(" min")}</dd></div><div><dt>{t("Unknown intervals")}</dt><dd>{localize(stats.unknown + stats.poweredUnknown)}{t(" min")}</dd></div><div><dt>{t("Coverage")}</dt><dd>{localize(Math.round(stats.coverage * 100))}{t("%")}</dd></div><div><dt>{t("Known energy estimate")}</dt><dd>{localize(money(stats.energy))}</dd></div></dl>{localize(manager && <div className="actions wrap"><button className="primary" disabled={busy} onClick={() => void event('Working')}>{t("Useful work")}</button><button disabled={busy} onClick={() => void event('Idle')}>{t("Record idle")}</button><button disabled={busy} onClick={() => void event('Off')}>{t("Power off")}</button><button disabled={busy} onClick={() => void event('Unknown power')}>{t("Lose telemetry")}</button><button onClick={() => open({ title: `Assign equipment · ${equipment.id}`, action: 'equipment.event', fields: [hidden('equipmentId', equipment.id), hidden('eventId', crypto.randomUUID()), { ...orderSelect, options: [{ value: '', label: 'Unallocated workshop overhead' }, ...orderOptions], required: false }, { name: 'status', label: 'Observed state', type: 'select', options: ['Working', 'Idle', 'Powered unknown activity', 'Unknown power'].map(value => ({ value, label: value })) }] })}>{t("Attach to order")}</button></div>)}{localize(admin && <button className="text-button" onClick={() => open({ title: `Power profile · ${equipment.id}`, action: 'equipment.settings', fields: [hidden('equipmentId', equipment.id), { name: 'workWatts', label: 'Working power (W)', type: 'number', step: '1', value: String(equipment.workWatts) }, { name: 'idleWatts', label: 'Idle power (W)', type: 'number', step: '1', value: String(equipment.idleWatts) }, { name: 'tariff', label: 'Tariff (COP/kWh)', type: 'number', step: '.01', value: String(equipment.tariffCents / 100) }], note: 'New profiles apply to new observation intervals; historical intervals keep their original values.' })}>{t("Configure profile")}</button>)}</section>; }))}</div><div className="section-space"><Panel title="Idle alerts" subtitle="An alert opens after 15 continuous simulated minutes of observed idle."><div className="panel-body">{localize(state.alerts.length ? [...state.alerts].reverse().map(alert => <div className="list-item" key={alert.id}><div><h3>{localize(alert.id)}{t(" \u00B7 ")}{localize(alert.equipmentId)}</h3><p>{localize(dateAt(alert.at))}{t(" \u00B7 ")}{localize(alert.acknowledgedBy ? `Acknowledged by ${alert.acknowledgedBy}` : 'Awaiting acknowledgement')}{localize(alert.unverified ? ' · Current observation unverified' : '')}</p><Status value={alert.status}/></div>{localize(manager && alert.status === 'Open' && <button disabled={busy} onClick={() => void command('alert.acknowledge', { alertId: alert.id })}>{t("Acknowledge")}</button>)}</div>) : <p className="muted">{t("No idle alerts yet. Advance the clock to observe the threshold.")}</p>)}<p className="small-note">{t("Acknowledgement records responsibility. A confirmed return to work or power-off resolves an episode. Unknown data is never counted as measured idle or zero energy.")}</p></div></Panel><Panel title="Event ingestion history"><div className="panel-body">{localize([...state.events].reverse().slice(0, 15).map(event => <div className="list-item" key={event.id}><div><h3>{localize(event.equipmentId)}{t(" \u00B7 ")}{localize(event.status)}</h3><p>{localize(event.id)}{t(" \u00B7 ")}{localize(dateAt(event.at))}</p></div><Badge color={event.result === 'Quarantined' ? 'amber' : 'teal'}>{localize(event.result)}</Badge></div>))}{localize(!state.events.length && <p className="muted">{t("Synthetic opening intervals are loaded. New observations appear here.")}</p>)}</div></Panel></div></>;
    else if (view === 'costs')
        content = <>{localize(pageHeading('SERVICE FINANCE', 'Costs & invoices', 'Operating costs use recorded quantities, time segments, and price snapshots.'))}<label className="field filter-field">{t("Service order")}<select value={chosen?.id || ''} onChange={event => setSelectedOrder(event.target.value)}>{localize(state.orders.map(order => <option key={order.id} value={order.id}>{localize(order.id)}{t(" \u00B7 ")}{vehicleFor(order.vehicleId)?.name}</option>))}</select></label>{localize(chosen && <div className="columns"><Panel title="Cost breakdown" subtitle={chosen.status === 'Closed' ? 'Reconciled closure snapshot' : 'Provisional operating cost'}><div className="panel-body">{localize([['Materials, net of returns', data.costs[chosen.id].materials], ['Recorded active labor', data.costs[chosen.id].labor], ['Known allocated energy estimate', data.costs[chosen.id].energy]].map(([label, value]) => <div className="cost-mark" key={String(label)}><div className="cost-mark-label"><span>{localize(label)}</span><strong>{money(value as number)}</strong></div><div className="cost-track"><span style={{width:`${data.costs[chosen.id].total?Number(value)/Number(data.costs[chosen.id].total)*100:0}%`}}/></div></div>))}<div className="invoice-total"><span>{t("Operating cost")}</span><span>{localize(money(data.costs[chosen.id].total))}</span></div><p className="small-note">{t("Unknown energy intervals: ")}{localize(data.costs[chosen.id].unknownMinutes)}{t(" min. Energy remains an estimate, even when observation coverage is complete.")}</p>{localize(admin && !state.invoices.some(invoice => invoice.orderId === chosen.id) && <button className="primary section-space" disabled={busy || chosen.status !== 'Closed'} onClick={() => void command('invoice.create', { orderId: chosen.id })}>{t("Issue educational invoice")}</button>)}</div></Panel><Panel title="Educational invoice"><div className="panel-body">{localize(state.invoices.filter(invoice => invoice.orderId === chosen.id).map(invoice => <article className="invoice-sheet" key={invoice.id}><h2>{localize(invoice.id)}</h2><p>{invoice.customer}<br />{invoice.vehicle}</p><p>{['SO-1041','SO-1042','SO-1043'].includes(invoice.orderId)?t(invoice.description):invoice.description}</p><p className="small-note">{t("Issued ")}{localize(dateAt(invoice.at))}{t(" \u00B7 ")}{localize(invoice.issuedBy)}</p>{localize([['Net materials', invoice.cost.materials], ['Recorded labor', invoice.cost.labor], ['Estimated energy', invoice.cost.energy]].map(([label, value]) => <div className="cost-row" key={String(label)}><span>{localize(label)}</span><span>{localize(money(Number(value)))}</span></div>))}<div className="invoice-total"><span>{t("Total")}</span><span>{localize(money(invoice.cost.total))}</span></div><p className="small-note">{t("Educational invoice \u00B7 Cost-based demonstration pricing \u00B7 No modeled tax or markup. Not an official tax document.")}</p><button className="section-space" onClick={() => window.print()}>{t("Print invoice")}</button></article>))}{localize(!state.invoices.some(invoice => invoice.orderId === chosen.id) && <p className="muted">{t("Close and reconcile the order before issuing its stable invoice snapshot.")}</p>)}</div></Panel></div>)}</>;
    else if (view === 'reports')
        content = <>{localize(pageHeading('OPERATIONAL EVIDENCE', 'Reports & history', 'Export actual recorded movements and time intervals for the selected period.'))}<div className="form-row report-controls"><label className="field">{t("Report type")}<select value={reportKind} onChange={event => setReportKind(event.target.value)}><option value="orders">{t("Order costs")}</option><option value="materials">{t("Material movements")}</option><option value="equipment">{t("Equipment utilization")}</option>{localize(financial && <><option value="vehicles">{t("Costs by vehicle")}</option><option value="technicians">{t("Costs by technician")}</option></>)}</select></label><label className="field">{t("Service order")}<select value={reportOrder} onChange={event => setReportOrder(event.target.value)}><option value="">{t("All orders")}</option>{localize(state.orders.map(order => <option key={order.id} value={order.id}>{localize(order.id)}</option>))}</select></label><label className="field">{t("From date")}<input type="date" value={reportFrom} onChange={event => setReportFrom(event.target.value)}/></label><label className="field">{t("Through date")}<input type="date" value={reportTo} onChange={event => setReportTo(event.target.value)}/></label><a className="button-link primary" href={`/api/reports?scenario=${data.scenario.id}&kind=${reportKind}&order=${encodeURIComponent(reportOrder)}&from=${reportFrom}&to=${reportTo}&lang=${locale}`}>{t("Export period CSV")}</a></div><Panel title="Current order totals" subtitle="Cumulative totals below; the CSV applies the chosen date window to source records.">{localize(ordersTable())}</Panel>{localize(admin && <Panel title="Operation history" subtitle="Append-only records retain the initiating account, scenario time, and wall-clock timestamp."><div className="panel-body">{localize(data.audit.map((record, index) => <div className="audit-item" key={index}><time>{localize(dateAt(record.scenario_minute))}</time><div><strong>{t(record.action)}</strong><small>{localize(record.actor_name)}{t(" \u00B7 Recorded ")}{localize(new Date(record.recorded_at).toLocaleString(locale === 'es' ? 'es-CO' : 'en-US', { timeZone: 'America/Bogota' }))}</small><details><summary>{t("Operation details")}</summary><pre>{localize(JSON.stringify(localizeRecord(record.details), null, 2))}</pre></details></div></div>))}</div></Panel>)}</>;
    else
        content = <>{localize(pageHeading('SYSTEMS THEORY IN ACTION', 'Simulation', 'Observe feedback, invariant enforcement, and a reproducible policy comparison.'))}<Panel title="Guided operational scenario" subtitle="Uses the same server-side domain operations as manual work."><div className="panel-body"><ol className="scenario-steps"><li>{t("Issue the baseline pending oil filters.")}</li><li>{t("Advance five simulated minutes to the idle threshold.")}</li><li>{t("Acknowledge the alert and confirm compressor power-off.")}</li><li>{t("Finish recorded interventions.")}</li><li>{t("Review and close the service order.")}</li><li>{t("Issue its educational invoice.")}</li></ol><button className="primary" disabled={busy} onClick={() => void command('simulation.run')}>{t("Run guided scenario")}</button><button className="section-space" onClick={() => open({ title: 'Reset this workspace scenario', action: 'scenario.reset', fields: [], note: 'This replaces the current operational scenario with its synthetic baseline. Audit history is retained. Other workspaces are unaffected.' })}>{t("Reset to baseline")}</button><p className="small-note">{t("The audit explicitly identifies synthetic engine activity initiated by your administrator account. It does not pretend that employees signed in and performed these actions themselves.")}</p></div></Panel>{localize(data.comparison && <Panel title="Controlled versus uncontrolled policy" subtitle={`Seed ${data.comparison.seed} · ${data.comparison.jobs} identical synthetic jobs`}><div className="panel-body"><div className="table-wrap"><table><thead><tr><th>{t("Measure")}</th><th>{t("Uncontrolled policy")}</th><th>{t("Controlled policy")}</th></tr></thead><tbody><tr><td>{t("Material cost")}</td><td>{localize(money(data.comparison.uncontrolled.materials))}</td><td>{localize(money(data.comparison.controlled.materials))}</td></tr><tr><td>{t("Estimated energy cost")}</td><td>{localize(money(data.comparison.uncontrolled.energy))}</td><td>{localize(money(data.comparison.controlled.energy))}</td></tr><tr><td>{t("Powered idle time")}</td><td>{localize(data.comparison.uncontrolled.idleMinutes)}{t(" min")}</td><td>{localize(data.comparison.controlled.idleMinutes)}{t(" min")}</td></tr><tr><td>{t("Unassigned requests rejected")}</td><td>{t("0")}</td><td>{localize(data.comparison.controlled.rejectedUnassigned)}</td></tr></tbody></table></div><h3 className="section-space">{t("Assumptions and interpretation")}</h3><ul className="assumptions">{localize(data.comparison.assumptions.map(assumption => <li key={assumption}>{localize(assumption)}</li>))}</ul></div></Panel>)}<Panel title="Trace the system"><div className="panel-body"><p>{t("Input: an assigned technician\u2019s material request. Process: validation and one atomic stock operation. Output: a delivery record and attributed cost. Feedback: a reorder suggestion followed by approval and actual receipt.")}</p><p>{t("For equipment, an observation becomes information about idle time. An alert prompts a human action; acknowledgement alone does not change the physical process.")}</p><a href="/design/models/index.html" target="_blank" rel="noreferrer">{t("Explore the system model atlas")}</a></div></Panel></>;
    return <><AppChrome data={data} context={context} view={view} navigate={setView} allowed={allowed[role]} busy={busy} connected={connected} onCommand={(action, payload) => void command(action, payload)} onSwitch={() => open({ title: 'Switch employee account', action: 'account.switch', note: 'Sign in with the password for the selected account in this workspace.', fields: [{ name: 'username', label: 'Employee account', type: 'select', options: staff, value: data.actor.username }, { name: 'password', label: 'Password', type: 'password' }] })} onSignOut={() => void signOut()}>{localize(content)}</AppChrome>{localize(notice && <div className="notification" role="status"><Icon name="check"/>{localize(notice)}</div>)}{localize(modal && <Modal spec={modal} busy={busy} error={error} close={() => { if (!busy)
        setModal(null); }} submit={values => void modalSubmit(values)}/>)}</>;
}

export default function WorkshopApp(){return <I18nProvider><Workshop/></I18nProvider>;}
