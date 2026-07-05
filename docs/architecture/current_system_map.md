# Bovaro — current system map

Updated: Batch 0 (2026-07-05). This document describes how the system works
today. It is updated at the end of every batch that changes architecture.

## Stack

- Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS 4.
- Supabase: Postgres 17, Auth, Storage, RLS. Clients via `@supabase/ssr`.
- Vitest for unit tests. GitHub Actions CI (`.github/workflows/ci.yml`).

## Auth

- Email/password via Supabase Auth (`components/auth/*`, browser client).
- `app/auth/callback/route.ts` exchanges PKCE codes and redirects to a safe
  `next` path (`getSafeNextPath` in `lib/url.ts`).
- `proxy.ts` (Next 16 replacement for middleware) refreshes the session cookie
  on every matched request. It does **not** gate routes; access control lives
  in layouts, server actions and RLS.
- Signup provisioning happens in the DB trigger
  `on_auth_user_created_bovaro_register` → `public.handle_bovaro_new_user()`:
  creates the profile, legal acceptances, and (for company accounts) the
  company + membership.
- Password reset uses Supabase Auth email (`/reset-password`).

## Roles

- Enum `public.app_role`: `seeker, buyer, landlord, broker, company_admin, admin, super_admin`.
- Stored on `profiles.role` (global role) and `company_members.role` (role
  within a company).
- Server-side helpers in `lib/auth/permissions.ts`:
  `getAuthContext`, `requireDashboardAccess`, `requireAdminAccess`,
  `requireSuperAdminAccess`, `canManageListing`, etc.
- SQL helpers (SECURITY DEFINER): `current_user_is_admin()`,
  `current_user_is_super_admin()`, `current_user_role()`,
  `current_user_company_ids()`, `current_user_can_manage_company/listing/application/inquiry(uuid)`.

## Listings

- Table `listings` with segment model (`residential, commercial, parking,
  storage, land, investment`), rent/sale (`listing_type`), status
  (`draft, published, paused, rented, sold, archived`), plus per-segment
  attribute columns. Children: `listing_images`, `listing_features`,
  `listing_documents`, `rental_requirements` (1:1).
- Public read requires `status = 'published'` (RLS). Owners = creator or
  company members; admins see all.
- Data layer: `lib/data/listings.ts` (search + filters + mapping to
  `ListingCardItem`/`ListingDetailItem` from `lib/types.ts`).
- Creation/edit through server actions in `app/dashboard/listings/actions.ts`
  with image upload to the `listing-images` bucket (`lib/storage.ts`).

## Applications (rental)

- `rental_applications` + `rental_application_co_applicants` +
  `rental_application_documents` + `rental_application_status_history`.
- Applying (`app/listing/[slug]/apply/actions.ts`) snapshots profile fields,
  queue points, co-applicants and selected documents onto the application row.
- Live status enum (legacy shape): `draft, submitted, received, reviewing,
  qualified, reserve, viewing, offered, rejected, signed`. The code currently
  uses `submitted → reviewing → offered/rejected`-style transitions loosely;
  a real status machine arrives in Batch 7.
- Landlord side: `lib/data/rental-applications.ts` (`getOwnerDashboardData`,
  `getManagedListingDetail`) and status updates via
  `updateApplicationStatusAction`.

## Queue

- `queue_memberships` (one per user) + `queue_point_ledger`.
- Points are currently synced opportunistically when the profile page renders
  (`lib/data/profile.ts`) — 1 point/day since `joined_queue_at`. Batch 4
  replaces this with an idempotent cron job and ledger-based accrual.
- Queue membership start/pause/resume in `app/dashboard/profile/actions.ts`
  (upserts a `user_subscriptions` row with `plan_code = 'queue_monthly'`,
  provider `manual`).

## Dashboard

- Route group `app/dashboard/*` guarded by `requireDashboardAccess()` in
  `app/dashboard/layout.tsx`.
- Pages: overview, profile, documents, applications, favorites,
  saved-searches, listings (owner), inquiries (owner leads), settings.
- Server actions per page directory; data layer in `lib/data/*`.

## Admin

- Route group `app/admin/*` guarded by `requireAdminAccess()`; role changes
  restricted to super_admin (`updateUserRoleAction`).
- Uses SECURITY DEFINER RPC `admin_user_overview()` for the user list.
- Audit: `admin_audit_logs` written by admin server actions.
- System page surfaces audit logs, privacy requests, rate-limit events and
  document access logs.

## Storage

- `listing-images` (public bucket): images uploaded under
  `<user_id>/listing/...`, public URLs.
- `profile-documents` (private bucket): documents under `<user_id>/...`,
  referenced as `storage:profile-documents/<path>` URIs, served through
  short-lived signed URLs by route handlers
  (`app/dashboard/documents/[id]/view/route.ts`,
  `app/dashboard/applications/documents/[id]/view/route.ts`), each access
  logged to `document_access_logs`.
- Validation in `lib/storage.ts` (MIME + size + name sanitization).

## RLS

- Every public table has RLS enabled with explicit policies; storage policies
  restrict uploads to the caller's own folder. Full policy text lives in
  `supabase/migrations/00000000000000_baseline.sql`. An RLS matrix document is
  planned for Batch 17 (`docs/security/rls_matrix.md`).

## Server actions

| File | Actions |
|------|---------|
| `app/actions/engagement.ts` | favorites add/remove, saved search save/delete/toggle notifications |
| `app/admin/actions.ts` | company verification, listing status override, role change, admin invites |
| `app/dashboard/listings/actions.ts` | create listing, application/inquiry status, listing status/details, internal notes |
| `app/dashboard/profile/actions.ts` | profile save, co-applicants, profile documents, queue membership, notification settings, password, privacy requests |
| `app/listing/[slug]/actions.ts` | submit listing inquiry |
| `app/listing/[slug]/apply/actions.ts` | submit rental application |

## Cron jobs

- None yet. Planned (Batch 4+): `/api/cron/award-queue-points`,
  saved-search matching, unread-message reminders, deadline/expiry jobs — all
  protected by `CRON_SECRET` and logged to a cron-run table (Batch 14).

## Integrations

| Integration | Status |
|-------------|--------|
| Supabase (auth/db/storage) | Live |
| Rate limiting (`check_rate_limit` RPC) | Live |
| Resend (email) | Env vars only — no code yet (Batch 14; used from Batch 5) |
| Stripe (billing) | Env vars only — no code yet (Batch 11) |
| Sentry | Env vars only (Batch 17) |
| BankID (identity) | Absent (Batch 2, provider adapter + dev mock) |
| E-sign (contracts) | Absent (Batch 10) |
| Screening (credit/income) | Absent (Batch 6) |
| Geocoding/maps | Absent (Batch 5) |
| Web push | Absent (Batch 19) |

## Database types

- Generated types: `lib/supabase/database.types.ts` (from the live schema via
  Supabase MCP / CLI). Server and browser clients are typed with `Database`.
- Regeneration:
  `npx supabase gen types typescript --project-id <project-id> --schema public > lib/supabase/database.types.ts`
- Legacy hand-written types remain in `lib/types.ts` and are being migrated
  gradually.

## Migrations

- `supabase/migrations/` is authoritative (see its README for the ordered
  index and rules). Legacy phase SQL is archived in `supabase/archive/` and
  must not be run.
