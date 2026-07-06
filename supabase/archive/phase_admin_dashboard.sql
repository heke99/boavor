-- Admin dashboard foundation + login/admin support
-- Safe/defensive version for Bovaro
-- Run after core schema/register/listings phases.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Admin helper functions
-- =========================================================

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  );
$$;

-- =========================================================
-- 2. Admin-safe user overview
-- =========================================================

create or replace function public.admin_user_overview()
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  role public.app_role,
  account_type text,
  city text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    coalesce(p.account_type, 'private')::text,
    p.city,
    u.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by u.created_at desc nulls last, p.updated_at desc nulls last;
end;
$$;

-- =========================================================
-- 3. Admin tables
-- =========================================================

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_user_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  account_type text not null default 'private',
  role public.app_role not null default 'seeker',
  note text,
  status text not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_user_id_idx
on public.admin_audit_logs(admin_user_id);

create index if not exists admin_audit_logs_created_at_idx
on public.admin_audit_logs(created_at desc);

create index if not exists admin_user_invites_email_idx
on public.admin_user_invites(email);

create index if not exists admin_user_invites_status_idx
on public.admin_user_invites(status);

-- =========================================================
-- 4. Updated_at trigger helper
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_user_invites_updated_at on public.admin_user_invites;

create trigger admin_user_invites_updated_at
before update on public.admin_user_invites
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 5. Ensure missing rental sub tables if rental_applications exists
-- =========================================================

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rental_applications'
  ) then

    create table if not exists public.rental_application_co_applicants (
      id uuid primary key default gen_random_uuid(),
      application_id uuid not null references public.rental_applications(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      full_name text not null,
      email text,
      phone text,
      relationship text,
      created_at timestamptz not null default now()
    );

    create table if not exists public.rental_application_documents (
      id uuid primary key default gen_random_uuid(),
      application_id uuid not null references public.rental_applications(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      file_name text not null,
      file_url text not null,
      document_type text not null,
      created_at timestamptz not null default now()
    );

    create index if not exists rental_application_co_applicants_application_id_idx
    on public.rental_application_co_applicants(application_id);

    create index if not exists rental_application_documents_application_id_idx
    on public.rental_application_documents(application_id);

    alter table public.rental_application_co_applicants enable row level security;
    alter table public.rental_application_documents enable row level security;
  end if;
end
$$;

-- =========================================================
-- 6. Enable RLS on admin tables
-- =========================================================

alter table public.admin_audit_logs enable row level security;
alter table public.admin_user_invites enable row level security;

-- =========================================================
-- 7. Admin policies for admin tables
-- =========================================================

drop policy if exists "admins can read audit logs" on public.admin_audit_logs;

create policy "admins can read audit logs"
on public.admin_audit_logs
for select
using (public.current_user_is_admin());

drop policy if exists "admins can insert audit logs" on public.admin_audit_logs;

create policy "admins can insert audit logs"
on public.admin_audit_logs
for insert
with check (public.current_user_is_admin());

drop policy if exists "admins manage user invites" on public.admin_user_invites;

create policy "admins manage user invites"
on public.admin_user_invites
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- =========================================================
-- 8. Admin visibility/control policies for required core tables
-- =========================================================

drop policy if exists "admins can read all profiles" on public.profiles;

create policy "admins can read all profiles"
on public.profiles
for select
using (public.current_user_is_admin());

drop policy if exists "super admins can update profiles" on public.profiles;

create policy "super admins can update profiles"
on public.profiles
for update
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

drop policy if exists "admins can read all companies" on public.companies;

create policy "admins can read all companies"
on public.companies
for select
using (public.current_user_is_admin());

drop policy if exists "admins can update companies" on public.companies;

create policy "admins can update companies"
on public.companies
for update
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admins can read all company members" on public.company_members;

create policy "admins can read all company members"
on public.company_members
for select
using (public.current_user_is_admin());

drop policy if exists "admins can read all listings" on public.listings;

create policy "admins can read all listings"
on public.listings
for select
using (public.current_user_is_admin());

drop policy if exists "admins can update all listings" on public.listings;

create policy "admins can update all listings"
on public.listings
for update
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- =========================================================
-- 9. Guarded admin policies for optional/later tables
-- =========================================================

do $$
begin
  -- rental_applications
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rental_applications'
  ) then
    execute 'drop policy if exists "admins can read all rental applications" on public.rental_applications';
    execute 'create policy "admins can read all rental applications" on public.rental_applications for select using (public.current_user_is_admin())';
  end if;

  -- rental_application_co_applicants
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rental_application_co_applicants'
  ) then
    execute 'drop policy if exists "admins can read all application co applicants" on public.rental_application_co_applicants';
    execute 'create policy "admins can read all application co applicants" on public.rental_application_co_applicants for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "users can create own rental application co applicants" on public.rental_application_co_applicants';
    execute 'create policy "users can create own rental application co applicants" on public.rental_application_co_applicants for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "users can read own rental application co applicants" on public.rental_application_co_applicants';
    execute 'create policy "users can read own rental application co applicants" on public.rental_application_co_applicants for select using (auth.uid() = user_id)';
  end if;

  -- rental_application_documents
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rental_application_documents'
  ) then
    execute 'drop policy if exists "admins can read all application documents" on public.rental_application_documents';
    execute 'create policy "admins can read all application documents" on public.rental_application_documents for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "users can create own rental application documents" on public.rental_application_documents';
    execute 'create policy "users can create own rental application documents" on public.rental_application_documents for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "users can read own rental application documents" on public.rental_application_documents';
    execute 'create policy "users can read own rental application documents" on public.rental_application_documents for select using (auth.uid() = user_id)';
  end if;

  -- listing_inquiries
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'listing_inquiries'
  ) then
    execute 'drop policy if exists "admins can read all inquiries" on public.listing_inquiries';
    execute 'create policy "admins can read all inquiries" on public.listing_inquiries for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "admins can update all inquiries" on public.listing_inquiries';
    execute 'create policy "admins can update all inquiries" on public.listing_inquiries for update using (public.current_user_is_admin()) with check (public.current_user_is_admin())';
  end if;

  -- listing_internal_notes
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'listing_internal_notes'
  ) then
    execute 'drop policy if exists "admins can read all listing notes" on public.listing_internal_notes';
    execute 'create policy "admins can read all listing notes" on public.listing_internal_notes for select using (public.current_user_is_admin())';
  end if;

  -- listing_activity_events
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'listing_activity_events'
  ) then
    execute 'drop policy if exists "admins can read all listing activity" on public.listing_activity_events';
    execute 'create policy "admins can read all listing activity" on public.listing_activity_events for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "admins can insert listing activity" on public.listing_activity_events';
    execute 'create policy "admins can insert listing activity" on public.listing_activity_events for insert with check (public.current_user_is_admin())';
  end if;
end
$$;