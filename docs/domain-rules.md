# Domain rules and assumptions

## Meaning of invariants

For this project, an invariant means a relationship or rule that must remain true across valid operations. The supplied guides do not provide a specific definition for the syllabus phrase "invariant relationships". This application of the concept must be identified as a modeling interpretation rather than a quotation from the course material.

## Invariants to enforce

| ID | Relationship | Required evidence |
| --- | --- | --- |
| INV-01 | Every material issue belongs to an open service order and an assigned technician. | Valid issue succeeds; missing or invalid links fail. |
| INV-02 | Available stock never becomes negative. | Insufficient and concurrent withdrawals cannot overdraw stock. |
| INV-03 | Recording an issue, changing stock, and attributing its material cost succeed together or leave no changes. | A failed transaction leaves the ledger, stock, and cost consistent. |
| INV-04 | A service order cannot enter active work without an assigned technician. | Transition guard rejects the invalid operation. |
| INV-05 | One technician has at most one running intervention at a time. | Conflicting starts are rejected, including concurrent requests. |
| INV-06 | A completed intervention has an end time at or after its start. | Negative durations fail validation. |
| INV-07 | For a fully observed powered session, powered time equals effective time plus idle time. Unobserved time is reported separately. | State intervals reconcile and unknown time remains explicit. |
| INV-08 | Each equipment event is applied at most once. | Replaying an event cannot duplicate time or cost. |
| INV-09 | Historical issued-material cost uses its recorded unit cost rather than the item's current price. | Price changes do not rewrite past order costs. |
| INV-10 | An invoice snapshot remains stable after issuance; corrections are explicit. | Later catalog changes cannot alter its totals. |
| INV-11 | Role permissions and demonstration-session boundaries hold for every read and write. | Unauthorized and cross-session requests fail. |
| INV-12 | An order cannot close while its interventions or exclusive equipment sessions remain active. | Closure fails until pending work is resolved. |

These are design rules, not claims of implemented safeguards. Additional transition guards and state names will be established in the modeling increment.

## Inventory balance

`closing stock = opening stock + receipts + accepted returns + signed adjustments - issues`

All quantities use the item's declared unit. Signed adjustments require a reason and responsible user. A return must reference its original issue and cannot exceed the net unreturned quantity.

## Reorder policy

Proposed initial model:

`reorder point = average daily demand * supplier lead time in days + safety stock`

Demand window, lead time, safety stock, outstanding purchase quantities, and the distinction between available and reserved stock must be defined before coding the policy. A reorder point does not by itself determine how much to buy; select and document a replenishment target or lot-sizing rule. Generate suggestions idempotently and avoid repeated purchases for the same shortage.

## Cost model

Material cost comes from issue cost snapshots net of accepted returns. Labor cost comes from intervention duration and a declared hourly cost snapshot. Estimated energy cost comes from state durations, configured power profiles, and a tariff snapshot.

`order operating cost = material cost + labor cost + allocated estimated energy cost`

Revenue, margin, taxes, and operating cost are distinct quantities. The first invoice model must state its pricing and rounding assumptions. Educational invoices are not represented as official tax documents.

## Information and indicators

| Raw data | Derived information | Decision supported |
| --- | --- | --- |
| Item, issue quantity, technician, order, unit cost | Material cost by order and technician | Investigate unusually high consumption |
| Power and activity events | Effective time, idle time, utilization | Respond to an idle equipment alert |
| Daily demand, lead time, safety stock | Reorder point and suggested replenishment | Review and authorize purchasing |
| Intervention start and end times | Recorded labor duration | Review workload and service progress |

Define a reference duration and job comparability before calling an indicator "technician efficiency". Duration alone measures time, not competence or productivity across different repairs.

## Alerts and control

An alert is a signal, not a corrective action. Record detection, acknowledgement, the responsible user, and resolution. A demonstrated feedback loop must include the action that changes the process, such as switching an idle equipment item off or authorizing replenishment.

## Proposed values

The inherited 15-minute idle threshold and other numerical targets are configurable proposals. Simulation can accelerate the clock to demonstrate them. Keep the threshold in simulated minutes and make the acceleration visible; do not replace it silently with a few real seconds.
