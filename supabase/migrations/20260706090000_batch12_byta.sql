-- ============================================================================
-- Batch 12 — Bovaro Byta: housing exchange marketplace
-- ============================================================================
-- * exchange_profiles: one per user; current home + wanted criteria +
--   privacy controls (name/address hidden until mutual interest by default).
-- * exchange_interests: directed interest; mutual interest creates a match.
-- * exchange_matches: matched pair + message thread + landlord approval flow.
-- * exchange_reports: moderation (fake ad / inappropriate / fraud).
-- * register_exchange_interest(): SECURITY DEFINER — verified users only,
--   creates the match + exchange message thread atomically on mutual interest.
--
-- Current/wanted home data live as structured columns on exchange_profiles
-- (1:1 with the profile) instead of separate tables — same capability,
-- simpler joins.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.exchange_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'completed', 'removed')),
  -- Current home
  current_city text not null,
  current_area text,
  current_street text,
  current_rooms numeric(4,1) not null,
  current_area_sqm numeric(8,2),
  current_rent integer not null,
  current_landlord_name text,
  current_contract_type text not null default 'first_hand'
    check (current_contract_type in ('first_hand', 'student', 'senior')),
  current_floor text,
  current_has_elevator boolean not null default false,
  current_has_balcony boolean not null default false,
  current_has_accessibility boolean not null default false,
  description text,
  -- Wanted
  wanted_cities text[] not null default '{}',
  wanted_areas text[] not null default '{}',
  wanted_min_rooms numeric(4,1),
  wanted_max_rent integer,
  wanted_min_area_sqm numeric(8,2),
  wanted_needs_accessibility boolean not null default false,
  -- Privacy
  show_name_before_match boolean not null default false,
  show_exact_address boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exchange_profiles_status_idx on public.exchange_profiles (status) where status = 'active';
create index if not exists exchange_profiles_city_idx on public.exchange_profiles (current_city);

drop trigger if exists exchange_profiles_updated_at on public.exchange_profiles;
create trigger exchange_profiles_updated_at before update on public.exchange_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.exchange_interests (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.exchange_profiles(id) on delete cascade,
  to_profile_id uuid not null references public.exchange_profiles(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_profile_id, to_profile_id),
  constraint exchange_interests_no_self check (from_profile_id <> to_profile_id)
);

create index if not exists exchange_interests_to_idx on public.exchange_interests (to_profile_id, status);

create table if not exists public.exchange_matches (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references public.exchange_profiles(id) on delete cascade,
  profile_b uuid not null references public.exchange_profiles(id) on delete cascade,
  thread_id uuid references public.message_threads(id) on delete set null,
  status text not null default 'contact_started'
    check (status in ('contact_started', 'documents_shared', 'landlord_review', 'approved', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_a, profile_b)
);

drop trigger if exists exchange_matches_updated_at on public.exchange_matches;
create trigger exchange_matches_updated_at before update on public.exchange_matches
  for each row execute function public.set_updated_at();

create table if not exists public.exchange_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.exchange_profiles(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason_type text not null check (reason_type in ('fake_ad', 'inappropriate', 'fraud', 'other')),
  detail text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'removed')),
  created_at timestamptz not null default now()
);

create index if not exists exchange_reports_status_idx on public.exchange_reports (status, created_at desc);

-- Helper: does the current user have a verified identity?
create or replace function public.current_user_is_identity_verified()
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.identity_verifications iv
    where iv.user_id = auth.uid() and iv.status = 'verified'
  );
$$;

-- RLS ------------------------------------------------------------------------------

alter table public.exchange_profiles enable row level security;
alter table public.exchange_interests enable row level security;
alter table public.exchange_matches enable row level security;
alter table public.exchange_reports enable row level security;

-- Profiles: owners manage; verified signed-in users browse active profiles;
-- admins read all.
drop policy if exists "owners manage exchange profile" on public.exchange_profiles;
create policy "owners manage exchange profile" on public.exchange_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "verified users browse active exchange profiles" on public.exchange_profiles;
create policy "verified users browse active exchange profiles" on public.exchange_profiles
  for select using (status = 'active' and public.current_user_is_identity_verified());
drop policy if exists "admins read exchange profiles" on public.exchange_profiles;
create policy "admins read exchange profiles" on public.exchange_profiles
  for select using (public.current_user_is_admin());
