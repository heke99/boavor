-- ============================================================================
-- Batch 2 — BankID-ready identity verification foundation
-- ============================================================================
-- Adds identity verification with provider abstraction support, consent
-- tracking, risk flags and an audited finalization flow.
--
-- Personal identity numbers are NEVER stored in plaintext by this flow:
-- only an HMAC hash (computed server-side) and the birth date derived from
-- the number. The legacy plaintext profiles.personal_identity_number column
-- stops being populated (signup trigger updated below); existing values are
-- cleared since identity now comes from verification.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Enums ---------------------------------------------------------------------

do $$ begin
  create type public.identity_verification_status as enum ('pending', 'verified', 'failed', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

-- 2. Tables --------------------------------------------------------------------

create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mock', 'bankid')),
  provider_session_id text,
  status public.identity_verification_status not null default 'pending',
  verified_at timestamptz,
  birth_date date,
  age_verified boolean,
  personal_identity_number_hash text,
  full_name_from_provider text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists identity_verifications_user_id_idx
  on public.identity_verifications (user_id, created_at desc);
create index if not exists identity_verifications_pin_hash_idx
  on public.identity_verifications (personal_identity_number_hash)
  where personal_identity_number_hash is not null;
-- Only one verified identity per user.
create unique index if not exists identity_verifications_one_verified_per_user
  on public.identity_verifications (user_id)
  where status = 'verified';

create table if not exists public.identity_verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.identity_verifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists identity_verification_events_verification_idx
  on public.identity_verification_events (verification_id, created_at desc);
create index if not exists identity_verification_events_user_idx
  on public.identity_verification_events (user_id, created_at desc);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  consent_version text not null,
  granted boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, consent_type, consent_version)
);

create index if not exists user_consents_user_idx on public.user_consents (user_id, consent_type);

create table if not exists public.user_risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists user_risk_flags_user_idx on public.user_risk_flags (user_id, created_at desc);
create index if not exists user_risk_flags_open_idx on public.user_risk_flags (flag_type, created_at desc)
  where resolved_at is null;

-- Denormalized verification timestamp for cheap gating checks.
alter table public.profiles add column if not exists identity_verified_at timestamptz;

-- 3. Triggers ------------------------------------------------------------------

drop trigger if exists identity_verifications_updated_at on public.identity_verifications;
create trigger identity_verifications_updated_at before update on public.identity_verifications
  for each row execute function public.set_updated_at();

-- 4. Finalization function (SECURITY DEFINER) -----------------------------------
-- The verification result is written through this function so that:
--   * users cannot update identity_verifications rows directly (no UPDATE policy)
--   * duplicate identity detection can look across users
--   * profile denormalization and event logging happen atomically

create or replace function public.finalize_identity_verification(
  p_verification_id uuid,
  p_status public.identity_verification_status,
  p_birth_date date default null,
  p_age_verified boolean default null,
  p_pin_hash text default null,
  p_full_name text default null,
  p_failure_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.identity_verifications%rowtype;
  v_duplicate_user uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_status not in ('verified', 'failed', 'expired', 'cancelled') then
    raise exception 'invalid target status';
  end if;

  select * into v_row
  from public.identity_verifications
  where id = p_verification_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'verification not found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'verification is not pending';
  end if;

  update public.identity_verifications
  set status = p_status,
      verified_at = case when p_status = 'verified' then now() else null end,
      birth_date = coalesce(p_birth_date, birth_date),
      age_verified = coalesce(p_age_verified, age_verified),
      personal_identity_number_hash = coalesce(p_pin_hash, personal_identity_number_hash),
      full_name_from_provider = coalesce(p_full_name, full_name_from_provider),
      failure_reason = p_failure_reason,
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb)
  where id = p_verification_id;

  insert into public.identity_verification_events (verification_id, user_id, event_type, payload)
  values (
    p_verification_id,
    auth.uid(),
    'finalized_' || p_status::text,
    jsonb_build_object('age_verified', p_age_verified, 'failure_reason', p_failure_reason)
  );

  if p_status = 'verified' then
    update public.profiles
    set identity_verified_at = now(),
        updated_at = now()
    where id = auth.uid();

    -- Duplicate identity detection: same personal identity number verified on
    -- another account.
    if p_pin_hash is not null then
      select iv.user_id into v_duplicate_user
      from public.identity_verifications iv
      where iv.personal_identity_number_hash = p_pin_hash
        and iv.status = 'verified'
        and iv.user_id <> auth.uid()
      limit 1;

      if v_duplicate_user is not null then
        insert into public.user_risk_flags (user_id, flag_type, severity, note, metadata)
        values
          (
            auth.uid(),
            'duplicate_identity',
            'high',
            'Samma identitet är verifierad på ett annat konto.',
            jsonb_build_object('other_user_id', v_duplicate_user, 'verification_id', p_verification_id)
          ),
          (
            v_duplicate_user,
            'duplicate_identity',
            'high',
            'Samma identitet är verifierad på ett annat konto.',
            jsonb_build_object('other_user_id', auth.uid(), 'verification_id', p_verification_id)
          );
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'id', p_verification_id,
    'status', p_status,
    'duplicate_detected', v_duplicate_user is not null
  );
