# Next exact actions

1. Run `npm ci --cache /tmp/bovaro-npm-cache`.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
3. Fix every deterministic code failure.
4. Apply all migrations to a disposable Supabase/PostgreSQL database.
5. Run cross-company RLS tests for every new tenant-owned table.
6. Seed and run the complete Playwright lifecycle.
7. Configure chosen production providers and perform webhook contract tests.

