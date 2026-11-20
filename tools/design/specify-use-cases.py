"""Generate English textual use cases and model-to-requirement traceability."""
from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/models'
model = json.loads((DEST/'model-contract.json').read_text(encoding='utf-8'))
specs = [
    ('UC-01', 'Workshop manager', 'Authenticated manager in an owned scenario.',
     ['Enter customer details.', 'Register a vehicle against the customer with a unique scenario-scoped reference.', 'Confirm and retrieve the linked records.'],
     'An existing reference opens the existing record; invalid fields are shown for correction.',
     'A persistence failure saves neither a partial vehicle nor an invalid relationship.',
     'Valid customer and vehicle records are available for orders.'),
    ('UC-02', 'Workshop manager', 'Customer and vehicle exist; user is authorized.',
     ['Create a Draft order and describe the requested service.', 'Submit to Open after validating references.', 'Request review only after interventions and material requests are settled.', 'Close after reviewing reconciled costs, or return to work with a reason.'],
     'Cancel Draft or Open only before fulfilled work; invalid lifecycle transitions return their guard reason.',
     'A failed transition leaves the previous state and its history intact.',
     'The order retains its state history; closure does not implicitly create an invoice.'),
    ('UC-03', 'Workshop manager', 'A nonterminal order and enabled technician records exist.',
     ['Select the order.', 'Select one or more technicians and review current workload.', 'Confirm and store assignments without starting their timers.'],
     'Multiple planned assignments are allowed; attempting to remove a technician with unsettled work requires resolving that work first.',
     'Concurrent conflicting assignment edits are rejected or refreshed without losing confirmed changes.',
     'Assignments identify who may perform interventions or receive material.'),
    ('UC-04', 'Technician', 'User is assigned to an Open or In progress order.',
     ['Start an intervention after checking that the technician has no other running intervention.', 'Record active segments; pause and resume when appropriate.', 'Finish with an outcome and close the last running segment.'],
     'On hold orders reject starts and resumes; paused time is excluded; finishing while paused adds no paused duration.',
     'An interrupted save retains the previous committed state and supports an idempotent retry.',
     'Recorded running segments determine labor duration and the order reflects actual started work.'),
    ('UC-05', 'Technician', 'User is assigned to an order permitting material requests.',
     ['Select the order and item.', 'Enter a positive quantity in the declared unit.', 'Submit and receive a pending request reference.'],
     'Invalid quantities or assignments return a correction message; a pending request does not reserve stock.',
     'If saving fails, no request is reported as confirmed.',
     'The request is attributable and visible to the warehouse clerk.'),
    ('UC-06', 'Warehouse clerk; technician is the material recipient', 'Request exists; order is Open or In progress; recipient is assigned.',
     ['Review the requested item, recipient, order, and quantity.', 'Validate the order and assignment (included behavior).', 'Within one transaction, revalidate current stock and order, record the issue and cost snapshot, update stock, fulfillment, and audit history (included stock movement).', 'Confirm the issue and resulting cost; at the extension point after stock commit, suggest replenishment when inventory position is below the reorder point.'],
     'Insufficient stock permits an explicitly accepted partial quantity or leaves the remainder pending; invalid or changed assignment rejects delivery without a stock change.',
     'A technical or concurrency failure rolls back all related writes and returns a retryable result where appropriate.',
     'Stock, ledger, fulfillment, and attributed cost agree; one physical delivery is not duplicated by a retry.'),
    ('UC-07', 'Warehouse clerk; technician declares the return', 'An original issue exists in the owned scenario and the order permits corrective return.',
     ['Select the original issue.', 'Verify returned item and positive quantity against the unreturned balance.', 'Commit a compensating stock movement and original-cost reversal, then confirm.'],
     'Over-return or an unsupported post-closure correction is rejected; partial returns retain the remaining returnable balance.',
     'A failed commit changes neither stock nor net order cost.',
     'The original issue remains intact and the accepted return is attributable.'),
    ('UC-08', 'Warehouse clerk', 'Item exists and the user can record stock movements.',
     ['Select a receipt or justified adjustment.', 'Enter quantity, unit, and reference or reason.', 'Commit the movement and valuation changes and retrieve the new balance.'],
     'A negative adjustment that would overdraw stock is rejected; a purchase receipt uses its remaining outstanding quantity.',
     'Duplicate receipt keys cannot add stock twice; failed persistence rolls back the movement.',
     'The stock balance and movement ledger reconcile.'),
    ('UC-09', 'Administrator approves; warehouse clerk receives', 'Item demand history and replenishment settings are available.',
     ['Calculate inventory position, reorder point, and pack-rounded suggested quantity.', 'Administrator reviews and approves the suggestion and records the purchase as Ordered.', 'Warehouse clerk records full or partial delivery.', 'Reduce outstanding quantity and add only the received quantity to on-hand stock.'],
     'Reject or revise an unapproved suggestion; approved quantities prevent duplicate replenishment suggestions for the same shortfall.',
     'A receipt failure leaves outstanding and on-hand quantities unchanged.',
     'Purchasing history distinguishes a suggestion, commitment, order, and actual receipt.'),
    ('UC-10', 'Workshop manager; simulated telemetry source is a supporting actor', 'Equipment profile, scenario time basis, and event principal are valid.',
     ['Receive a uniquely identified timestamped power or activity event.', 'Validate its source, ownership, order, and event sequence; deduplicate retries.', 'Close the previous observed interval and update the new observation state.', 'Update durations and coverage; at the duration-update extension point create one alert if continuous observed idle reaches the configured threshold.'],
     'Missing or stale data becomes unknown; out-of-order events are quarantined rather than silently rewriting finalized intervals.',
     'A storage failure keeps the event unconfirmed and allows an idempotent resend.',
     'Known effective, idle, powered-unknown, and unknown-power durations remain distinguishable.'),
    ('UC-11', 'Workshop manager', 'An idle episode has an open or acknowledged alert.',
     ['Inspect the equipment state and alert evidence.', 'Acknowledge responsibility.', 'Power off the equipment or resume useful work, represented by an observed event in this simulation.', 'Resolve the alert only after the corrective observation is confirmed.'],
     'Acknowledgement alone leaves the alert unresolved; stale telemetry labels the observation Unverified.',
     'A failed command or missing confirmation cannot be displayed as a successful equipment action.',
     'The action and resolution are attributable and the feedback loop has an observable effect.'),
    ('UC-12', 'Administrator or workshop manager', 'Order records exist and user has read permission.',
     ['Select an order.', 'Calculate the included cost breakdown from net issues, active labor, and allocated known energy.', 'Inspect estimates, coverage, and any unallocated equipment overhead.'],
     'An open order shows a provisional total; unknown energy coverage is not silently treated as zero measured consumption.',
     'Unavailable source data produces an incomplete-data result instead of a fabricated total.',
     'The user sees attributable components and explicit calculation assumptions.'),
    ('UC-13', 'Administrator; invoice recipient is a supporting actor', 'Order is Closed and its costs and pricing assumptions are reconciled.',
     ['Select the closed order.', 'Calculate the included cost breakdown and apply the declared educational pricing policy.', 'Persist a unique invoice header and line snapshot atomically.', 'Generate the educational invoice document for administrator delivery to its recipient.'],
     'A repeated command returns the existing invoice; open orders cannot be invoiced.',
     'A failed invoice transaction creates no partial invoice; document rendering may be retried from the committed snapshot.',
     'The issued invoice is stable and explicitly educational, with no tax-invoicing integration claimed.'),
    ('UC-14', 'Administrator; workshop manager and warehouse clerk have scoped views', 'User has reporting permission in the owned scenario.',
     ['Choose the authorized operational view and time window.', 'Read consistent persisted records and calculate indicators.', 'Display units, time basis, observation coverage, and data refresh status.', 'Export a report when the implementation provides the verified export path.'],
     'An empty period shows a valid empty result; role restrictions limit data fields and actions.',
     'A connection or query failure preserves a visible stale/error state rather than presenting old data as current.',
     'Totals are traceable to their records and selected period.'),
    ('UC-15', 'Staff member', 'A provisioned account exists.',
     ['Submit credentials.', 'Validate the stored credential verifier, account status, and login-attempt policy.', 'Create a protected session with a server-derived role and scenario access.'],
     'Invalid credentials return a generic access error; the proposed failed-attempt threshold is configurable and must include a recovery policy.',
     'An identity-store failure creates no authenticated session.',
     'Authorized sessions exist only after verified authentication; role selection in a mockup is not this use case.'),
    ('UC-16', 'Demonstration operator acting as a scenario owner', 'Authenticated user owns or can create the requested demonstration scenario.',
     ['Choose a declared seed and clock rate or load the baseline.', 'Pause or advance scenario time and produce synthetic operations through the same domain contracts.', 'Inspect outcomes or compare equivalent control-policy runs.', 'Reset or version only the owned scenario with an audit record.'],
     'Cross-scenario commands and unauthorized resets are rejected; comparison runs keep demand, prices, horizon, and seed equivalent.',
     'A failed reset leaves the previous scenario recoverable and does not affect another owner.',
     'The scenario is reproducible, isolated, and explicitly simulated.'),
    ('UC-17', 'Administrator', 'User has permission to inspect the owned scenario audit trail.',
     ['Select an operation, record reference, or time range.', 'Read attributed audit records.', 'Follow original and compensating records to explain a correction.'],
     'No matching records produces an empty result; history is not edited through this view.',
     'An audit query failure is reported without implying that no operations occurred.',
     'The operational history remains attributable and readable without ordinary-user mutation.'),
]
cases = []
by_id={case['id']:case for case in model['use_cases']}
for uid,actors,pre,normal,alternate,failure,post in specs:
    case={**by_id[uid], 'actor_description':actors, 'preconditions':pre,'normal_flow':normal,'alternative_flow':alternate,'technical_exception':failure,'postconditions':post}
    cases.append(case)
