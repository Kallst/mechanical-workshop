# Project scope

## Problem and objective

A heavy-vehicle workshop has rising material and electricity costs, unrestricted material requests, paper-based records, and delayed inventory review. Managers lack timely evidence connecting each vehicle, technician, material withdrawal, and equipment session.

The project will implement a complete application that records operations, enforces their relationships, and produces information that supports corrective decisions during the workday. Its academic purpose is to demonstrate how Systems Theory analysis guides an operational software design.

## Two boundaries

The workshop is a sociotechnical system: people, procedures, vehicles, stock, equipment, energy, and information interact to deliver maintenance services. The application is its information and control-support subsystem. The application records an equipment event; it does not physically repair a vehicle or guarantee that a person responds to an alert.

Customers, suppliers, and the energy provider belong to the workshop environment. Human users and a simulated telemetry source interact with the software across the application boundary. A supplier is not automatically a software actor unless a specific interaction is implemented.

## Users and demonstration data

Administrators monitor costs and purchasing; workshop managers assign work and act on equipment alerts; warehouse clerks manage stock movements; technicians record interventions and request materials. Customers receive educational service invoices; a customer portal is deferred.

Use Tamara as administrator, Juan Jacobo as workshop manager, Juanita as warehouse clerk, and Brian, Nicolás, Álan, and Anderson as technicians in the initial fictional dataset. The roles are a design assumption and remain editable. Use synthetic customers and vehicles.

## Included scope

- Server-side authentication, role permissions, session handling, and an audit trail.
- Customer and vehicle records, service orders, technician assignments, and timed interventions.
- Material requests, issues, returns, receipts, and justified inventory adjustments.
- Stock visibility, configurable reorder inputs, purchase suggestions, purchase orders, and receipts.
- Equipment power and activity states, effective and idle time, alerts, and estimated energy costs.
- Order cost breakdowns, educational invoices, reports, and operational dashboards.
- Deterministic demonstration scenarios, explicit accelerated time, and isolated demonstration sessions.
- Requirements, models, mockups, traceability, tests, and a visible GitFlow history.
- Responsive layouts suitable for computers, tablets, and phones.

## Deferred integrations

Physical sensors, hardware control, external supplier purchasing, payment processing, official tax invoicing, payroll, and external customer authentication are deferred. MQTT is an inherited proposed integration target; the first simulator will use the application's validated event contract. A real MQTT adapter must be documented and tested before claiming MQTT support.

## Delivery environments

Local execution is required. An accessible hosted demonstration is desirable, with isolated sessions so visitors cannot interfere with the presenter's scenario. Hosting provider, credentials, cost, and URL remain undecided. Creating this repository does not deploy the application.

## Completion criteria

1. A clean checkout can start using documented configuration and migrations.
2. The seven named employees are present in a synthetic seed dataset.
3. Each role can perform its intended operations and the server rejects unauthorized actions.
4. An end-to-end service order changes persisted stock, time, cost, and reports consistently.
5. Invalid stock movements and invalid order transitions are rejected without partial changes.
6. Equipment power, effective use, idle time, and unknown telemetry are distinguished.
7. A reproducible accelerated scenario demonstrates an alert and a corrective action.
8. Academic models, requirements, code, tests, and evidence agree.
9. Implemented and tested capabilities are clearly distinguished from deferred targets and simulated outcomes.
10. The UI and technical project artifacts use English; the academic presentation uses Spanish.
