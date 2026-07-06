# Archived legacy SQL files — do not run

These files are the historical "phase" SQL scripts that built the original
Bovaro database by being pasted into the Supabase SQL editor in sequence. They
are **deprecated** and kept only for reference and audit purposes.

The consolidated, authoritative schema now lives in
[`supabase/migrations/`](../migrations/README.md).

## Why these are archived

- Several files were **not idempotent** (bare `create type`, `create policy`
  without `drop policy if exists`) and failed on re-run.
- `schema.sql` and `schema 1.sql` are two divergent baselines. The live
  database was actually created from `schema 1.sql` (it contains `sale_leads`,
  `viewings` and a legacy `rental_applications` shape), while the old README
  documented `schema.sql` — which was never fully applied.
- The hardening phases added new RLS policies **without removing** the old
  ones, leaving duplicate/overlapping permissive policies (cleaned up by
  `migrations/20260705220000_batch0_stabilization.sql`).
- Two `auth.users` signup triggers were installed and both fired on every
  registration (`on_auth_user_created_profile` + `on_auth_user_created_bovaro_register`).
  Only `handle_bovaro_new_user()` is kept.
- `phase10_12_13.sql` defined `rental_application_status_history`, but the
  table never existed in the live database (created by the stabilization
  migration instead).

## File inventory

| File | Contents (summary) |
|------|--------------------|
| `schema.sql` | "Phase 9" core marketplace baseline (never fully applied live) |
| `schema 1.sql` | "Phase 3" bundle — actual origin of the live database |
| `phase4_profile_queue.sql` | co_applicants, profile_documents, subscription plans, queue |
| `phase10_12_13.sql` | rental applications, application docs/co-applicants/history |
| `phase_register_system.sql` | registration trigger, legal_acceptances, company onboarding |
| `phase_commercial_marketplace.sql` | commercial segments, listing_inquiries |
| `phase_dynamic_search.sql` | listing search columns backfill |
| `phase_dashboard_leads.sql` | inquiry status trigger/policies |
| `phase_dashboard_foundation.sql` | listing_activity_events |
| `phase_listing_detail_management.sql` | listing_internal_notes, edit flows |
| `phase_admin_dashboard.sql` | admin functions, audit logs, invites |
| `phase_public_listing_flows.sql` | apply/inquiry flow columns |
| `phase_permissions_security_hardening.sql` | helper functions, hardened policies |
| `production_go_live.sql` | storage buckets, privacy requests, rate limits |
| `production_polish.sql` | document access logs, readiness functions |
| `phase_demo_seed_data.sql` | demo/staging seed only — never production |