(DEST/'use-case-specifications.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# Use case specifications','','Status: intended behavior, not implemented application behavior. Business alternatives and technical failures are separated. Authentication, authorization, scenario ownership, and attributable auditing are common constraints; they are not repeated as unnecessary include arrows on every goal.','','The diagrams show bounded projections of this catalog. Primary actors pursue a goal; supporting actors provide data or receive a result. An external telemetry source does not by itself make every automated event a human goal. Monitoring is the manager\'s goal; telemetry supports it.','']
for c in cases:
    lines += [f"## {c['id']} {c['name']}",'',f"Actors: {c['actor_description']}.",'',f"Requirements: {', '.join(c['requirements'])}.",'',f"Preconditions: {c['preconditions']}",'','Normal flow:','']
    lines += [f'{i}. {s}' for i,s in enumerate(c['normal_flow'],1)]
    lines += ['',f"Alternative flow: {c['alternative_flow']}",'',f"Technical exception: {c['technical_exception']}",'',f"Postconditions: {c['postconditions']}",'']
lines += ['## Include and extend review','','Required included behavior is always performed by its base use case. Conditional extensions are inserted at the named extension points shown in UC-06 and UC-10; their arrow points toward the base. The initial diagram focuses on replenishment after an issue, although the replenishment policy must also be recalculated after other stock or purchase changes. This does not make replenishment an exclusively issue-triggered function.','','Reference: [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1).','']
(DEST/'use-cases.md').write_text('\n'.join(lines),encoding='utf-8')
mapping={
    'FR-01':('context-operations;dfd-p2;order-states','orders'),
    'FR-02':('order-states;dfd-p2','orders'),
    'FR-03':('intervention-states;order-states','orders'),
    'FR-04':('material-delivery-activity;dfd-p3','inventory'),
    'FR-05':('material-delivery-activity;order-states','inventory'),
    'FR-06':('dfd-p3','inventory'),
    'FR-07':('material-delivery-activity;dfd-p3','inventory'),
    'FR-08':('causal-inventory;dfd-p3','purchasing'),
    'FR-09':('equipment-states;dfd-p4','equipment'),
    'FR-10':('equipment-states;causal-energy','equipment'),
    'FR-11':('dfd-p5','costs'),
    'FR-12':('dfd-p5;use-cases-control','costs'),
    'FR-13':('dfd-p6','overview'),
    'FR-14':('dfd-p6','reports'),
    'FR-15':('dfd-p1;use-cases-control','role preview only; authentication not mocked'),
    'FR-16':('material-delivery-activity;dfd-p3','inventory'),
    'FR-17':('causal-inventory;dfd-p3','purchasing'),
    'FR-18':('context-control;dfd-p6','scenario toolbar'),
    'FR-19':('dfd-p6','temporary single-browser scenario; server isolation deferred'),
    'FR-20':('dfd-p6','reports'),
}
original=list(csv.DictReader((ROOT/'docs/traceability.csv').open(encoding='utf-8',newline='')))
with (DEST/'model-traceability.csv').open('w',encoding='utf-8',newline='') as stream:
    writer=csv.DictWriter(stream,fieldnames=['requirement_id','model_ids','use_cases','mockup_view','evidence_status'],lineterminator='\n')
    writer.writeheader()
    for row in original:
        rid=row['requirement_id']
        models,view=mapping.get(rid,('architecture and quality requirements; no behavioral diagram claims','responsive views' if rid=='NFR-09' else 'not proven by mockup'))
        refs=';'.join(c['id'] for c in cases if rid in c['requirements'])
        writer.writerow(dict(requirement_id=rid,model_ids=models,use_cases=refs,mockup_view=view,evidence_status='Design only; implementation verification pending'))
print(json.dumps({'textual_use_cases':len(cases),'traceability_rows':len(original)}))
