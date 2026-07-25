# Verification matrix

| Check | Status | Evidence |
|---|---|---|
| Repository inventory | VERIFIED | 35 pre-existing migrations inspected |
| Canonical tenant decision | VERIFIED | Existing companies/company_members model reused |
| npm install baseline | VERIFIED | `npm ci --cache /tmp/bovaro-npm-cache` |
| Typecheck | VERIFIED | `npm run typecheck` |
| Lint | VERIFIED | `npm run lint` |
| Unit tests | VERIFIED | 34 files, 208 tests passed |
| Production build | VERIFIED | Next.js 16.2.7 optimized build |
| Migration execution | BLOCKED_EXTERNAL | No disposable Supabase/Postgres yet |
| Cross-company RLS | BLOCKED_EXTERNAL | Requires migrated database and auth fixtures |
| E2E lifecycle | BLOCKED_EXTERNAL | 2 request tests passed, 12 auth tests skipped; Chromium download blocked |
| Live e-sign | BLOCKED_EXTERNAL | Provider credentials unavailable |
| Live rent payments | BLOCKED_EXTERNAL | Provider not selected/configured |
