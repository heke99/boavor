-- Bovaro production go-live hardening
-- Run after all schema/phase SQL files, including phase_permissions_security_hardening.sql.
-- Safe to re-run.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Storage buckets for uploaded listing images and private profile documents
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'listing-images',
    'listing-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'profile-documents',
    'profile-documents',
    false,
    15728640,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads listing images" on storage.objects;
create policy "public reads listing images"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "users upload own listing images" on storage.objects;
create policy "users upload own listing images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users manage own listing images" on storage.objects;
create policy "users manage own listing images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users upload own profile documents" on storage.objects;
create policy "users upload own profile documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authorized users read profile documents" on storage.objects;
create policy "authorized users read profile documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.rental_application_documents rad
      join public.rental_applications ra on ra.id = rad.application_id
      where rad.file_url = 'storage:profile-documents/' || storage.objects.name
        and (
          rad.user_id = auth.uid()
          or public.current_user_can_manage_application(ra.id)
          or public.current_user_is_admin()
        )
    )
  )
);

drop policy if exists "users manage own profile documents" on storage.objects;
create policy "users manage own profile documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own profile documents" on storage.objects;
create policy "users delete own profile documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- 2. GDPR/privacy operational workflow
-- =========================================================

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'rectification', 'erasure', 'restriction')),
  status text not null default 'new' check (status in ('new', 'in_review', 'completed', 'rejected')),
  message text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_user_id_idx
  on public.privacy_requests(user_id);

create index if not exists privacy_requests_status_idx
  on public.privacy_requests(status, created_at desc);

drop trigger if exists privacy_requests_updated_at on public.privacy_requests;
create trigger privacy_requests_updated_at
before update on public.privacy_requests
for each row execute procedure public.set_updated_at();

alter table public.privacy_requests enable row level security;

drop policy if exists "users create own privacy requests" on public.privacy_requests;
create policy "users create own privacy requests"
on public.privacy_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users read own privacy requests" on public.privacy_requests;
create policy "users read own privacy requests"
on public.privacy_requests
for select
to authenticated
using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "admins update privacy requests" on public.privacy_requests;
create policy "admins update privacy requests"
on public.privacy_requests
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- =========================================================
-- 3. Operational tables for rate-limit and notification jobs
-- =========================================================

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  subject_hash text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_scope_subject_created_idx
  on public.rate_limit_events(scope, subject_hash, created_at desc);

alter table public.rate_limit_events enable row level security;

drop policy if exists "admins read rate limit events" on public.rate_limit_events;
create policy "admins read rate limit events"
on public.rate_limit_events
for select
to authenticated
using (public.current_user_is_admin());

create table if not exists public.saved_search_notification_runs (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid references public.saved_searches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  matched_listing_ids uuid[] not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists saved_search_notification_runs_user_created_idx
  on public.saved_search_notification_runs(user_id, created_at desc);

alter table public.saved_search_notification_runs enable row level security;

drop policy if exists "users read own saved search notification runs" on public.saved_search_notification_runs;
create policy "users read own saved search notification runs"
on public.saved_search_notification_runs
for select
to authenticated
using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "admins manage saved search notification runs" on public.saved_search_notification_runs;
create policy "admins manage saved search notification runs"
on public.saved_search_notification_runs
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
