-- ============================================================================
-- Batch 8 — Landlord SaaS workspace: properties/units, team, settings
-- ============================================================================
-- * properties → buildings → units model with media/documents.
-- * listing_publications: audit of publish/unpublish events.
-- * company_member_invites: token-based team invites with team roles.
-- * company_members.team_role: owner/admin/leasing_agent/viewer/billing.
-- * companies: billing/public-profile/settings columns.
-- * listings: unit linkage and scheduled publishing.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Company extensions ---------------------------------------------------------

alter table public.companies add column if not exists billing_email text;
alter table public.companies add column if not exists invoice_reference text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists public_description text;
alter table public.companies add column if not exists default_selection_method text not null default 'manual_with_policy'
  check (default_selection_method in ('strict_queue', 'guided_queue', 'first_come', 'random', 'manual_with_policy'));
alter table public.companies add column if not exists notification_emails text[] not null default '{}';

-- 2. Team roles ------------------------------------------------------------------

alter table public.company_members add column if not exists team_role text not null default 'admin'
  check (team_role in ('owner', 'admin', 'leasing_agent', 'viewer', 'billing'));

create table if not exists public.company_member_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  team_role text not null default 'leasing_agent'
    check (team_role in ('owner', 'admin', 'leasing_agent', 'viewer', 'billing')),
  invite_token uuid not null default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

create unique index if not exists company_member_invites_token_idx on public.company_member_invites (invite_token);
create index if not exists company_member_invites_company_idx on public.company_member_invites (company_id, status);

alter table public.company_member_invites enable row level security;

drop policy if exists "company members manage invites" on public.company_member_invites;
create policy "company members manage invites" on public.company_member_invites
  for all using (public.current_user_can_manage_company(company_id))
  with check (public.current_user_can_manage_company(company_id));

-- Invite acceptance goes through a SECURITY DEFINER function (token lookup).
create or replace function public.accept_company_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invite public.company_member_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.company_member_invites
  where invite_token = p_token
    and status = 'pending'
  for update;

  if not found then
    raise exception 'invite not found';
  end if;

  insert into public.company_members (company_id, user_id, role, team_role, title)
  values (v_invite.company_id, auth.uid(), 'company_admin', v_invite.team_role, null)
  on conflict (company_id, user_id) do update
  set team_role = excluded.team_role;

  update public.company_member_invites
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = auth.uid()
  where id = v_invite.id;

  return jsonb_build_object('company_id', v_invite.company_id, 'team_role', v_invite.team_role);
end;
$$;

create or replace function public.get_company_invite(p_token uuid)
returns table(id uuid, company_name text, team_role text)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
  select i.id, c.name, i.team_role
  from public.company_member_invites i
  join public.companies c on c.id = i.company_id
  where i.invite_token = p_token
    and i.status = 'pending';
end;
$$;

-- 3. Property/unit model -----------------------------------------------------------

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  street text,
  zip_code text,
  city text not null,
  area_name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_owner_check check (company_id is not null or owner_user_id is not null)
);

create index if not exists properties_company_idx on public.properties (company_id);
create index if not exists properties_owner_idx on public.properties (owner_user_id);

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  street text,
  build_year integer,
  floors integer,
  has_elevator boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists buildings_property_idx on public.buildings (property_id);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  unit_number text not null,
  floor text,
  rooms numeric(4,1),
  area_sqm numeric(8,2),
  base_rent integer,
  has_balcony boolean not null default false,
  has_accessibility boolean not null default false,
  status text not null default 'vacant' check (status in ('vacant', 'listed', 'rented', 'renovation', 'blocked')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists units_property_idx on public.units (property_id);
create index if not exists units_building_idx on public.units (building_id);
create index if not exists units_status_idx on public.units (status);

drop trigger if exists units_updated_at on public.units;
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

create table if not exists public.unit_media (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists unit_media_unit_idx on public.unit_media (unit_id);

create table if not exists public.unit_documents (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  document_type text not null default 'general',
  created_at timestamptz not null default now()
);

create index if not exists unit_documents_unit_idx on public.unit_documents (unit_id);

-- 4. Listing linkage and publication audit -------------------------------------------

alter table public.listings add column if not exists unit_id uuid references public.units(id) on delete set null;
alter table public.listings add column if not exists scheduled_publish_at timestamptz;

create index if not exists listings_unit_idx on public.listings (unit_id);
create index if not exists listings_scheduled_publish_idx on public.listings (scheduled_publish_at)
  where scheduled_publish_at is not null;

create table if not exists public.listing_publications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  action text not null check (action in ('published', 'unpublished', 'paused', 'archived', 'scheduled', 'rented')),
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists listing_publications_listing_idx on public.listing_publications (listing_id, created_at desc);

-- 5. RLS -----------------------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.unit_media enable row level security;
alter table public.unit_documents enable row level security;
alter table public.listing_publications enable row level security;

-- Helper: can the current user manage a property?
create or replace function public.current_user_can_manage_property(target_property_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = target_property_id
      and (
        public.current_user_is_admin()
        or p.owner_user_id = auth.uid()
        or p.company_id = any(public.current_user_company_ids())
      )
  );
$$;

drop policy if exists "owners manage properties" on public.properties;
create policy "owners manage properties" on public.properties
  for all using (
    public.current_user_is_admin()
    or owner_user_id = auth.uid()
    or company_id = any(public.current_user_company_ids())
  ) with check (
    public.current_user_is_admin()
    or owner_user_id = auth.uid()
    or company_id = any(public.current_user_company_ids())
  );

drop policy if exists "owners manage buildings" on public.buildings;
create policy "owners manage buildings" on public.buildings
  for all using (public.current_user_can_manage_property(property_id))
  with check (public.current_user_can_manage_property(property_id));

drop policy if exists "owners manage units" on public.units;
create policy "owners manage units" on public.units
  for all using (public.current_user_can_manage_property(property_id))
  with check (public.current_user_can_manage_property(property_id));

drop policy if exists "owners manage unit media" on public.unit_media;
create policy "owners manage unit media" on public.unit_media
  for all using (
    exists (select 1 from public.units u where u.id = unit_media.unit_id and public.current_user_can_manage_property(u.property_id))
  ) with check (
    exists (select 1 from public.units u where u.id = unit_media.unit_id and public.current_user_can_manage_property(u.property_id))
  );

drop policy if exists "owners manage unit documents" on public.unit_documents;
create policy "owners manage unit documents" on public.unit_documents
  for all using (
    exists (select 1 from public.units u where u.id = unit_documents.unit_id and public.current_user_can_manage_property(u.property_id))
  ) with check (
    exists (select 1 from public.units u where u.id = unit_documents.unit_id and public.current_user_can_manage_property(u.property_id))
  );

drop policy if exists "owners read listing publications" on public.listing_publications;
create policy "owners read listing publications" on public.listing_publications
  for select using (public.current_user_can_manage_listing(listing_id));
drop policy if exists "owners insert listing publications" on public.listing_publications;
create policy "owners insert listing publications" on public.listing_publications
  for insert with check (public.current_user_can_manage_listing(listing_id));
drop policy if exists "admins read listing publications" on public.listing_publications;
create policy "admins read listing publications" on public.listing_publications
  for select using (public.current_user_is_admin());
