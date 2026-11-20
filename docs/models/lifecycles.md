# Lifecycle and policy decisions

## Service orders

| State | Meaning | Permitted next state and trigger |
| --- | --- | --- |
| Draft | Customer and vehicle details are being prepared. | Open on submit with valid references; Cancelled if no fulfilled work exists. |
| Open | Accepted and available for planning. | In progress when an assigned technician starts an intervention; Cancelled only if there are no net material issues and no started work. |
| In progress | Work has started. | On hold after all running interventions and exclusive equipment sessions stop; Ready for review once work and requests are settled. |
| On hold | Work is deliberately suspended with a reason. | In progress on an authorized resume with an available assigned technician. |
| Ready for review | All interventions are complete, requests are fulfilled or cancelled, and exclusive equipment sessions have stopped. | Closed after manager review and cost reconciliation; In progress with an attributable reason if more work is needed. |
| Closed | Completed operating record with reconciled costs. | No ordinary lifecycle transition. Invoice generation is a separate operation. |
| Cancelled | Withdrawn before fulfilled work. | No ordinary lifecycle transition. |

Assigning a technician does not automatically start work. Starting the first intervention changes Open to In progress in the same operation. An intervention may start only for an Open or In progress order, with a valid assignment and a technician who has no other running intervention. Resuming an order alone does not start a technician's timer.

Material issues are permitted only in Open or In progress. On hold, Ready for review, Closed, and Cancelled reject new issues. Returns against an original issue remain a controlled corrective operation, not permission to issue new material. Post-closure corrections require an attributable adjustment or credit workflow; the initial application will reject them until that workflow is implemented.

There is no arbitrary reopen of a closed order. Additional work creates a linked follow-up order. Cancellation after resources have been consumed is deferred until a complete reversal policy exists; it must not erase history.

## Interventions and labor time

Planned becomes Running on a valid start. Running may become Paused or Completed. Paused may resume as Running or finish as Completed. Completed is terminal.

Duration is the sum of closed running segments plus the elapsed open segment when currently Running. Paused time does not add labor cost. Completion records the outcome and closes any running segment. A technician can have several planned assignments but at most one running intervention. These rules require transactional protection against simultaneous start requests.

## Equipment observations

| State | Power knowledge | Activity knowledge | Duration accounting |
| --- | --- | --- | --- |
| Off | Observed off | Not applicable | Known off time; zero modeled consumption. |
| Powered unknown activity | Observed on | Unknown or stale | Known powered time with unclassified activity. |
| Working | Observed on | Useful work observed | Effective time. |
| Idle | Observed on | No useful work observed | Observed powered idle time. |
| Unknown power | Stale or absent | Insufficient | Unobserved-power interval; no invented energy estimate. |

For any observation window:

`window = known off + known working + known idle + known powered with unknown activity + unknown power`

`known powered time = known working + known idle + known powered with unknown activity`

Only for complete activity coverage does powered time equal effective time plus idle time. Report coverage and unknown intervals with utilization and energy estimates. Energy for unknown intervals is unknown, not zero.

Unique event IDs are deduplicated. Event timestamps use simulation time in a simulated scenario and real event time in a real adapter; mixing the two within an interval is rejected. Out-of-order events must be quarantined for reconciliation rather than silently rewriting a finalized interval. A new complete observation may restore knowledge, but it does not retroactively fill a telemetry gap.

The proposed idle threshold is **at least 15 continuous simulated minutes** of observed Idle. This explicitly resolves the earlier wording around "more than 15 minutes" for the design baseline. The value remains configurable and is not instructor-validated. Unknown activity or unknown power interrupts the continuous-idle interval.

An alert has Open, Acknowledged, and Resolved statuses. Acknowledgement records responsibility but does not change equipment state. Known return to useful work or power-off resolves the episode; a telemetry gap leaves it unresolved with an "Unverified" observation label. A resumed idle interval after a gap is a new observed episode, not a continuation of a measured gap. Repeated ticks in one episode cannot create duplicate alerts.

## Reorder and purchasing policy

Initial design assumptions:

- Average daily demand uses the last 30 completed scenario days; use seeded demand history when the demonstration starts. Never treat the first few accelerated minutes as 30 days of demand.
- Demand counts net consumption in each item's declared unit. Lead time is in scenario days; safety stock is an explicit quantity.
- No stock reservation is implemented in the initial design. A request is not a reservation.
- `inventory position = available stock + outstanding approved or ordered purchase quantity`.
- `reorder point = average daily demand * lead time + safety stock`.
- Trigger a suggestion when inventory position is strictly below the reorder point.
- `target stock = average daily demand * (lead time + review period) + safety stock`; proposed review period is seven scenario days.
- `suggested quantity = max(0, target stock - inventory position)`, rounded up to the item's purchase pack size.
- Keep at most one active unapproved suggestion per item and scenario. Recalculate it after material changes. Unapproved suggestions do not count as incoming stock.

Purchases progress from Proposed to Approved to Ordered, then Partially received or Received. Only an actual receipt changes on-hand stock. An idempotency key prevents receiving the same delivery twice. Recompute remaining outstanding quantity after partial receipts. Suppliers are modeled as business context; the clerk records the supplier's delivery, with no external supplier API.

## Valuation and cost assumptions

Use weighted-average inventory valuation for new receipts in the first implementation. Each issue snapshots the then-current unit cost. A return references its original issue and reverses its original cost; receiving or price changes cannot rewrite past issues. Define precision and rounding at the database boundary before implementation.

An order's operating cost is net materials plus recorded labor plus allocated estimated energy. The mockup uses COP, integer amounts, cost-based educational invoice pricing, and no modeled tax or markup. These are demonstration assumptions, not a production accounting policy.

Exclusive equipment sessions may link to one order. Shared equipment can allocate cost across explicit usage intervals; the sum of allocated fractions cannot exceed 100% of a session. Any residual cost is workshop overhead. Show unallocated cost rather than charging it to every concurrent order. Closed-order snapshots are stable; late events require a reviewed correction rather than silent mutation.

## Demonstration ownership and resets

Every scenario owns its operational records, telemetry, reports, and clock. A reset replaces or versions only the caller's owned scenario and records an audit event. Resetting one scenario never deletes another visitor's or the presenter's work. All permission and ownership checks belong on the server in the future application. The browser-only mockup illustrates role views and holds temporary state; it provides no authentication or security boundary.
