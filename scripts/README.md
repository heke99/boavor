# Scripts

## seed-e2e.mjs

Seeds dedicated Playwright test accounts (seeker, landlord, super admin) and a
published test listing. Idempotent — safe to re-run; existing accounts get
their password reset to `E2E_SEED_PASSWORD`.

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...   # never commit
export E2E_SEED_PASSWORD=...           # min 8 chars

node scripts/seed-e2e.mjs
```

Then run the authenticated E2E projects:

```bash
export E2E_SEEKER_EMAIL=e2e-seeker@bovaro.test     E2E_SEEKER_PASSWORD=$E2E_SEED_PASSWORD
export E2E_LANDLORD_EMAIL=e2e-landlord@bovaro.test E2E_LANDLORD_PASSWORD=$E2E_SEED_PASSWORD
export E2E_ADMIN_EMAIL=e2e-admin@bovaro.test       E2E_ADMIN_PASSWORD=$E2E_SEED_PASSWORD

npm run test:e2e
```

Without these variables `npm run test:e2e` still runs the public smoke and
auth-guard suites (no credentials needed) and skips the journeys.

**Never run the seed script against production.**
