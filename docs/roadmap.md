# Delivery roadmap

Implementation proceeds in reviewable increments. Each increment contributes academic evidence and executable behavior where applicable. This roadmap is a plan, not a fabricated development history.

Completed design work is available in the [model atlas](models/index.html), [specifications](models/README.md), and [browser-only prototype](mockups/index.html). The subsequent application increment implements the server-backed capabilities listed below; see [verification and limitations](implementation.md). Release history and the Spanish academic presentation are separate deliverables. [Verification evidence](models/verification.md) distinguishes design checks from future application tests.

| Increment | Work | Completion evidence |
| --- | --- | --- |
| Repository foundation | English policy, scope, requirements, domain rules, architecture direction, GitFlow, templates | Reviewed documents and first feature pull request into develop |
| System modeling | Context, DFDs, causal review, states, activities, use cases, mockups | Rendered models with consistent boundaries and traceable rules |
| Application foundation | Verified dependency versions, Next.js scaffold, PostgreSQL schema and migrations, identity, permissions, synthetic seed | Clean startup, seven named employees, permission checks |
| Workshop operations | Customers, vehicles, orders, assignments, intervention lifecycle | End-to-end order workflow and invalid transition tests |
| Inventory and purchasing | Requests, issues, returns, receipts, adjustments, reorder policy, purchase workflow | Reconciled stock and cost with rollback and concurrency checks |
| Equipment monitoring | Power and activity events, deduplication, sessions, idle detection, alerts | Correct effective and idle durations and an actionable alert |
| Costs and invoices | Material snapshots, labor rates, energy estimates, allocation, educational invoices | Reconciled totals and stable invoice history |
| Dashboards and reports | Automatic updates, period filters, role views, exports | Values agree with persisted operations and displayed time boundaries |
| Demonstration simulation | Accelerated clock, repeatable events, controlled restarts, isolated sessions, comparative scenarios | Repeatable outcomes and cross-session access rejection |
| Release and presentation evidence | Integration checks, startup instructions, release branch and tag, optional hosting, Spanish presentation | Verified stable application and a clear separation between simulated and real-world results |

## Definition of an executable increment

An executable increment includes its relevant domain model, server rules, user interface, persistence, meaningful checks, and updated documentation. A screen with static counters does not complete an operational requirement.

## Demonstration sequence

1. Explain the current workshop problem, system boundary, subsystems, and input-process-output model.
2. Trace one requirement through an issue, a diagram, a change, and a verification result.
3. Operate one service order across technician, warehouse clerk, and workshop manager roles.
4. Show the material ledger, inventory change, order cost, and replenishment suggestion.
5. Run accelerated equipment events and explain power versus effective use.
6. Respond to an idle alert and show the corrective action completing the feedback loop.
7. Close the order and inspect the invoice and indicators.
8. Attempt invalid actions to demonstrate invariant enforcement.
9. Compare equivalent simulated scenarios and explain assumptions and limitations.
10. Show the real branch, pull request, validation, and release history.

The presentation has no imposed time limit. Keep these sections independently navigable so deeper technical explanations remain optional during the live session.
