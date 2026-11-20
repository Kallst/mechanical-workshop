# Use case specifications

Status: intended behavior, not implemented application behavior. Business alternatives and technical failures are separated. Authentication, authorization, scenario ownership, and attributable auditing are common constraints; they are not repeated as unnecessary include arrows on every goal.

The diagrams show bounded projections of this catalog. Primary actors pursue a goal; supporting actors provide data or receive a result. An external telemetry source does not by itself make every automated event a human goal. Monitoring is the manager's goal; telemetry supports it.

## UC-01 Maintain customers and vehicles

Actors: Workshop manager.

Requirements: FR-01.

Preconditions: Authenticated manager in an owned scenario.

Normal flow:

1. Enter customer details.
2. Register a vehicle against the customer with a unique scenario-scoped reference.
3. Confirm and retrieve the linked records.

Alternative flow: An existing reference opens the existing record; invalid fields are shown for correction.

Technical exception: A persistence failure saves neither a partial vehicle nor an invalid relationship.

Postconditions: Valid customer and vehicle records are available for orders.

## UC-02 Manage service orders

Actors: Workshop manager.

Requirements: FR-01.

Preconditions: Customer and vehicle exist; user is authorized.

Normal flow:

1. Create a Draft order and describe the requested service.
2. Submit to Open after validating references.
3. Request review only after interventions and material requests are settled.
4. Close after reviewing reconciled costs, or return to work with a reason.

Alternative flow: Cancel Draft or Open only before fulfilled work; invalid lifecycle transitions return their guard reason.

Technical exception: A failed transition leaves the previous state and its history intact.

Postconditions: The order retains its state history; closure does not implicitly create an invoice.

## UC-03 Assign technicians

Actors: Workshop manager.

Requirements: FR-02.

Preconditions: A nonterminal order and enabled technician records exist.

Normal flow:

1. Select the order.
2. Select one or more technicians and review current workload.
3. Confirm and store assignments without starting their timers.

Alternative flow: Multiple planned assignments are allowed; attempting to remove a technician with unsettled work requires resolving that work first.

Technical exception: Concurrent conflicting assignment edits are rejected or refreshed without losing confirmed changes.

Postconditions: Assignments identify who may perform interventions or receive material.

## UC-04 Record interventions

Actors: Technician.

Requirements: FR-03.

Preconditions: User is assigned to an Open or In progress order.

Normal flow:

1. Start an intervention after checking that the technician has no other running intervention.
2. Record active segments; pause and resume when appropriate.
3. Finish with an outcome and close the last running segment.

Alternative flow: On hold orders reject starts and resumes; paused time is excluded; finishing while paused adds no paused duration.

Technical exception: An interrupted save retains the previous committed state and supports an idempotent retry.

Postconditions: Recorded running segments determine labor duration and the order reflects actual started work.

## UC-05 Request materials

Actors: Technician.

Requirements: FR-16.

Preconditions: User is assigned to an order permitting material requests.

Normal flow:

1. Select the order and item.
2. Enter a positive quantity in the declared unit.
3. Submit and receive a pending request reference.

Alternative flow: Invalid quantities or assignments return a correction message; a pending request does not reserve stock.

Technical exception: If saving fails, no request is reported as confirmed.

Postconditions: The request is attributable and visible to the warehouse clerk.

## UC-06 Issue materials

Actors: Warehouse clerk; technician is the material recipient.

Requirements: FR-04, FR-05, FR-07.

Preconditions: Request exists; order is Open or In progress; recipient is assigned.

Normal flow:

1. Review the requested item, recipient, order, and quantity.
2. Validate the order and assignment (included behavior).
3. Within one transaction, revalidate current stock and order, record the issue and cost snapshot, update stock, fulfillment, and audit history (included stock movement).
4. Confirm the issue and resulting cost; at the extension point after stock commit, suggest replenishment when inventory position is below the reorder point.

Alternative flow: Insufficient stock permits an explicitly accepted partial quantity or leaves the remainder pending; invalid or changed assignment rejects delivery without a stock change.

