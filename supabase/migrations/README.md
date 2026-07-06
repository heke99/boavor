# Bovaro database migrations

This directory is the single source of truth for the Bovaro database schema.
The legacy phase SQL files that previously lived in `supabase/` have been
consolidated and moved to [`supabase/archive/`](../archive/README.md). Do not
run archived files against any environment.

## Migration index (ordered)

| # | File | Purpose | Applied to live project |
|---|------|---------|-------------------------|
| 1 | `00000000000000_baseline.sql` | Consolidated baseline: all enums, 33 tables, functions, triggers, RLS policies, storage buckets, seed data. Idempotent; bootstraps a fresh environment. | Recorded as marker `baseline` (schema pre-existed from legacy phase files) |
| 2 | `20260705220000_batch0_stabilization.sql` | Brings a pre-baseline live database in line with the baseline: creates `rental_application_status_history`, removes the duplicate auth signup trigger, drops duplicate/overlapping RLS policies and indexes, seeds the `queue_monthly` plan. | Applied as `batch0_stabilization` |

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

Run the files in order (1 → 2) against an empty database. Both are idempotent
and safe to re-run. Storage buckets (`listing-images` public,
`profile-documents` private) are created by the baseline.

## Historical note

The live database was originally built from `archive/schema 1.sql` (an older
"phase 3" bundle that included `sale_leads`, `viewings` and a legacy
`rental_applications` shape) with the later phase files layered on top. That is
why `rental_applications` carries both the legacy `applicant_user_id` column
and the newer `user_id` column. The baseline reflects this real, live state —
not the never-applied `archive/schema.sql` path described by the old README.
