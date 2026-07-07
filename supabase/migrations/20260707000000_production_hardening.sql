-- ============================================================================
-- Production hardening — security and schema alignment
-- ============================================================================
-- Fixes found in the production-readiness audit:
--
-- 1. profiles.role privilege escalation: the "users can update own profile"
--    RLS policy has no column restriction, so any user could set their own
--    role to admin/super_admin. A trigger now blocks admin-role changes
--    unless performed by a super admin or the service role.
--
-- 2. rental_applications identity drift: application code writes user_id
--    while the applicant-update RLS policy and the unique constraint use the
--    legacy applicant_user_id column (left NULL by the app). This silently
--    broke applicant withdraw/accept under RLS and allowed duplicate
--    applications. We backfill both columns, keep them in sync with a
--    trigger, repoint RLS to accept either column, and replace the broken
--    unique constraint with a partial unique index that matches the app's
--    "re-apply after withdraw" behavior.
--
-- 3. admin_audit_logs: target_id is uuid, but platform-setting and
--    maintenance-mode audits passed text keys, so those inserts failed
--    silently. A nullable resource_key column now holds non-UUID targets.
--
-- 4. Storage: listing-images and message-attachments buckets had no delete
--    policy, so owners could not remove their own files.
--
-- Safe to re-run. No destructive changes; the only dropped object is the
-- broken unique constraint on rental_applications, replaced in the same
-- migration by a stricter partial unique index.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Block self-service escalation to admin roles
-- ----------------------------------------------------------------------------

create or replace function public.enforce_profile_role_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Service-role and system paths (auth.uid() is null) are trusted: the
  -- signup trigger and server-side maintenance must keep working.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role in ('admin', 'super_admin') and not public.current_user_is_super_admin() then
      raise exception 'only super admins can assign admin roles'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     and (new.role in ('admin', 'super_admin') or old.role in ('admin', 'super_admin'))
     and not public.current_user_is_super_admin() then
    raise exception 'only super admins can change admin roles'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_role_guard();

-- ----------------------------------------------------------------------------
-- 2. rental_applications: reconcile user_id / applicant_user_id
-- ----------------------------------------------------------------------------

-- Backfill in both directions so legacy rows (applicant_user_id only) and
-- app-created rows (user_id only) end up fully populated.
update public.rental_applications
set applicant_user_id = user_id
where applicant_user_id is null and user_id is not null;

update public.rental_applications
set user_id = applicant_user_id
where user_id is null and applicant_user_id is not null;

-- Keep both columns in sync for all future writes regardless of which one
-- the caller provides.
create or replace function public.sync_rental_application_applicant()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.applicant_user_id is not null then
    new.user_id := new.applicant_user_id;
  elsif new.applicant_user_id is null and new.user_id is not null then
    new.applicant_user_id := new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists rental_applications_sync_applicant on public.rental_applications;
create trigger rental_applications_sync_applicant
  before insert or update on public.rental_applications
  for each row execute function public.sync_rental_application_applicant();

-- The legacy unique constraint covered withdrawn applications too, which
-- would block the supported "withdraw and re-apply" flow once
-- applicant_user_id is backfilled. Replace it with a partial unique index
-- on the canonical user_id column for active applications only.
alter table public.rental_applications
  drop constraint if exists rental_applications_listing_id_applicant_user_id_key;

do $$
begin
  create unique index if not exists rental_applications_active_listing_user_key
    on public.rental_applications (listing_id, user_id)
    where status <> 'withdrawn' and user_id is not null;
exception when unique_violation then
  raise warning 'rental_applications has duplicate active applications per (listing_id, user_id); '
    'resolve the duplicates (e.g. withdraw the older rows) and re-run this migration to enforce uniqueness.';
end $$;

-- Applicants must be able to update their own applications no matter which
-- identity column a row carries.
drop policy if exists "authorized users can update rental applications" on public.rental_applications;
create policy "authorized users can update rental applications" on public.rental_applications
  for update using (
    auth.uid() = user_id
    or auth.uid() = applicant_user_id
    or exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = rental_applications.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 3. admin_user_overview: optional limit so the admin dashboard no longer
--    has to load every user just to show the six most recent ones.
-- ----------------------------------------------------------------------------

-- The signature changes, so drop the zero-arg version first to avoid an
-- ambiguous overload. Existing callers without arguments keep working via
-- the default.
drop function if exists public.admin_user_overview();

create or replace function public.admin_user_overview(p_limit integer default null)
returns table(
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
set search_path to 'public', 'auth'
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
  order by u.created_at desc nulls last, p.updated_at desc nulls last
  limit p_limit;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. admin_audit_logs: support non-UUID targets and common filters
-- ----------------------------------------------------------------------------

alter table public.admin_audit_logs
  add column if not exists resource_key text;

create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action);
create index if not exists admin_audit_logs_target_type_idx on public.admin_audit_logs (target_type);

-- ----------------------------------------------------------------------------
-- 5. Storage: owner delete policies for listing images and attachments
-- ----------------------------------------------------------------------------

drop policy if exists "users delete own listing images" on storage.objects;
create policy "users delete own listing images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own message attachments" on storage.objects;
create policy "users delete own message attachments" on storage.objects
  for delete to authenticated using (
    bucket_id = 'message-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );
