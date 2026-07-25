# Database and migrations

Baseline plus historical batch migrations existed before this delivery.
`20260725010000_bovaro_canonical_lifecycle.sql` adds the canonical lifecycle:
number sequences, permissions, completions, documents, signing sessions,
tenancies, moves, rent ledger, maintenance, terminations and transactional
outbox. It is additive and preserves established table identities.

Apply migrations in filename order. Never edit an already-applied migration in
production; follow-up corrections require a later migration.

