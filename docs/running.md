# Running Mechanical Workshop

## Verified local path

Node.js 24.19.0, npm 11.17.0 and PostgreSQL 18.6 on Windows were used for the local verification. Dependencies are locked in `package-lock.json`. Use Node 24 and PostgreSQL 18 for the closest reproduction.

From the repository root:

```sh
npm ci
npm run db:local
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

Visit **http://127.0.0.1:3070**. Choose **Create an isolated demo workspace**, supply a name and a password of at least 12 characters, and keep the generated workspace code. Tamara signs in automatically. Use **Switch account**, choose an employee, and enter that workspace's chosen password to demonstrate another role. This performs a real server sign-in and revokes the old session.

The seven staff accounts share a workspace owner's chosen demonstration password intentionally for role play. Each account has a separately salted hash and its own role, lockout and sessions. This is an academic demonstration provisioner, not a staff account administration product. Do not reuse a personal or production password. Anyone given the workspace password can sign in as its administrator; create separate workspaces for separate visitors.

`db:local` manages only `.local/postgres`, bound to `127.0.0.1:55432`. It generates ignored `.env.local` with random database and seeded-demo credentials. It never modifies an existing external cluster. Windows defaults to `C:/Program Files/PostgreSQL/18/bin`; override `PG_BIN` if necessary. On Linux/macOS put the PostgreSQL binaries on PATH or set `PG_BIN`. PostgreSQL must already be installed. When using an execution environment that kills child processes at command exit, keep the shell that starts PostgreSQL alive; an ordinary terminal does not normally need this workaround. Stop the project cluster with `npm run db:stop`.

The seeded `workshop-demo` space uses `DEMO_PASSWORD` from your private `.env.local`. Prefer a new private demonstration for presentation practice; automated integration tests create their own spaces and do not mutate the seeded one. Never commit `.env.local`, backups, database data or exported customer information.

For an externally managed database, copy `.env.example` to `.env.local`, supply your own connection details, and run migration and seed commands. Skip `db:local`. Seed is idempotent and will not silently change existing passwords. `npm run dev` provides development mode; the verified final path uses a production build.

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
