# Application

`use-cases` orchestrates authentication, workshop operations and authorized report records. `ports` declares the persistence and security capabilities these use cases need. Concrete implementations are injected by `bootstrap`; application code does not import adapters or runtime configuration.