Technical exception: A technical or concurrency failure rolls back all related writes and returns a retryable result where appropriate.

Postconditions: Stock, ledger, fulfillment, and attributed cost agree; one physical delivery is not duplicated by a retry.

## UC-07 Accept material returns

Actors: Warehouse clerk; technician declares the return.

Requirements: FR-16.

Preconditions: An original issue exists in the owned scenario and the order permits corrective return.

Normal flow:

1. Select the original issue.
2. Verify returned item and positive quantity against the unreturned balance.
3. Commit a compensating stock movement and original-cost reversal, then confirm.

Alternative flow: Over-return or an unsupported post-closure correction is rejected; partial returns retain the remaining returnable balance.

Technical exception: A failed commit changes neither stock nor net order cost.

Postconditions: The original issue remains intact and the accepted return is attributable.

## UC-08 Receive or adjust stock

Actors: Warehouse clerk.

Requirements: FR-06.

Preconditions: Item exists and the user can record stock movements.

Normal flow:

1. Select a receipt or justified adjustment.
2. Enter quantity, unit, and reference or reason.
3. Commit the movement and valuation changes and retrieve the new balance.

Alternative flow: A negative adjustment that would overdraw stock is rejected; a purchase receipt uses its remaining outstanding quantity.

Technical exception: Duplicate receipt keys cannot add stock twice; failed persistence rolls back the movement.

Postconditions: The stock balance and movement ledger reconcile.

## UC-09 Manage replenishment

Actors: Administrator approves; warehouse clerk receives.

Requirements: FR-08, FR-17.

Preconditions: Item demand history and replenishment settings are available.

Normal flow:

1. Calculate inventory position, reorder point, and pack-rounded suggested quantity.
2. Administrator reviews and approves the suggestion and records the purchase as Ordered.
3. Warehouse clerk records full or partial delivery.
4. Reduce outstanding quantity and add only the received quantity to on-hand stock.

Alternative flow: Reject or revise an unapproved suggestion; approved quantities prevent duplicate replenishment suggestions for the same shortfall.

Technical exception: A receipt failure leaves outstanding and on-hand quantities unchanged.

Postconditions: Purchasing history distinguishes a suggestion, commitment, order, and actual receipt.

## UC-10 Monitor equipment

Actors: Workshop manager; simulated telemetry source is a supporting actor.

Requirements: FR-09, FR-10.

Preconditions: Equipment profile, scenario time basis, and event principal are valid.

Normal flow:

1. Receive a uniquely identified timestamped power or activity event.
2. Validate its source, ownership, order, and event sequence; deduplicate retries.
3. Close the previous observed interval and update the new observation state.
4. Update durations and coverage; at the duration-update extension point create one alert if continuous observed idle reaches the configured threshold.

Alternative flow: Missing or stale data becomes unknown; out-of-order events are quarantined rather than silently rewriting finalized intervals.

Technical exception: A storage failure keeps the event unconfirmed and allows an idempotent resend.

Postconditions: Known effective, idle, powered-unknown, and unknown-power durations remain distinguishable.

## UC-11 Resolve idle alerts

Actors: Workshop manager.

Requirements: FR-10.

Preconditions: An idle episode has an open or acknowledged alert.

Normal flow:

1. Inspect the equipment state and alert evidence.
2. Acknowledge responsibility.
3. Power off the equipment or resume useful work, represented by an observed event in this simulation.
4. Resolve the alert only after the corrective observation is confirmed.

Alternative flow: Acknowledgement alone leaves the alert unresolved; stale telemetry labels the observation Unverified.

Technical exception: A failed command or missing confirmation cannot be displayed as a successful equipment action.

Postconditions: The action and resolution are attributable and the feedback loop has an observable effect.

## UC-12 Review order costs

Actors: Administrator or workshop manager.

Requirements: FR-11.

Preconditions: Order records exist and user has read permission.

Normal flow:

1. Select an order.
2. Calculate the included cost breakdown from net issues, active labor, and allocated known energy.
3. Inspect estimates, coverage, and any unallocated equipment overhead.

Alternative flow: An open order shows a provisional total; unknown energy coverage is not silently treated as zero measured consumption.

Technical exception: Unavailable source data produces an incomplete-data result instead of a fabricated total.

Postconditions: The user sees attributable components and explicit calculation assumptions.

## UC-13 Issue educational invoice

Actors: Administrator; invoice recipient is a supporting actor.

Requirements: FR-12.

Preconditions: Order is Closed and its costs and pricing assumptions are reconciled.

Normal flow:

1. Select the closed order.
2. Calculate the included cost breakdown and apply the declared educational pricing policy.
3. Persist a unique invoice header and line snapshot atomically.
4. Generate the educational invoice document for administrator delivery to its recipient.

Alternative flow: A repeated command returns the existing invoice; open orders cannot be invoiced.

Technical exception: A failed invoice transaction creates no partial invoice; document rendering may be retried from the committed snapshot.

Postconditions: The issued invoice is stable and explicitly educational, with no tax-invoicing integration claimed.

## UC-14 View indicators and reports

Actors: Administrator; workshop manager and warehouse clerk have scoped views.

Requirements: FR-13, FR-14.

Preconditions: User has reporting permission in the owned scenario.

Normal flow:

1. Choose the authorized operational view and time window.
2. Read consistent persisted records and calculate indicators.
3. Display units, time basis, observation coverage, and data refresh status.
4. Export a report when the implementation provides the verified export path.

Alternative flow: An empty period shows a valid empty result; role restrictions limit data fields and actions.

Technical exception: A connection or query failure preserves a visible stale/error state rather than presenting old data as current.

Postconditions: Totals are traceable to their records and selected period.

## UC-15 Sign in

Actors: Staff member.

Requirements: FR-15.

Preconditions: A provisioned account exists.

Normal flow:

1. Submit credentials.
2. Validate the stored credential verifier, account status, and login-attempt policy.
3. Create a protected session with a server-derived role and scenario access.

Alternative flow: Invalid credentials return a generic access error; the proposed failed-attempt threshold is configurable and must include a recovery policy.

Technical exception: An identity-store failure creates no authenticated session.

Postconditions: Authorized sessions exist only after verified authentication; role selection in a mockup is not this use case.

## UC-16 Run owned demonstration

Actors: Demonstration operator acting as a scenario owner.

Requirements: FR-18, FR-19.

Preconditions: Authenticated user owns or can create the requested demonstration scenario.

Normal flow:

1. Choose a declared seed and clock rate or load the baseline.
2. Pause or advance scenario time and produce synthetic operations through the same domain contracts.
3. Inspect outcomes or compare equivalent control-policy runs.
4. Reset or version only the owned scenario with an audit record.

Alternative flow: Cross-scenario commands and unauthorized resets are rejected; comparison runs keep demand, prices, horizon, and seed equivalent.

Technical exception: A failed reset leaves the previous scenario recoverable and does not affect another owner.

Postconditions: The scenario is reproducible, isolated, and explicitly simulated.

## UC-17 Inspect operation history

Actors: Administrator.

Requirements: FR-20.

Preconditions: User has permission to inspect the owned scenario audit trail.

Normal flow:

1. Select an operation, record reference, or time range.
2. Read attributed audit records.
3. Follow original and compensating records to explain a correction.

Alternative flow: No matching records produces an empty result; history is not edited through this view.

Technical exception: An audit query failure is reported without implying that no operations occurred.

Postconditions: The operational history remains attributable and readable without ordinary-user mutation.

## Include and extend review

Required included behavior is always performed by its base use case. Conditional extensions are inserted at the named extension points shown in UC-06 and UC-10; their arrow points toward the base. The initial diagram focuses on replenishment after an issue, although the replenishment policy must also be recalculated after other stock or purchase changes. This does not make replenishment an exclusively issue-triggered function.

Reference: [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1).
