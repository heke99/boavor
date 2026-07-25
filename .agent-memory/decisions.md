# Active decisions

1. `companies` is canonical tenant; no `tenants` organization table.
2. `tenancies` means a resident-contract relationship, not an organization.
3. Rent ledger and Bovaro SaaS billing are separate bounded contexts.
4. Money is integer öre.
5. Signed documents require immutable bytes + SHA-256.
6. Domain state and outbox event share a database transaction.
7. External credentials block only live transport verification.

