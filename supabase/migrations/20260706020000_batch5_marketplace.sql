-- ============================================================================
-- Batch 5 — Public rental marketplace and search alerts
-- ============================================================================
-- * Rental listing model gains labels (student/senior/short-term),
--   accessibility, application deadline, viewing info, policy summary,
--   address privacy and applicant-count visibility.
-- * saved_search_matches: dedup + notification tracking for search alerts.
-- * Performance indexes for public search.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Listing model extension -----------------------------------------------------

alter table public.listings add column if not exists is_student_housing boolean not null default false;
alter table public.listings add column if not exists is_senior_housing boolean not null default false;
alter table public.listings add column if not exists is_short_term boolean not null default false;
alter table public.listings add column if not exists has_accessibility boolean not null default false;
alter table public.listings add column if not exists application_deadline timestamptz;
alter table public.listings add column if not exists viewing_info text;
alter table public.listings add column if not exists policy_summary text;
alter table public.listings add column if not exists hide_exact_address boolean not null default false;
alter table public.listings add column if not exists show_applicant_count boolean not null default false;

-- 2. Saved search matches ----------------------------------------------------------

create table if not exists public.saved_search_matches (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (saved_search_id, listing_id)
);

create index if not exists saved_search_matches_user_idx
  on public.saved_search_matches (user_id, created_at desc);
create index if not exists saved_search_matches_listing_idx
  on public.saved_search_matches (listing_id);

alter table public.saved_search_matches enable row level security;

-- Matches are written by the scheduled job (service role bypasses RLS).
drop policy if exists "users read own saved search matches" on public.saved_search_matches;
create policy "users read own saved search matches" on public.saved_search_matches
  for select using (auth.uid() = user_id);
drop policy if exists "admins read all saved search matches" on public.saved_search_matches;
create policy "admins read all saved search matches" on public.saved_search_matches
  for select using (public.current_user_is_admin());

-- 3. Performance indexes -------------------------------------------------------------

create index if not exists listings_rooms_idx on public.listings (rooms);
create index if not exists listings_published_at_idx on public.listings (published_at desc);
create index if not exists listings_application_deadline_idx on public.listings (application_deadline)
  where application_deadline is not null;
create index if not exists listings_status_type_city_idx on public.listings (status, listing_type, city);
create index if not exists listings_student_idx on public.listings (is_student_housing) where is_student_housing;
create index if not exists listings_senior_idx on public.listings (is_senior_housing) where is_senior_housing;
create index if not exists listings_short_term_idx on public.listings (is_short_term) where is_short_term;

-- 4. Public applicant count (only when the landlord allows it) -------------------------

create or replace function public.public_listing_applicant_count(p_listing_id uuid)
returns integer
language sql
security definer
set search_path to 'public'
as $$
  select case
    when exists (
      select 1 from public.listings l
      where l.id = p_listing_id
        and l.status = 'published'
        and l.show_applicant_count
    )
    then (
      select count(*)::integer
      from public.rental_applications ra
      where ra.listing_id = p_listing_id
        and ra.status not in ('withdrawn', 'draft')
    )
    else null
  end;
$$;

-- Signed-in users can estimate their queue position among applicants.
create or replace function public.estimated_queue_position(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_points integer;
  v_ahead integer;
  v_total integer;
begin
  if auth.uid() is null then
    return null;
  end if;

  select current_points into v_points
  from public.queue_memberships
  where user_id = auth.uid()
    and membership_status = 'active';

  if v_points is null then
    return null;
  end if;

  select
    count(*) filter (where ra.queue_points_snapshot > v_points),
    count(*)
  into v_ahead, v_total
  from public.rental_applications ra
  where ra.listing_id = p_listing_id
    and ra.status not in ('withdrawn', 'draft')
    and ra.user_id <> auth.uid();

  return jsonb_build_object(
    'points', v_points,
    'position', v_ahead + 1,
    'total_applicants', v_total
  );
end;
$$;
