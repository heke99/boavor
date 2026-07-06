# Bovaro readiness audit (Batch 0)

Date: 2026-07-05
Scope: full repo + live Supabase project (`jpvnkxchsyqtkxseelea`, eu-north-1).

## 1. Current features (working)

### Public
- `/` homepage with hero search, stats, area grid, featured listings (Supabase-backed).
- `/rent`, `/buy`, `/listings` list pages with filters, sorting, pagination-by-limit.
- `/listing/[slug]` detail with images, features, rental requirements, inquiry form, JSON-LD, related listings.
- `/listing/[slug]/apply` rental application flow (profile snapshot, co-applicants, documents, queue point snapshot).
- `/login`, `/register` (private/company), `/reset-password`, `/auth/callback`.
- Legal pages: `/terms`, `/privacy`, `/cookies`, `/advertiser-terms`, `/queue-terms`. `/support` is a placeholder.
- `/sitemap.xml`, `/robots.txt`, `/api/health`, `/api/readiness`.

### Dashboard (signed-in)
- Overview with profile score, applications, owner stats.
- Profile (personal info, co-applicants, queue membership), documents (upload to Storage with signed URL views + access logs), applications, favorites, saved searches (stored, no delivery), own listings (create/edit/status/notes), inquiries inbox, settings (notifications, password, GDPR privacy requests).

### Admin
- Overview, users (role changes by super_admin, invites), companies (verification workflow), listings (status override), applications (read-only), inquiries (read-only), system (audit logs, privacy requests, rate limits, document access logs).

### Platform
- Roles: `seeker, buyer, landlord, broker, company_admin, admin, super_admin` on `profiles.role` + `company_members.role`.
- Server-side access control: `requireDashboardAccess`, `requireAdminAccess`, `requireSuperAdminAccess` in layouts and actions; RLS on all 33 tables.
- Rate limiting via `check_rate_limit()` SECURITY DEFINER RPC (inquiries, applications, uploads).
- Storage: `listing-images` (public, 10 MB), `profile-documents` (private, 15 MB, signed URLs).

## 2. Missing features (per product roadmap)

- Identity verification (BankID) — only a plaintext `personal_identity_number` column on profiles today (risk, see below).
- Queue engine: points exist but are synced ad hoc on profile page render, not via a scheduled job; no application limits; no reset rules.
- Messaging, viewings (legacy `viewings` table exists but is unused by code), offers, contracts/e-sign.
- Policy engine / applicant match scoring.
- Landlord workspace (`/landlord`), properties/buildings/units model, team roles beyond `company_admin`.
- Billing: Stripe env vars exist, no code. `user_subscriptions.provider = 'manual'`.
- Email: Resend env vars exist, no code. Saved-search notifications never send.
- Cron jobs: none. No `CRON_SECRET` usage.
- Notification center UI, preferences.
- Analytics/events, campaigns.
- Bovaro Byta (exchange), external queue tracker, white-label portals, public API, webhooks, migration/import center, support desk, sales CRM, ops dashboard, PWA/push.
- E2E tests (no Playwright), integration tests.

## 3. Technical risks

- `rental_applications` carries two applicant columns (`applicant_user_id` legacy + `user_id`), and a legacy status enum (`draft, submitted, received, reviewing, qualified, reserve, viewing, offered, rejected, signed`) that differs from the archived phase10 enum. Status machine work (Batch 7) must treat legacy values as deprecated aliases.
- Hand-written DB types in `lib/types.ts` with inline casts. Generated types added in Batch 0 (`lib/supabase/database.types.ts`) but the data layer still uses its own row types; migrate call sites gradually.
- `npm run build` static generation could hang when the sitemap queried the DB without a timeout (fixed in Batch 0 with env guard + 10 s timeout).
- Server actions mostly `return` silently on error — no structured error results (`lib/action-result.ts` exists but is unused). To be adopted from Batch 1.
- Cookie handling: server components cannot write cookies; `proxy.ts` refreshes sessions. Any new route group must stay inside the proxy matcher.

