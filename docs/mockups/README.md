# Application mockups

Open [the interactive prototype](index.html) in a current browser. It uses local CSS and JavaScript and requires no external assets or CDN. It also works from a static local server. All product copy is in English, and the seven employee names retain their accents.

## Scope and limits

This is a responsive design prototype with temporary state in one browser tab. It is not the Next.js/PostgreSQL application. It has no real sign-in, database, server transactions, telemetry adapter, visitor isolation, backup, or deployment. Reloading starts over. The role selector previews a proposed employee view; it is not authentication or authorization evidence.

The prototype demonstrates a useful subset of the designed flows: requests and full-quantity issues, order/intervention guards, replenishment approval and full receipt, simulated equipment activity and idle alerts, cost calculation, report filtering and CSV export, and a temporary educational invoice after closure. Partial delivery, material returns, manual adjustments, customer/vehicle creation, assignment editing, arbitrary new interventions, partial purchase receipts, a login screen, and production error recovery remain specified rather than interactive.

## Proposed screens

| Screen | What to inspect | Roles previewed |
| --- | --- | --- |
| Overview | Open work, material signals, unresolved alerts, and equipment use | Administrator, manager, warehouse clerk with scoped data |
| Service orders | Assignment, lifecycle, running segments, pause/finish, hold/review/close guards | Administrator reads; manager controls order; assigned technician records own intervention |
| Warehouse | Request creation, recipient/order link, delivery result, stock, and retained issue costs | Technician sees own requests; clerk fulfills; administrator reads |
| Purchasing | Reorder inputs, inventory position, suggestion, approval, ordering, receipt | Administrator approves/orders; clerk receives |
| Equipment | Working versus idle, coverage, known energy, alert acknowledgement and action | Administrator reads; manager records simulated actions |
| Costs and invoices | Component totals, provisional/closed distinction, educational invoice | Manager reads; administrator issues after closure |
| Reports and history | Order filter, role-scoped CSV, attributable operation history | Operational report readers; full history for administrator |

## Reproducible walkthrough

1. Start as Tamara on Overview. The clock is 10:10, the compressor has 60 working minutes and 10 observed idle minutes, and oil filters have 4 units on hand. SO-1042 has materials COP 350,000, labor COP 70,000, and known estimated energy COP 4,680: total COP 424,680.
2. Select Juanita, open Warehouse, and issue the 2 units on REQ-208. Filters become 2 units; SO-1042 material cost becomes COP 520,000. Pending request status becomes Fulfilled. The same delivery cannot be repeated.
3. Select Tamara, open Purchasing, approve the suggested 10 filters, then record the purchase order. Stock stays at 2; the approved/ordered incoming quantity covers the shortfall. Select Juanita and receive the delivery. Stock becomes 12 and the receipt cannot repeat.
4. Select Juan Jacobo, open Equipment, and advance time once. At 10:15, continuous observed idle reaches 15 minutes and one alert opens. Repeated time advances in the same episode do not duplicate it.
5. Acknowledge the alert. Its status becomes Acknowledged while the compressor remains Idle. Power off or resume useful work to resolve it. This is the observable corrective action completing the balancing loop.
6. Use Reset scenario for an independent invalid-stock example. Select Nicolás and request 9 filters for SO-1042. Submitting changes no stock. Select Juanita and attempt to issue 9. It is rejected; stock stays at 4 and material cost stays COP 350,000.
7. For lifecycle guards, start from a reset. As Juan Jacobo, try to put SO-1042 on hold while Nicolás is running and the compressor is powered. It is rejected. As Nicolás pause the intervention; as Juan Jacobo power off the compressor, then place the order on hold. A technician cannot resume work until the manager resumes the order.
8. To close the order, settle its pending request, finish its intervention, and power off its equipment. The manager may request review and then close. Tamara may then issue the educational invoice. These guard messages illustrate intended server rules, not implemented server protection.
9. For incomplete telemetry, mark the compressor stale, advance time, and inspect the explicit unknown interval and coverage. Unknown energy is not silently counted as measured zero. A known sample restores current observation without rewriting the gap.
10. In Reports, filter a single order and export its CSV. A warehouse clerk export excludes labor and energy columns. Only the administrator preview contains the full operation history.

## Visual review targets

Inspect 1440 × 1000 desktop, 768 × 1024 tablet, and 390 × 844 phone layouts. Navigation becomes a horizontally scrollable row on small screens; wide data tables scroll within their own containers. Primary actions remain labeled, keyboard focus remains visible, and the material request form uses native validation and a modal dialog.

This prototype uses seeded figures to make review reproducible. It does not prove real savings, usability percentages, load targets, or long-term reliability.
