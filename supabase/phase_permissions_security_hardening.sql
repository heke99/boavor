-- Bovaro permissions + RLS hardening
-- Run after admin dashboard and dashboard/listing phases.
-- This file is defensive and safe to re-run.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Stable permission helpers
-- =========================================================

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

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

create or replace function public.current_user_company_ids()
returns uuid[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(cm.company_id), '{}')
  from public.company_members cm
  where cm.user_id = auth.uid();
$$;

create or replace function public.current_user_can_manage_company(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    target_company_id is not null
    and (
      public.current_user_is_admin()
      or target_company_id = any(public.current_user_company_ids())
    );
$$;

create or replace function public.current_user_can_manage_listing(target_listing_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = target_listing_id
      and (
        public.current_user_is_admin()
        or l.created_by = auth.uid()
        or l.company_id = any(public.current_user_company_ids())
      )
  );
$$;

create or replace function public.current_user_can_manage_application(target_application_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rental_applications ra
    where ra.id = target_application_id
      and (
        public.current_user_is_admin()
        or ra.landlord_user_id = auth.uid()
        or ra.landlord_company_id = any(public.current_user_company_ids())
        or public.current_user_can_manage_listing(ra.listing_id)
      )
  );
$$;

create or replace function public.current_user_can_manage_inquiry(target_inquiry_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listing_inquiries li
    where li.id = target_inquiry_id
      and (
        public.current_user_is_admin()
        or li.landlord_user_id = auth.uid()
        or li.landlord_company_id = any(public.current_user_company_ids())
        or public.current_user_can_manage_listing(li.listing_id)
      )
  );
$$;

-- =========================================================
-- 2. Tighten core RLS policies without relying on recursive joins
-- =========================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    alter table public.profiles enable row level security;

    execute 'drop policy if exists "users can read own profile" on public.profiles';
    execute 'create policy "users can read own profile" on public.profiles for select using (auth.uid() = id)';

    execute 'drop policy if exists "users can update own profile" on public.profiles';
    execute 'create policy "users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';

    execute 'drop policy if exists "admins can read all profiles" on public.profiles';
    execute 'create policy "admins can read all profiles" on public.profiles for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "super admins can update profiles" on public.profiles';
    execute 'create policy "super admins can update profiles" on public.profiles for update using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'company_members') then
    alter table public.company_members enable row level security;

    execute 'drop policy if exists "users can read own company memberships" on public.company_members';
    execute 'create policy "users can read own company memberships" on public.company_members for select using (auth.uid() = user_id or public.current_user_is_admin())';

    execute 'drop policy if exists "admins can read all company members" on public.company_members';
    execute 'create policy "admins can read all company members" on public.company_members for select using (public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'companies') then
    alter table public.companies enable row level security;

    execute 'drop policy if exists "company members can read own companies" on public.companies';
    execute 'create policy "company members can read own companies" on public.companies for select using (public.current_user_can_manage_company(id))';

    execute 'drop policy if exists "company members can update own companies" on public.companies';
    execute 'create policy "company members can update own companies" on public.companies for update using (public.current_user_can_manage_company(id)) with check (public.current_user_can_manage_company(id))';

    execute 'drop policy if exists "admins can read all companies" on public.companies';
    execute 'create policy "admins can read all companies" on public.companies for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "admins can update companies" on public.companies';
    execute 'create policy "admins can update companies" on public.companies for update using (public.current_user_is_admin()) with check (public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listings') then
    alter table public.listings enable row level security;

    execute 'drop policy if exists "public can read published listings" on public.listings';
    execute 'create policy "public can read published listings" on public.listings for select using (status = ''published'')';

    execute 'drop policy if exists "owners can read own listings" on public.listings';
    execute 'create policy "owners can read own listings" on public.listings for select using (created_by = auth.uid() or company_id = any(public.current_user_company_ids()) or public.current_user_is_admin())';

    execute 'drop policy if exists "owners can insert listings" on public.listings';
    execute 'create policy "owners can insert listings" on public.listings for insert with check (created_by = auth.uid() and (company_id is null or company_id = any(public.current_user_company_ids()) or public.current_user_is_admin()))';

    execute 'drop policy if exists "owners can update own listings" on public.listings';
    execute 'create policy "owners can update own listings" on public.listings for update using (public.current_user_can_manage_listing(id)) with check (public.current_user_can_manage_listing(id))';

    execute 'drop policy if exists "admins can read all listings" on public.listings';
    execute 'create policy "admins can read all listings" on public.listings for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "admins can update all listings" on public.listings';
    execute 'create policy "admins can update all listings" on public.listings for update using (public.current_user_is_admin()) with check (public.current_user_is_admin())';
  end if;
end
$$;

