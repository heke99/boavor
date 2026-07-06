-- ============================================================================
-- Batch 0 — Stabilization of the pre-baseline live database
-- ============================================================================
-- The live database was created by running the legacy phase SQL files
-- (now in supabase/archive/) in an inconsistent order. This migration brings
-- such a database in line with 00000000000000_baseline.sql:
--
--   1. Creates the missing rental_application_status_history table (defined in
--      archive/phase10_12_13.sql but never applied live) with RLS.
--   2. Removes the redundant legacy auth signup trigger. Two triggers fired on
--      every signup; handle_bovaro_new_user() is the authoritative one.
--   3. Drops duplicate/overlapping RLS policies left behind by the legacy
--      "hardening" phase which added new policies without removing old ones.
--      Includes the over-permissive "public can create listing inquiries"
--      (WITH CHECK true) policy superseded by "users can create listing
--      inquiries".
--   4. Drops duplicate indexes.
--   5. Seeds the queue_monthly subscription plan required by the queue
--      membership flow (user_subscriptions.plan_code has an FK to it).
--
-- Safe to re-run. Additive except for documented duplicate-policy cleanup.
-- ============================================================================

-- 1. Missing table: rental_application_status_history --------------------------

create table if not exists public.rental_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status public.rental_application_status,
  to_status public.rental_application_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists rental_application_status_history_application_id_idx
  on public.rental_application_status_history (application_id, created_at desc);

alter table public.rental_application_status_history enable row level security;

drop policy if exists "applicants read own application status history" on public.rental_application_status_history;
create policy "applicants read own application status history" on public.rental_application_status_history
  for select using (
    exists (
      select 1 from public.rental_applications ra
      where ra.id = rental_application_status_history.application_id
        and ra.user_id = auth.uid()
    )
  );

drop policy if exists "owners read application status history" on public.rental_application_status_history;
create policy "owners read application status history" on public.rental_application_status_history
  for select using (public.current_user_can_manage_application(application_id));

drop policy if exists "owners insert application status history" on public.rental_application_status_history;
create policy "owners insert application status history" on public.rental_application_status_history
  for insert with check (
    public.current_user_can_manage_application(application_id)
    or exists (
      select 1 from public.rental_applications ra
      where ra.id = rental_application_status_history.application_id
        and ra.user_id = auth.uid()
    )
  );

-- 2. Single auth signup trigger ------------------------------------------------

drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user_profile();

-- 3. Duplicate / superseded RLS policies ---------------------------------------

-- listings: legacy schema.sql policies superseded by hardened equivalents
drop policy if exists "users can read own draft listings" on public.listings;
drop policy if exists "authorized users can create listings" on public.listings;
drop policy if exists "users can update own or company listings" on public.listings;

-- listing_images: duplicates of "public reads published listing images"
-- and "owners manage listing images"
drop policy if exists "public can read images for published listings" on public.listing_images;
drop policy if exists "users can manage own or company listing images" on public.listing_images;

-- listing_features: same pattern
drop policy if exists "public can read features for published listings" on public.listing_features;
drop policy if exists "users can manage own or company listing features" on public.listing_features;

-- listing_documents: replace join-based manage policy with helper-based one
drop policy if exists "users can manage own or company listing documents" on public.listing_documents;
drop policy if exists "owners manage listing documents" on public.listing_documents;
create policy "owners manage listing documents" on public.listing_documents
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));

-- rental_requirements: same pattern
drop policy if exists "public can read rental requirements for published listings" on public.rental_requirements;
drop policy if exists "users can manage own or company rental requirements" on public.rental_requirements;

-- listing_inquiries: remove the fully open insert policy (WITH CHECK true) and
-- the join-based owner policies superseded by helper-based equivalents
drop policy if exists "public can create listing inquiries" on public.listing_inquiries;
drop policy if exists "owners can read incoming listing inquiries" on public.listing_inquiries;
drop policy if exists "owners can update incoming listing inquiries" on public.listing_inquiries;

-- listing_activity_events: join-based duplicates of helper-based policies
drop policy if exists "owners can read listing activity events" on public.listing_activity_events;
drop policy if exists "owners can insert listing activity events" on public.listing_activity_events;

-- 4. Duplicate indexes ----------------------------------------------------------

drop index if exists public.idx_company_members_user_id;      -- duplicate of company_members_user_id_idx
drop index if exists public.rental_applications_listing_id_idx; -- duplicate of idx_rental_applications_listing_id

-- 5. Seed data required by the application --------------------------------------

insert into public.subscription_plans (code, name, amount_sek, interval_unit, is_active)
values ('queue_monthly', 'Bovaro Kö+', 49, 'month', true)
on conflict (code) do nothing;
