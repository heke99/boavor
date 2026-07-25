# Known failures

## 2026-07-25 baseline install

The first `npm ci` failed because npm attempted to create `/root/.npm`.
The isolated retry `npm ci --cache /tmp/bovaro-npm-cache` passed.

## 2026-07-25 Playwright

The E2E server initially failed while enumerating network interfaces. Binding
the test server to `127.0.0.1` fixed that environment issue. Playwright then
ran: two request-only tests passed and twelve credential-dependent tests
skipped. Browser tests could not launch because Chromium was absent. A browser
install was attempted with a writable path, but the restricted download
returned a zero-byte/truncated archive. This is `BLOCKED_EXTERNAL`, not a
passing E2E run.

## External verification

Live Supabase migration/RLS, browser E2E, production e-sign and payment-provider transport
require external environments/credentials. Mark only those checks
`BLOCKED_EXTERNAL`; local tests/build must still run.
