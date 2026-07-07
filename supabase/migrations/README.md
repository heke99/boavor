# Bovaro database migrations

This directory is the single source of truth for the Bovaro database schema.
The legacy phase SQL files that previously lived in `supabase/` have been
consolidated and moved to [`supabase/archive/`](../archive/README.md). Do not
run archived files against any environment.

## Migration index (ordered)

| # | File | Purpose |
|---|------|---------|
| 1 | `00000000000000_baseline.sql` | Consolidated baseline: all enums, 33 tables, functions, triggers, RLS policies, storage buckets, seed data. Idempotent; bootstraps a fresh environment. Recorded on the live project as marker `baseline` (schema pre-existed from legacy phase files). |
| 2 | `20260705220000_batch0_stabilization.sql` | Brings a pre-baseline live database in line with the baseline: creates `rental_application_status_history`, removes the duplicate auth signup trigger, drops duplicate/overlapping RLS policies and indexes, seeds the `queue_monthly` plan. |
| 3 | `20260705221500_application_status_enum_alignment.sql` | Adds `shortlisted` and `withdrawn` to `rental_application_status`. |
| 4 | `20260705230000_batch2_identity_foundation.sql` | Identity verification: `identity_verifications`, `identity_verification_events`, `finalize_identity_verification()`, `admin_identity_overview()`. |
| 5 | `20260706000000_batch3_applicant_profile.sql` | Applicant profile expansion: `co_applicants`, `guarantors`, invite RPCs. |
| 6 | `20260706001000_notifications_insert_policies.sql` | Insert policies for `notifications`. |
| 7 | `20260706010000_batch4_queue_engine.sql` | Housing queue: `queue_memberships`, `queue_point_ledger`, award/adjust RPCs. |
| 8 | `20260706020000_batch5_marketplace.sql` | Marketplace expansion: applicant counts, queue position estimates. |
| 9 | `20260706030000_batch6_policy_engine.sql` | Matchkoll policy engine: `landlord_policies`, `policy_rules`, evaluations. |
| 10 | `20260706040000_batch7_application_workflow.sql` | Application workflow: offers, snapshots, status extensions. |
| 11 | `20260706041000_batch7_status_notifications.sql` | `notify_application_applicant()` RPC. |
| 12 | `20260706050000_batch8_landlord_workspace.sql` | Landlord workspace: `properties`, `buildings`, `units`, team invites. |
| 13 | `20260706051000_batch8_team_management_rls.sql` | Team-management RLS (`current_user_is_company_manager`). |
| 14 | `20260706060000_batch9_messaging.sql` | Messaging: threads, messages, attachments + `message-attachments` bucket. |
| 15 | `20260706070000_batch10_viewings_offers_contracts.sql` | Viewings (`viewing_slots`/`viewing_invitations`), offers, contracts. |
| 16 | `20260706071000_batch10_signing_functions.sql` | `mock_sign_contract()`, `finalize_signed_contract()`. |
| 17 | `20260706080000_batch11_billing.sql` | Billing: plans, subscriptions, `billing_customers`, `billing_events`. |
| 18 | `20260706090000_batch12_byta.sql` | Byta (apartment exchange): profiles, interests, matches, reports. |
| 19 | `20260706100000_batch13_external_queues.sql` | External queue tracking + reminders. |
| 20 | `20260706110000_batch14_notifications.sql` | Notification preferences + `email_events`. |
| 21 | `20260706120000_batch15_analytics.sql` | Analytics: `analytics_events`, `analytics_daily`. |
| 22 | `20260706121000_batch15_analytics_functions.sql` | Analytics RPCs (`track_analytics_event`, counts). |
| 23 | `20260706130000_batch16_admin_expansion.sql` | Admin expansion: `platform_settings`, `user_risk_flags`, `privacy_requests`, support grants. |
| 24 | `20260706131000_batch16_admin_thread_lookup.sql` | `admin_recent_message_threads()` RPC. |
| 25 | `20260706140000_batch19_push_subscriptions.sql` | Web-push subscriptions. |
| 26 | `20260706150000_batch20_migration_center.sql` | Landlord import center: `migration_projects/items/runs`. |
| 27 | `20260706160000_batch21_public_api.sql` | Public API: `api_keys`, request logs, webhook endpoints/deliveries, `enqueue_webhook_event()`. |
| 28 | `20260706170000_batch22_tenant_portals.sql` | White-label tenant portals. |
| 29 | `20260706171000_batch22_portal_company_unique.sql` | Unique portal per company. |
| 30 | `20260706180000_batch23_support_desk.sql` | Support desk: tickets, messages, macros, help articles. |
| 31 | `20260706190000_batch24_sales_crm.sql` | Sales CRM: `sales_leads` (supersedes legacy `sale_leads`). |
| 32 | `20260706200000_batch25_ops.sql` | Ops: `incident_reports`, `integration_failures`. |
| 33 | `20260706210000_batch26_conversion_events.sql` | Adds `queue_joined` to the analytics whitelist. |
| 34 | `20260707000000_production_hardening.sql` | Production hardening: blocks self-service escalation to admin roles (trigger), backfills/syncs `rental_applications.applicant_user_id` ↔ `user_id` and repoints the unique constraint + applicant RLS, adds `admin_audit_logs.resource_key` for non-UUID targets, adds `admin_user_overview(p_limit)`, adds storage delete policies. |

### `rental_applications.user_id` vs `applicant_user_id`

The live database carries both columns for historical reasons (see below).
As of `20260707000000_production_hardening.sql` they are backfilled and kept
in sync by a trigger; `user_id` is the canonical column in application code,
duplicate active applications are blocked by a partial unique index on
`(listing_id, user_id) where status <> 'withdrawn'`, and the applicant-update
RLS policy accepts either column. Dropping `applicant_user_id` remains a
possible future cleanup once nothing references it.

The live Supabase project tracks applied migrations in
`supabase_migrations.schema_migrations`. Every file in this directory must have
a corresponding entry there (applied via `supabase db push`, the SQL editor
with manual history insert, or the Supabase MCP `apply_migration` tool).

## Rules for new migrations

1. **One file per change, timestamped**: `YYYYMMDDHHMMSS_short_name.sql`.
2. **Additive by default.** Never drop or rewrite existing tables/columns that
   may hold production data without a documented, staged migration path.
3. **RLS is mandatory.** Every new table must `enable row level security` and
   define explicit policies in the same migration.
4. **Idempotent where possible**: `create table if not exists`,
   `drop policy if exists` before `create policy`, guarded `create type`.
5. **Index every foreign key** and every column used in high-traffic filters.
6. **`updated_at` trigger** (`public.set_updated_at()`) on mutable tables.
7. **No secrets or personal data** in migration files or seed data.
8. After applying a migration, regenerate the TypeScript types:

   ```bash
   npx supabase gen types typescript --project-id <project-id> --schema public > lib/supabase/database.types.ts
   ```

## Fresh environment bootstrap

Run all files in timestamp order against an empty database. They are
idempotent and safe to re-run. Storage buckets (`listing-images` public,
`profile-documents` and `message-attachments` private) are created by the
baseline and batch 9.

## Historical note

The live database was originally built from `archive/schema 1.sql` (an older
"phase 3" bundle that included `sale_leads`, `viewings` and a legacy
`rental_applications` shape) with the later phase files layered on top. That is
why `rental_applications` carries both the legacy `applicant_user_id` column
and the newer `user_id` column. The baseline reflects this real, live state —
not the never-applied `archive/schema.sql` path described by the old README.
