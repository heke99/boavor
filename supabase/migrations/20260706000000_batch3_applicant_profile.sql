-- ============================================================================
-- Batch 3 — Applicant profile, household, co-applicants and document readiness
-- ============================================================================
-- Additive expansion of the applicant profile:
--   * profiles gains household/income/housing/personal-letter fields
--   * co_applicants gains a consent-based invite flow (token + linked user)
--   * guarantors (borgensmän)
--   * document review workflow on profile_documents + document_reviews log
--   * application_profile_snapshots: immutable snapshot per application
--
-- Safe to re-run.
-- ============================================================================

-- 1. Profile expansion ----------------------------------------------------------

alter table public.profiles add column if not exists smoking boolean not null default false;
alter table public.profiles add column if not exists income_type text;
alter table public.profiles add column if not exists study_status text;
alter table public.profiles add column if not exists current_housing_situation text;
alter table public.profiles add column if not exists personal_letter text;
alter table public.profiles add column if not exists guarantor_available boolean not null default false;
alter table public.profiles add column if not exists phone_verified_at timestamptz;

-- 2. Co-applicant invite flow ----------------------------------------------------

alter table public.co_applicants add column if not exists invite_status text not null default 'none'
  check (invite_status in ('none', 'invited', 'accepted', 'declined'));
alter table public.co_applicants add column if not exists invite_token uuid;
alter table public.co_applicants add column if not exists invited_user_id uuid references auth.users(id) on delete set null;
alter table public.co_applicants add column if not exists invited_at timestamptz;
alter table public.co_applicants add column if not exists accepted_at timestamptz;
alter table public.co_applicants add column if not exists consented_at timestamptz;

create unique index if not exists co_applicants_invite_token_idx
  on public.co_applicants (invite_token) where invite_token is not null;
create index if not exists co_applicants_invited_user_idx
  on public.co_applicants (invited_user_id) where invited_user_id is not null;

-- Invited users may read the co-applicant rows that point at them.
drop policy if exists "invited users read own co applicant links" on public.co_applicants;
create policy "invited users read own co applicant links" on public.co_applicants
  for select using (auth.uid() = invited_user_id);

-- Invite responses go through a SECURITY DEFINER function since the invited
-- user cannot see the row before accepting (token-based lookup).
create or replace function public.get_co_applicant_invite(p_token uuid)
returns table(
  id uuid,
  inviter_name text,
  full_name text,
  relationship text,
  invite_status text
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    ca.id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as inviter_name,
    ca.full_name,
    ca.relationship,
    ca.invite_status
  from public.co_applicants ca
  left join public.profiles p on p.id = ca.user_id
  where ca.invite_token = p_token
    and ca.invite_status = 'invited';
end;
$$;

create or replace function public.respond_co_applicant_invite(p_token uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.co_applicants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.co_applicants
  where invite_token = p_token
    and invite_status = 'invited'
  for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if v_row.user_id = auth.uid() then
    raise exception 'cannot respond to own invite';
  end if;

  update public.co_applicants
  set invite_status = case when p_accept then 'accepted' else 'declined' end,
      invited_user_id = auth.uid(),
      accepted_at = case when p_accept then now() else null end,
      consented_at = case when p_accept then now() else null end,
      invite_token = null,
      updated_at = now()
  where id = v_row.id;

  return jsonb_build_object('id', v_row.id, 'accepted', p_accept);
end;
$$;

-- 3. Guarantors -------------------------------------------------------------------

create table if not exists public.guarantors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  relationship text,
  monthly_income integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guarantors_user_idx on public.guarantors (user_id);

drop trigger if exists guarantors_updated_at on public.guarantors;
create trigger guarantors_updated_at before update on public.guarantors
  for each row execute function public.set_updated_at();

alter table public.guarantors enable row level security;

drop policy if exists "users manage own guarantors" on public.guarantors;
create policy "users manage own guarantors" on public.guarantors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admins read guarantors" on public.guarantors;
create policy "admins read guarantors" on public.guarantors
  for select using (public.current_user_is_admin());

-- 4. Document review workflow -------------------------------------------------------

alter table public.profile_documents add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.profile_documents add column if not exists reviewed_at timestamptz;
alter table public.profile_documents add column if not exists rejection_reason text;

-- Extend the allowed status values (text column; enforce with a check constraint).
do $$ begin
  alter table public.profile_documents drop constraint if exists profile_documents_status_check;
  alter table public.profile_documents add constraint profile_documents_status_check
    check (document_status in ('active', 'expired', 'replaced', 'rejected', 'pending_review'));
exception when others then null; end $$;

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.profile_documents(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists document_reviews_document_idx on public.document_reviews (document_id, created_at desc);

alter table public.document_reviews enable row level security;

drop policy if exists "admins manage document reviews" on public.document_reviews;
create policy "admins manage document reviews" on public.document_reviews
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
drop policy if exists "owners read reviews of own documents" on public.document_reviews;
create policy "owners read reviews of own documents" on public.document_reviews
  for select using (
    exists (
      select 1 from public.profile_documents pd
      where pd.id = document_reviews.document_id and pd.user_id = auth.uid()
    )
  );

-- 5. Application profile snapshots ---------------------------------------------------

create table if not exists public.application_profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_version integer not null default 1,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (application_id, snapshot_version)
);

create index if not exists application_profile_snapshots_application_idx
  on public.application_profile_snapshots (application_id, created_at desc);

alter table public.application_profile_snapshots enable row level security;

drop policy if exists "applicants insert own snapshots" on public.application_profile_snapshots;
create policy "applicants insert own snapshots" on public.application_profile_snapshots
  for insert with check (auth.uid() = user_id);
drop policy if exists "applicants read own snapshots" on public.application_profile_snapshots;
create policy "applicants read own snapshots" on public.application_profile_snapshots
  for select using (auth.uid() = user_id);
drop policy if exists "owners read application snapshots" on public.application_profile_snapshots;
create policy "owners read application snapshots" on public.application_profile_snapshots
  for select using (public.current_user_can_manage_application(application_id));