end;
$$;

-- Admin overview without exposing identity hash or birth date.
create or replace function public.admin_identity_overview()
returns table(
  id uuid,
  user_id uuid,
  provider text,
  status public.identity_verification_status,
  age_verified boolean,
  failure_reason text,
  created_at timestamptz,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select iv.id, iv.user_id, iv.provider, iv.status, iv.age_verified, iv.failure_reason, iv.created_at, iv.verified_at
  from public.identity_verifications iv
  order by iv.created_at desc
  limit 500;
end;
$$;

-- 5. RLS -------------------------------------------------------------------------

alter table public.identity_verifications enable row level security;
alter table public.identity_verification_events enable row level security;
alter table public.user_consents enable row level security;
alter table public.user_risk_flags enable row level security;

-- identity_verifications: users see own rows; super admins see all (regular
-- admins use admin_identity_overview() which excludes sensitive columns).
-- No UPDATE/DELETE policies: state changes only via finalize function.
drop policy if exists "users read own identity verifications" on public.identity_verifications;
create policy "users read own identity verifications" on public.identity_verifications
  for select using (auth.uid() = user_id);
drop policy if exists "users start own identity verification" on public.identity_verifications;
create policy "users start own identity verification" on public.identity_verifications
  for insert with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "super admins read all identity verifications" on public.identity_verifications;
create policy "super admins read all identity verifications" on public.identity_verifications
  for select using (public.current_user_is_super_admin());

-- identity_verification_events: append-only audit trail.
drop policy if exists "users read own identity events" on public.identity_verification_events;
create policy "users read own identity events" on public.identity_verification_events
  for select using (auth.uid() = user_id);
drop policy if exists "users insert own identity events" on public.identity_verification_events;
create policy "users insert own identity events" on public.identity_verification_events
  for insert with check (auth.uid() = user_id);
drop policy if exists "admins read all identity events" on public.identity_verification_events;
create policy "admins read all identity events" on public.identity_verification_events
  for select using (public.current_user_is_admin());

-- user_consents: users manage own consents (insert/read + revoke via update).
drop policy if exists "users read own consents" on public.user_consents;
create policy "users read own consents" on public.user_consents
  for select using (auth.uid() = user_id);
drop policy if exists "users insert own consents" on public.user_consents;
create policy "users insert own consents" on public.user_consents
  for insert with check (auth.uid() = user_id);
drop policy if exists "users revoke own consents" on public.user_consents;
create policy "users revoke own consents" on public.user_consents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admins read all consents" on public.user_consents;
create policy "admins read all consents" on public.user_consents
  for select using (public.current_user_is_admin());

-- user_risk_flags: internal only — users cannot see their own risk flags.
drop policy if exists "admins read risk flags" on public.user_risk_flags;
create policy "admins read risk flags" on public.user_risk_flags
  for select using (public.current_user_is_admin());
drop policy if exists "admins insert risk flags" on public.user_risk_flags;
create policy "admins insert risk flags" on public.user_risk_flags
  for insert with check (public.current_user_is_admin());
drop policy if exists "admins resolve risk flags" on public.user_risk_flags;
create policy "admins resolve risk flags" on public.user_risk_flags
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- 6. Stop storing plaintext personal identity numbers ----------------------------
-- The signup trigger no longer writes personal_identity_number. Existing
-- plaintext values are cleared: verified identity now lives in
-- identity_verifications as a hash. (Data minimization, GDPR.)

create or replace function public.handle_bovaro_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  meta jsonb;
  account_type_value text;
  first_name_value text;
  last_name_value text;
  phone_value text;
  city_value text;
  preferred_intent_value text;
  terms_version_value text;
  privacy_version_value text;
  advertiser_terms_version_value text;
  company_id_value uuid;
  company_name_value text;
  company_slug_value text;
  organization_number_value text;
  company_email_value text;
  company_phone_value text;
  company_legal_form_value text;
  company_business_purpose_value text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  account_type_value := coalesce(nullif(meta->>'account_type', ''), 'private');
  first_name_value := nullif(meta->>'first_name', '');
  last_name_value := nullif(meta->>'last_name', '');
  phone_value := nullif(meta->>'phone', '');
  city_value := nullif(meta->>'city', '');
  preferred_intent_value := coalesce(nullif(meta->>'preferred_listing_intent', ''), 'both');
  terms_version_value := coalesce(nullif(meta->>'terms_version', ''), '2026-05-09');
  privacy_version_value := coalesce(nullif(meta->>'privacy_version', ''), '2026-05-09');
  advertiser_terms_version_value := coalesce(nullif(meta->>'advertiser_terms_version', ''), '2026-05-09');

  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone,
    role,
    city,
    account_type,
    preferred_listing_intent,
    terms_accepted_at,
    privacy_accepted_at,
    marketing_consent,
    onboarding_completed
  )
  values (
    new.id,
    first_name_value,
    last_name_value,
    phone_value,
    case when account_type_value = 'company' then 'company_admin'::public.app_role else 'seeker'::public.app_role end,
    city_value,
    account_type_value,
    preferred_intent_value,
    case when coalesce((meta->>'terms_accepted')::boolean, false) then now() else null end,
    case when coalesce((meta->>'privacy_accepted')::boolean, false) then now() else null end,
    coalesce((meta->>'marketing_consent')::boolean, false),
    false
  )
  on conflict (id) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      role = excluded.role,
      city = excluded.city,
      account_type = excluded.account_type,
      preferred_listing_intent = excluded.preferred_listing_intent,
      terms_accepted_at = excluded.terms_accepted_at,
      privacy_accepted_at = excluded.privacy_accepted_at,
      marketing_consent = excluded.marketing_consent,
      updated_at = now();

  insert into public.legal_acceptances (user_id, document_type, document_version, metadata)
  values
    (new.id, 'terms', terms_version_value, jsonb_build_object('source', 'register')),
    (new.id, 'privacy', privacy_version_value, jsonb_build_object('source', 'register'))
  on conflict (user_id, document_type, document_version) do nothing;

  if account_type_value = 'company' then
    company_name_value := coalesce(nullif(meta->>'company_name', ''), concat('Företag ', left(new.id::text, 8)));
    company_slug_value := coalesce(nullif(meta->>'company_slug', ''), concat('foretag-', left(new.id::text, 8)));
    organization_number_value := nullif(meta->>'organization_number', '');
    company_email_value := coalesce(nullif(meta->>'company_email', ''), new.email);
    company_phone_value := coalesce(nullif(meta->>'company_phone', ''), phone_value);
    company_legal_form_value := coalesce(nullif(meta->>'company_legal_form', ''), 'ab');
    company_business_purpose_value := coalesce(nullif(meta->>'company_business_purpose', ''), 'rent_and_sale');

    insert into public.companies (
      name,
      slug,
      company_type,
      organization_number,
      org_number,
      phone,
      email,
      city,
      legal_form,
      business_purpose,
      verification_status,
      created_by
    )
    values (
      company_name_value,
      company_slug_value,
      'landlord_company',
      organization_number_value,
      organization_number_value,
      company_phone_value,
      company_email_value,
      city_value,
      company_legal_form_value,
      company_business_purpose_value,
      'pending',
      new.id
    )
    on conflict (slug) do update
    set name = excluded.name,
        organization_number = excluded.organization_number,
        org_number = excluded.org_number,
        phone = excluded.phone,
        email = excluded.email,
        city = excluded.city,
        legal_form = excluded.legal_form,
        business_purpose = excluded.business_purpose,
        updated_at = now()
    returning id into company_id_value;

    if company_id_value is not null then
      insert into public.company_members (company_id, user_id, role, title)
      values (company_id_value, new.id, 'company_admin', 'Kontaktperson')
      on conflict (company_id, user_id) do update
      set role = excluded.role,
          title = excluded.title;
    end if;

    insert into public.legal_acceptances (user_id, document_type, document_version, metadata)
    values
      (new.id, 'advertiser_terms', advertiser_terms_version_value, jsonb_build_object('source', 'register')),
      (new.id, 'company_representative_confirmation', advertiser_terms_version_value, jsonb_build_object('source', 'register'))
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

  return new;
end;
$$;

-- Clear historical plaintext personal identity numbers.
update public.profiles
set personal_identity_number = null
where personal_identity_number is not null;
