# Adapters

- `inbound/web`: React components and browser language behavior.
- `inbound/http`: session/origin policies and CSV/error presentation.
- `outbound/persistence/postgres`: repositories, locked transaction units, audit writes and the shared pool.
- `outbound/security`: cryptographic password/token/identifier implementation.

Adapters depend on the application contracts. Business policy stays in the inner layers.
