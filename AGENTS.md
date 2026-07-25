# Bovaro execution contract

Read `.agent-memory/README.md`, `current-state.md`, `execution-plan.md`,
`known-failures.md` and `next-actions.md` before changing the repository.

Current code and schema outrank documentation. `companies` is the canonical
tenant root. Do not create parallel company, person, application, contract,
invoice or maintenance models. Tenant-owned data requires `company_id`, RLS,
server authorization, audit/event emission and cross-company verification.

Analysis and memory updates are checkpoints. Continue to the next incomplete
acceptance criterion after each verified change. Never report a command as
passing unless it was run in the current checkout.

