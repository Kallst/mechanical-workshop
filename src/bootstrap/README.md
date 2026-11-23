# Bootstrap

`services.ts` connects application factories to concrete repositories and security implementations. It reads deployment settings and is the only production module that selects the workshop's adapter implementations.
