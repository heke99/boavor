# Bovaro canonical lifecycle delivery — 2026-07-25

## Outcome

This delivery extends the existing Bovaro platform; it does not replace its
marketplace, applicant, landlord or admin foundations. `companies` remains the
canonical tenant root.

Implemented:

- atomic company-scoped numbers,
- fine-grained tenant permissions,
- application completion requests,
- transactional domain events/outbox with retry and dead-letter handling,
- document records, immutable versions and SHA-256 integrity,
- private canonical contract PDFs,
- provider-neutral signing sessions and idempotent verified callbacks,
- contract-to-tenancy provisioning,
- occupancies and move-in cases,
- tenant portal,
- rent schedules, invoices, payments, allocations and deposits in integer öre,
- maintenance cases and work orders,
- termination, inspection and move-out models,
- landlord lifecycle dashboard,
- tenant-scoped support extensions,
- cross-company rollback-only SQL regression suite,
- persistent project memory and continuous execution rules.

## Verification performed

| Command | Result |
|---|---|
| `npm ci --cache /tmp/bovaro-npm-cache` | passed |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm test` | 34 files / 208 tests passed |
| `npm run build` | passed |
| `npm run test:e2e` | partial: 2 passed, 12 skipped; browser launch blocked |

The E2E server is now bound to `127.0.0.1`. Chromium was unavailable, and its
download was blocked/truncated by the execution network. No browser test is
reported as passed.

## Production database verification

Apply migrations to a disposable/preview Supabase environment first, then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_checks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/canonical_lifecycle_rls.sql
```

Configure a live e-sign and rent-payment provider only after local schema/RLS
passes. The development signing provider remains explicitly non-production.

