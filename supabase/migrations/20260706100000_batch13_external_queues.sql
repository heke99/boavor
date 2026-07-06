-- ============================================================================
-- Batch 13 — External queue assistant (Bovaro Samla)
-- ============================================================================
-- Helps users track housing queues OUTSIDE Bovaro. No credentials are ever
-- stored: only manual tracking data (points/days, dates, login URL) and
-- reminders. No scraping or automated login.
--
-- * external_queue_providers: admin-managed directory of Swedish queues.
-- * external_queue_memberships: a user's manual tracking of a queue.
-- * external_queue_reminders: renewal/fee/update reminders.
-- * external_queue_events: audit of membership changes.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.external_queue_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  region text,
  website_url text,
  signup_url text,
  login_url text,
  annual_fee_sek integer,
  renewal_rule text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_queue_providers_active_idx on public.external_queue_providers (is_active, name);
create index if not exists external_queue_providers_city_idx on public.external_queue_providers (city);

drop trigger if exists external_queue_providers_updated_at on public.external_queue_providers;
create trigger external_queue_providers_updated_at before update on public.external_queue_providers
  for each row execute function public.set_updated_at();

create table if not exists public.external_queue_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references public.external_queue_providers(id) on delete set null,
  -- Free-text name when the queue is not in the directory.
  custom_provider_name text,
  city text,
  login_url text,
  joined_date date,
  current_points integer,
  current_days integer,
  renewal_date date,
  last_updated_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_queue_membership_provider_check check (provider_id is not null or custom_provider_name is not null)
);

create index if not exists external_queue_memberships_user_idx on public.external_queue_memberships (user_id);
create index if not exists external_queue_memberships_renewal_idx on public.external_queue_memberships (renewal_date)
  where renewal_date is not null;

drop trigger if exists external_queue_memberships_updated_at on public.external_queue_memberships;
create trigger external_queue_memberships_updated_at before update on public.external_queue_memberships
  for each row execute function public.set_updated_at();

create table if not exists public.external_queue_reminders (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.external_queue_memberships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('renewal', 'annual_fee', 'profile_update')),
  remind_at date not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists external_queue_reminders_due_idx on public.external_queue_reminders (remind_at)
  where sent_at is null;
create index if not exists external_queue_reminders_membership_idx on public.external_queue_reminders (membership_id);

create table if not exists public.external_queue_events (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.external_queue_memberships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists external_queue_events_membership_idx on public.external_queue_events (membership_id, created_at desc);

-- RLS ------------------------------------------------------------------------------

alter table public.external_queue_providers enable row level security;
alter table public.external_queue_memberships enable row level security;
alter table public.external_queue_reminders enable row level security;
alter table public.external_queue_events enable row level security;

-- Provider directory: public read of active providers; admins manage.
drop policy if exists "public reads active queue providers" on public.external_queue_providers;
create policy "public reads active queue providers" on public.external_queue_providers
  for select using (is_active = true);
drop policy if exists "admins read all queue providers" on public.external_queue_providers;
create policy "admins read all queue providers" on public.external_queue_providers
  for select using (public.current_user_is_admin());
drop policy if exists "admins manage queue providers" on public.external_queue_providers;
create policy "admins manage queue providers" on public.external_queue_providers
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Memberships/reminders/events: users manage their own.
drop policy if exists "users manage own external memberships" on public.external_queue_memberships;
create policy "users manage own external memberships" on public.external_queue_memberships
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users manage own external reminders" on public.external_queue_reminders;
create policy "users manage own external reminders" on public.external_queue_reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users read own external events" on public.external_queue_events;
create policy "users read own external events" on public.external_queue_events
  for select using (user_id = auth.uid());
drop policy if exists "users insert own external events" on public.external_queue_events;
create policy "users insert own external events" on public.external_queue_events
  for insert with check (user_id = auth.uid());

-- Seed a small, factual directory of well-known Swedish queues.
insert into public.external_queue_providers (name, city, region, website_url, signup_url, annual_fee_sek, renewal_rule, notes)
select * from (values
  ('Bostadsförmedlingen i Stockholm', 'Stockholm', 'Stockholms län', 'https://bostad.stockholm.se', 'https://bostad.stockholm.se', 240, 'Årlig avgift för att behålla kötid.', 'Kommunal bostadsförmedling.'),
  ('Boplats Göteborg', 'Göteborg', 'Västra Götaland', 'https://boplats.se', 'https://boplats.se', 0, 'Gratis registrering; kötid räknas löpande.', 'Regional bostadsförmedling.'),
  ('Boplats Syd', 'Malmö', 'Skåne', 'https://boplatssyd.se', 'https://boplatssyd.se', 0, 'Gratis; håll profilen aktiv.', 'Bostäder i Skåne.'),
  ('Uppsala Bostadsförmedling', 'Uppsala', 'Uppsala län', 'https://bostad.uppsala.se', 'https://bostad.uppsala.se', 0, 'Kötid räknas från registrering.', 'Kommunal förmedling.')
) as seed(name, city, region, website_url, signup_url, annual_fee_sek, renewal_rule, notes)
where not exists (select 1 from public.external_queue_providers ep where ep.name = seed.name);