drop policy if exists "admins update exchange profiles" on public.exchange_profiles;
create policy "admins update exchange profiles" on public.exchange_profiles
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Interests: written via the definer function; parties read their own.
drop policy if exists "parties read exchange interests" on public.exchange_interests;
create policy "parties read exchange interests" on public.exchange_interests
  for select using (
    exists (
      select 1 from public.exchange_profiles p
      where (p.id = exchange_interests.from_profile_id or p.id = exchange_interests.to_profile_id)
        and p.user_id = auth.uid()
    )
  );

-- Matches: parties read/update (status flow); admins read.
drop policy if exists "parties read exchange matches" on public.exchange_matches;
create policy "parties read exchange matches" on public.exchange_matches
  for select using (
    exists (
      select 1 from public.exchange_profiles p
      where (p.id = exchange_matches.profile_a or p.id = exchange_matches.profile_b)
        and p.user_id = auth.uid()
    )
  );
drop policy if exists "parties update exchange matches" on public.exchange_matches;
create policy "parties update exchange matches" on public.exchange_matches
  for update using (
    exists (
      select 1 from public.exchange_profiles p
      where (p.id = exchange_matches.profile_a or p.id = exchange_matches.profile_b)
        and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.exchange_profiles p
      where (p.id = exchange_matches.profile_a or p.id = exchange_matches.profile_b)
        and p.user_id = auth.uid()
    )
  );
drop policy if exists "admins read exchange matches" on public.exchange_matches;
create policy "admins read exchange matches" on public.exchange_matches
  for select using (public.current_user_is_admin());

-- Reports: verified users report; admins manage.
drop policy if exists "verified users report exchange profiles" on public.exchange_reports;
create policy "verified users report exchange profiles" on public.exchange_reports
  for insert with check (
    reporter_user_id = auth.uid() and public.current_user_is_identity_verified()
  );
drop policy if exists "admins manage exchange reports" on public.exchange_reports;
create policy "admins manage exchange reports" on public.exchange_reports
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Interest registration with atomic match creation ------------------------------------

create or replace function public.register_exchange_interest(p_to_profile_id uuid, p_interested boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_my_profile public.exchange_profiles%rowtype;
  v_target public.exchange_profiles%rowtype;
  v_mutual boolean := false;
  v_match_id uuid;
  v_thread_id uuid;
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.current_user_is_identity_verified() then
    raise exception 'identity verification required';
  end if;

  select * into v_my_profile from public.exchange_profiles where user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'active exchange profile required';
  end if;

  select * into v_target from public.exchange_profiles where id = p_to_profile_id and status = 'active';
  if not found then
    raise exception 'target profile not found';
  end if;

  if v_target.id = v_my_profile.id then
    raise exception 'cannot register interest in own profile';
  end if;

  insert into public.exchange_interests (from_profile_id, to_profile_id, status)
  values (v_my_profile.id, v_target.id, case when p_interested then 'interested' else 'declined' end)
  on conflict (from_profile_id, to_profile_id)
  do update set status = excluded.status;

  if p_interested then
    select exists (
      select 1 from public.exchange_interests
      where from_profile_id = v_target.id
        and to_profile_id = v_my_profile.id
        and status = 'interested'
    ) into v_mutual;
  end if;

  if v_mutual then
    -- Canonical pair ordering avoids duplicate matches.
    if v_my_profile.id < v_target.id then
      v_a := v_my_profile.id; v_b := v_target.id;
    else
      v_a := v_target.id; v_b := v_my_profile.id;
    end if;

    select id, thread_id into v_match_id, v_thread_id
    from public.exchange_matches
    where profile_a = v_a and profile_b = v_b;

    if v_match_id is null then
      insert into public.message_threads (thread_type, subject, created_by)
      values ('exchange', 'Bostadsbyte: ' || v_my_profile.current_city || ' ⇄ ' || v_target.current_city, auth.uid())
      returning id into v_thread_id;

      insert into public.message_participants (thread_id, user_id, participant_role)
      values
        (v_thread_id, v_my_profile.user_id, 'member'),
        (v_thread_id, v_target.user_id, 'member')
      on conflict (thread_id, user_id) do nothing;

      insert into public.exchange_matches (profile_a, profile_b, thread_id)
      values (v_a, v_b, v_thread_id)
      returning id into v_match_id;

      insert into public.notifications (user_id, title, body)
      values
        (v_my_profile.user_id, 'Ni har en bytesmatchning!', 'Ömsesidigt intresse — ni kan nu kontakta varandra via Meddelanden.'),
        (v_target.user_id, 'Ni har en bytesmatchning!', 'Ömsesidigt intresse — ni kan nu kontakta varandra via Meddelanden.');
    end if;
  end if;

  return jsonb_build_object('mutual', v_mutual, 'match_id', v_match_id, 'thread_id', v_thread_id);
end;
$$;