## 4. Migration risks

- The live DB was built from `archive/schema 1.sql` + phase files applied in a different order than the old README documented; `rental_application_status_history` never existed live despite being defined in `phase10_12_13.sql` (created in Batch 0).
- No tracked migration history existed before Batch 0 (`supabase_migrations.schema_migrations` was empty). Baseline recorded + stabilization applied on 2026-07-05.
- Legacy phase files are not idempotent; running them again would fail or drift. They are archived under `supabase/archive/` and must never be run.
- Enum changes in Postgres are additive-only in practice; plan status-machine work accordingly.

## 5. Security risks

- **Plaintext personal identity number**: `profiles.personal_identity_number` stores personnummer in clear text, written by the signup trigger from user metadata. Must be replaced by hash + provider verification in Batch 2 and backfilled/nulled.
- Legacy duplicate RLS policies (fixed in Batch 0): overlapping permissive policies on `listings`, `listing_images`, `listing_features`, `rental_requirements`, `listing_inquiries`, `listing_activity_events`; over-permissive `WITH CHECK (true)` insert policy on `listing_inquiries`.
- Two signup triggers fired per registration (fixed in Batch 0 — only `handle_bovaro_new_user` remains).
- `sale_leads` has `WITH CHECK (true)` public insert (kept: intentional public lead form, rate-limited in the action) — revisit with anti-spam in Batch 17.
- No security headers were set despite the README claiming them (fixed in Batch 0: X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP report-only).
- `rate_limit_events` fails open when the RPC errors (documented behavior; acceptable for now).
- No Sentry; errors only in server logs.
- Admin can read all profile documents via RLS (`current_user_is_admin()` in `profile_documents` policy) without a support-mode reason — tightened in Batch 16.

## 6. Duplicated/unused files removed in Batch 0

- `app/listing/apply/actions.ts` (byte-duplicate of `app/listing/[slug]/apply/actions.ts`; page kept as redirect).
- `lib/auth/dashboardAccess.ts` (unused re-export barrel).
- `lib/navigation.ts` (unused; nav hardcoded in Header/Footer, reworked in Batch 1).
- `lib/search.ts` (unused thin re-export).
- `lib/mock-data.ts` (deprecated empty export).
- `components/dashboard/SavedSearchCard.tsx` (never imported).
- `.DS_Store` files (now gitignored).
- `lib/action-result.ts` kept — will be adopted by server actions.

## 7. Storage buckets (live)

| Bucket | Public | Limit | MIME types |
|--------|--------|-------|------------|
| `listing-images` | yes | 10 MB | jpeg, png, webp, gif |
| `profile-documents` | no | 15 MB | pdf, jpeg, png, webp, doc, docx |

## 8. Roles and permissions (current)

- `app_role`: `seeker, buyer, landlord, broker, company_admin, admin, super_admin`.
- Helper functions: `current_user_is_admin`, `current_user_is_super_admin`, `current_user_role`, `current_user_company_ids`, `current_user_can_manage_company/listing/application/inquiry` (all SECURITY DEFINER).
- Server-side checks in `lib/auth/permissions.ts`, layouts and server actions; RLS as the final gate.

## 9. Exact commands run (Batch 0)

```bash
npm ci          # clean install, OK
npm run lint    # see batch report
npm test        # see batch report
npm run build   # see batch report
```

Database (via Supabase MCP against project `jpvnkxchsyqtkxseelea`):

- Recorded migration marker `baseline` (schema pre-existed).
- Applied migration `batch0_stabilization` (see `supabase/migrations/20260705220000_batch0_stabilization.sql`).
- Generated `lib/supabase/database.types.ts`.

## 10. Known failing checks

- None at the end of Batch 0 (lint, tests, full build pass — see batch report).
