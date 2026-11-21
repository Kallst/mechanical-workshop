# Running Mechanical Workshop

## Verified local path

Node.js 24.19.0, npm 11.17.0 and PostgreSQL 18.6 on Windows were used for the local verification. Dependencies are locked in `package-lock.json`. Use Node 24 and PostgreSQL 18 for the closest reproduction.

From the repository root:

```sh
npm start
```

The single command installs locked dependencies on first use or lockfile changes, prepares PostgreSQL, applies migrations, seeds without resetting existing data, and compiles when build inputs change. First use needs Internet for npm packages; later starts reuse dependencies and the production build. Node 24 and PostgreSQL 18 must already be installed.

Keep the terminal open. The launcher runs an owned PostgreSQL child directly and stops that child when you press Ctrl+C. It never stops an already-running or externally managed database. If its owned database exits unexpectedly, it stops the web server instead of leaving a broken registration page.

Visit the **Workshop URL printed by the launcher** (normally http://127.0.0.1:3070). Choose **Create an isolated demo workspace**, supply a name and a password of at least 12 characters, and keep the generated workspace code. Tamara signs in automatically. Use **Switch account**, choose an employee, and enter that workspace's chosen password to demonstrate another role. This performs a real server sign-in and revokes the old session.

The seven staff accounts share a workspace owner's chosen demonstration password intentionally for role play. Each account has a separately salted hash and its own role, lockout and sessions. This is an academic demonstration provisioner, not a staff account administration product. Do not reuse a personal or production password. Anyone given the workspace password can sign in as its administrator; create separate workspaces for separate visitors.

A fresh clone creates ignored `.env.local` with random credentials and available loopback ports, starting the search at 3070 for HTTP and 55432 for PostgreSQL. The local database remains in `.local/postgres`; subsequent starts use the saved `DATABASE_URL` and `APP_ORIGIN`, including custom ports such as 55433 and 3071. There is no need to repeat a PowerShell port variable. A conflicting explicit `WORKSHOP_PG_PORT` or `PORT` is rejected rather than silently changing credentials or origins. Existing configuration is never overwritten. UTF-8 files written with a Windows PowerShell BOM are accepted.

An occupied database port is reused only after authentication and comparison of the server system identifier with pg_controldata for this clone. This handles Windows installations in accented paths even when pg_ctl status misidentifies the running server.

If a saved port is occupied by a different process, the launcher stops with a specific explanation; it does not terminate that process or attach this clone to an unrelated cluster. Use the existing application's terminal or deliberately change this clone's configuration. A second launcher in the same clone is rejected before installation/build/database work. Do not remove `.local` or `.env.local` to resolve an error.

Windows defaults to `C:/Program Files/PostgreSQL/18/bin`; override `PG_BIN` if installed elsewhere. On Linux/macOS put the PostgreSQL binaries on PATH or set `PG_BIN`. These tools must already be installed. The launcher does not install system software or require Docker. `npm run db:local` and `npm run db:stop` remain advanced helpers for the project-owned cluster; normal use needs only `npm start`.

The seeded `workshop-demo` space uses `DEMO_PASSWORD` from your private `.env.local`. Prefer a new private demonstration for presentation practice; automated integration tests create their own spaces and do not mutate the seeded one. Never commit `.env.local`, backups, database data or exported customer information.

For an externally managed database, copy `.env.example` to `.env.local`, supply your own connection details, and run migration and seed commands. `npm start` recognizes an external database and applies migration/seed without starting or stopping that database. Supply `DEMO_PASSWORD` and a local HTTP `APP_ORIGIN` when using the local launcher. For production hosting, use the explicit migration/seed/build sequence and `npm run start:server` (or the container command) with your process supervisor. Seed is idempotent and will not silently change existing passwords. `npm run dev` provides development mode; the verified final path uses a production build.

## Demonstration sequence

The baseline starts paused at Nov 20, 2026, 10:10 America/Bogota. One scenario minute is one modeled minute; no actual workshop telemetry is connected.

1. As Nicolás, inspect assigned SO-1042 and request materials in Warehouse. Requests alone do not reserve stock.
2. As Juanita, deliver part of a request, inspect the stock ledger, and deliver its remainder. Try exceeding the available stock to observe a server rejection.
3. As Tamara, inspect Purchasing, approve a suggestion and order it. As Juanita, receive a partial delivery with a unique delivery reference.
4. As Tamara, advance five minutes. As Juan Jacobo, acknowledge the compressor idle alert and record Off. Acknowledgement alone does not stop energy consumption.
5. As Nicolás, pause/resume and finish an intervention with an outcome. As Juan Jacobo, review and close an order after all work, requests and equipment associations are settled.
6. As Tamara, issue and print its educational invoice; export period reports. Closed cost snapshots remain stable as time advances.
7. On a fresh baseline, **Simulation → Run guided scenario** executes the documented sequence atomically with explicit synthetic delegation. SO-1042 closes at COP 599,770. No human sign-in is fabricated in audit history. **Reset to baseline** affects only this workspace and retains audit history.

For a predictable guided run, reset first; manual changes can create additional pending work that must be settled. The policy comparison is a separate deterministic analytical experiment using seed 42 and 30 synthetic jobs, with its assumptions shown in the UI. It is not evidence of actual savings.

## Verification

```sh
npm run typecheck
npm test
npm run test:startup
npm run check:design
npm run test:integration
npm run backup -- --verify
```

Integration tests require a running production app and database. They test real HTTP cookies, server roles, tenancy, database persistence, replay handling, concurrent stock withdrawals, rollback, audit constraints, lockout, invoice immutability and logout. The restore exercise creates and drops a randomly named disposable database; the configured database is never overwritten. It requires a PostgreSQL account with database-creation permission. Pause the demo during count comparison. Backups contain authentication and operational data and are ignored by Git.

Schedule `npm run backup` in your deployment's scheduler if operating continuously. No 24-hour backup job or four-hour production recovery SLA is claimed by this repository. Store encrypted copies outside the application host and validate recovery against your deployment before using real data.

## Containers and shared access

`Dockerfile` and `compose.yaml` describe an alternative deployment, not the locally verified path. Set `POSTGRES_PASSWORD` to a URL-safe generated secret and `DEMO_PASSWORD` to a separate strong demonstration password, then run `docker compose up --build`. The app migrates and seeds after the database health check. Persistent data lives in the named volume. Do not delete that volume to update the application.

For other devices, deploy behind HTTPS, set `APP_ORIGIN` to the exact public origin and `COOKIE_SECURE=true`, and keep PostgreSQL private. The default local command binds only to loopback and is accessible on this computer. No public deployment has been performed. Sign-up is bounded by `MAX_DEMO_WORKSPACES`; disable it with `ALLOW_DEMO_SIGNUP=false` for a provisioned demonstration. Infrastructure TLS, encrypted storage, resource controls, routine backup scheduling and retention require deployment verification.

The CI workflow uses the official [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) actions, Node 24 and a disposable PostgreSQL 18 service. Local success and a remotely completed workflow are separate evidence.

## Visual interface and language

The application opens in Spanish. Choose ES / EN on the login screen or header to change all application copy; the browser remembers the selection. User-written names and service descriptions remain as entered. The printed educational invoice and CSV report opened from the interface follow the selection. API consumers can request `lang=es`; English is the default for existing CSV consumers.

Start at Workshop / Overview. Select a vehicle in the illustrative isometric floor, then View order for assignments and interventions. The floor is a visual index of up to three orders, including historical work; it does not measure physical bay occupancy. Warehouse contains requests, issues, returns and stock. Purchasing covers approval, ordering and actual receipt. Results contains costs, invoices and reports. The role controls available actions. Expand histories for detailed records.

For a new private demonstration, create the workshop using a password of at least 12 characters. Keep its displayed workspace code. All seven fictional employee accounts use that password; select the employee account when signing in or switching accounts. No global shared worker password is published.
