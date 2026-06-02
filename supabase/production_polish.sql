-- Bovaro production polish
-- Run after supabase/production_go_live.sql. Safe to re-run.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Readiness helpers
-- =========================================================

create or replace function public.storage_bucket_exists(bucket_name text)
returns boolean
language sql
security definer
set search_path = storage, public
as $$
  select exists (
    select 1
    from storage.buckets
    where id = bucket_name
  );
$$;

grant execute on function public.storage_bucket_exists(text) to anon, authenticated;

-- =========================================================
-- 2. Enforced rate limiting helper
-- =========================================================

create or replace function public.check_rate_limit(
  input_scope text,
  input_subject_hash text,
  input_ip_hash text,
  input_limit integer,
  input_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  event_count integer;
begin
  delete from public.rate_limit_events
  where created_at < now() - interval '24 hours';

  select count(*) into event_count
  from public.rate_limit_events
  where scope = input_scope
    and subject_hash = input_subject_hash
    and created_at >= now() - make_interval(secs => input_window_seconds);

  if event_count >= input_limit then
    return false;
  end if;

  insert into public.rate_limit_events (scope, subject_hash, ip_hash)
  values (input_scope, input_subject_hash, input_ip_hash);

  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, text, text, integer, integer) to anon, authenticated;

-- =========================================================
-- 3. Company verification evidence
-- =========================================================

alter table public.companies
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

create index if not exists companies_verification_status_idx
  on public.companies(verification_status, created_at desc);

-- =========================================================
-- 4. Document access audit
-- =========================================================

create table if not exists public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.profile_documents(id) on delete set null,
  application_document_id uuid references public.rental_application_documents(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  access_type text not null check (access_type in ('profile_document', 'application_document')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists document_access_logs_owner_created_idx
  on public.document_access_logs(owner_user_id, created_at desc);

create index if not exists document_access_logs_actor_created_idx
  on public.document_access_logs(actor_user_id, created_at desc);

alter table public.document_access_logs enable row level security;

drop policy if exists "users read own document access logs" on public.document_access_logs;
create policy "users read own document access logs"
on public.document_access_logs
for select
to authenticated
using (auth.uid() = owner_user_id or public.current_user_is_admin());

drop policy if exists "authenticated users insert document access logs" on public.document_access_logs;
create policy "authenticated users insert document access logs"
on public.document_access_logs
for insert
to authenticated
with check (auth.uid() = actor_user_id);

drop policy if exists "admins read all document access logs" on public.document_access_logs;
create policy "admins read all document access logs"
on public.document_access_logs
for select
to authenticated
using (public.current_user_is_admin());
