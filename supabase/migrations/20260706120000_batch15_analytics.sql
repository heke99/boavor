-- ============================================================================
-- Batch 15 — Analytics, insights and campaigns
-- ============================================================================
-- * analytics_events: privacy-light event stream (no free-text PII; user id
--   only where already known to the platform).
-- * analytics_daily: nightly aggregates (metric × dimension × date).
-- * campaigns: admin-managed promotional blocks with placements.
-- * track_analytics_event(): whitelisted, SECURITY DEFINER insert callable
--   from the public site.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  listing_id uuid references public.listings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_type_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_listing_idx on public.analytics_events (listing_id, created_at desc)
  where listing_id is not null;
create index if not exists analytics_events_created_idx on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;

drop policy if exists "admins read analytics events" on public.analytics_events;
create policy "admins read analytics events" on public.analytics_events
  for select using (public.current_user_is_admin());
drop policy if exists "listing owners read own listing events" on public.analytics_events;
create policy "listing owners read own listing events" on public.analytics_events
  for select using (
    listing_id is not null and public.current_user_can_manage_listing(listing_id)
  );
-- Inserts only via track_analytics_event() / service role.

create or replace function public.track_analytics_event(
  p_event_type text,
  p_listing_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_event_type not in (
    'listing_view', 'search_performed', 'application_submitted', 'inquiry_submitted',
    'saved_search_created', 'exchange_interest', 'registration_completed'
  ) then
    raise exception 'unknown event type';
  end if;

  insert into public.analytics_events (event_type, listing_id, user_id, metadata)
  values (p_event_type, p_listing_id, auth.uid(), coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create table if not exists public.analytics_daily (
  day date not null,
  metric text not null,
  dimension text not null default 'all',
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (day, metric, dimension)
);

create index if not exists analytics_daily_metric_idx on public.analytics_daily (metric, day desc);

alter table public.analytics_daily enable row level security;

drop policy if exists "admins read analytics daily" on public.analytics_daily;
create policy "admins read analytics daily" on public.analytics_daily
  for select using (public.current_user_is_admin());
-- Writes via the rollup cron (service role).

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  cta_label text,
  cta_url text,
  placement text not null default 'home' check (placement in ('home', 'rent', 'dashboard')),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_placement_idx on public.campaigns (placement, is_active);

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists "public reads active campaigns" on public.campaigns;
create policy "public reads active campaigns" on public.campaigns
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
drop policy if exists "admins manage campaigns" on public.campaigns;
create policy "admins manage campaigns" on public.campaigns
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