-- =========================================================
-- 3. Guarded policies for child tables
-- =========================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_images') then
    alter table public.listing_images enable row level security;
    execute 'drop policy if exists "owners manage listing images" on public.listing_images';
    execute 'create policy "owners manage listing images" on public.listing_images for all using (public.current_user_can_manage_listing(listing_id)) with check (public.current_user_can_manage_listing(listing_id))';
    execute 'drop policy if exists "public reads published listing images" on public.listing_images';
    execute 'create policy "public reads published listing images" on public.listing_images for select using (exists (select 1 from public.listings l where l.id = listing_id and l.status = ''published''))';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_features') then
    alter table public.listing_features enable row level security;
    execute 'drop policy if exists "owners manage listing features" on public.listing_features';
    execute 'create policy "owners manage listing features" on public.listing_features for all using (public.current_user_can_manage_listing(listing_id)) with check (public.current_user_can_manage_listing(listing_id))';
    execute 'drop policy if exists "public reads published listing features" on public.listing_features';
    execute 'create policy "public reads published listing features" on public.listing_features for select using (exists (select 1 from public.listings l where l.id = listing_id and l.status = ''published''))';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rental_requirements') then
    alter table public.rental_requirements enable row level security;
    execute 'drop policy if exists "owners manage rental requirements" on public.rental_requirements';
    execute 'create policy "owners manage rental requirements" on public.rental_requirements for all using (public.current_user_can_manage_listing(listing_id)) with check (public.current_user_can_manage_listing(listing_id))';
    execute 'drop policy if exists "public reads published rental requirements" on public.rental_requirements';
    execute 'create policy "public reads published rental requirements" on public.rental_requirements for select using (exists (select 1 from public.listings l where l.id = listing_id and l.status = ''published''))';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profile_documents') then
    alter table public.profile_documents enable row level security;
    execute 'drop policy if exists "users manage own profile_documents" on public.profile_documents';
    execute 'create policy "users manage own profile_documents" on public.profile_documents for all using (auth.uid() = user_id or public.current_user_is_admin()) with check (auth.uid() = user_id or public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'co_applicants') then
    alter table public.co_applicants enable row level security;
    execute 'drop policy if exists "users manage own co_applicants" on public.co_applicants';
    execute 'create policy "users manage own co_applicants" on public.co_applicants for all using (auth.uid() = user_id or public.current_user_is_admin()) with check (auth.uid() = user_id or public.current_user_is_admin())';
  end if;
end
$$;

-- =========================================================
-- 4. Applications and inquiries policies
-- =========================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rental_applications') then
    alter table public.rental_applications enable row level security;

    execute 'drop policy if exists "users can create own rental applications" on public.rental_applications';
    execute 'create policy "users can create own rental applications" on public.rental_applications for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "users can read own rental applications" on public.rental_applications';
    execute 'create policy "users can read own rental applications" on public.rental_applications for select using (auth.uid() = user_id)';

    execute 'drop policy if exists "owners can read incoming rental applications" on public.rental_applications';
    execute 'create policy "owners can read incoming rental applications" on public.rental_applications for select using (public.current_user_can_manage_application(id))';

    execute 'drop policy if exists "owners can update incoming rental applications" on public.rental_applications';
    execute 'create policy "owners can update incoming rental applications" on public.rental_applications for update using (public.current_user_can_manage_application(id)) with check (public.current_user_can_manage_application(id))';

    execute 'drop policy if exists "admins can read all rental applications" on public.rental_applications';
    execute 'create policy "admins can read all rental applications" on public.rental_applications for select using (public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_inquiries') then
    alter table public.listing_inquiries enable row level security;

    execute 'drop policy if exists "users can create listing inquiries" on public.listing_inquiries';
    execute 'create policy "users can create listing inquiries" on public.listing_inquiries for insert with check (auth.uid() = user_id or user_id is null)';

    execute 'drop policy if exists "owners can read listing inquiries" on public.listing_inquiries';
    execute 'create policy "owners can read listing inquiries" on public.listing_inquiries for select using (public.current_user_can_manage_inquiry(id))';

    execute 'drop policy if exists "owners can update listing inquiries" on public.listing_inquiries';
    execute 'create policy "owners can update listing inquiries" on public.listing_inquiries for update using (public.current_user_can_manage_inquiry(id)) with check (public.current_user_can_manage_inquiry(id))';

    execute 'drop policy if exists "admins can read all inquiries" on public.listing_inquiries';
    execute 'create policy "admins can read all inquiries" on public.listing_inquiries for select using (public.current_user_is_admin())';

    execute 'drop policy if exists "admins can update all inquiries" on public.listing_inquiries';
    execute 'create policy "admins can update all inquiries" on public.listing_inquiries for update using (public.current_user_is_admin()) with check (public.current_user_is_admin())';
  end if;
end
$$;

-- =========================================================
-- 5. Audit/admin table policies
-- =========================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_audit_logs') then
    alter table public.admin_audit_logs enable row level security;
    execute 'drop policy if exists "admins can read audit logs" on public.admin_audit_logs';
    execute 'create policy "admins can read audit logs" on public.admin_audit_logs for select using (public.current_user_is_admin())';
    execute 'drop policy if exists "admins can insert audit logs" on public.admin_audit_logs';
    execute 'create policy "admins can insert audit logs" on public.admin_audit_logs for insert with check (public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_activity_events') then
    alter table public.listing_activity_events enable row level security;
    execute 'drop policy if exists "owners read listing activity" on public.listing_activity_events';
    execute 'create policy "owners read listing activity" on public.listing_activity_events for select using (public.current_user_can_manage_listing(listing_id))';
    execute 'drop policy if exists "owners insert listing activity" on public.listing_activity_events';
    execute 'create policy "owners insert listing activity" on public.listing_activity_events for insert with check (public.current_user_can_manage_listing(listing_id))';
    execute 'drop policy if exists "admins can read all listing activity" on public.listing_activity_events';
    execute 'create policy "admins can read all listing activity" on public.listing_activity_events for select using (public.current_user_is_admin())';
  end if;
end
$$;
