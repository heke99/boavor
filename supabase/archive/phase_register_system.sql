-- Register system: private + company accounts
-- Run after schema.sql, phase4_profile_queue.sql and phase10_12_13.sql

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists account_type text not null default 'private',
  add column if not exists personal_identity_number text,
  add column if not exists preferred_listing_intent text not null default 'both',
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists personal_identity_consent_at timestamptz,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.companies
  add column if not exists organization_number text,
  add column if not exists legal_form text not null default 'ab',
  add column if not exists business_purpose text not null default 'rent_and_sale',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists website text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Backwards compatibility with older schema that used org_number.
update public.companies
set organization_number = coalesce(organization_number, org_number)
where organization_number is null
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'org_number'
  );

alter table public.company_members
  add column if not exists title text;

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  unique (user_id, document_type, document_version)
);

create index if not exists legal_acceptances_user_id_idx
  on public.legal_acceptances(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

alter table public.legal_acceptances enable row level security;

drop policy if exists "users can read own legal acceptances" on public.legal_acceptances;
create policy "users can read own legal acceptances"
on public.legal_acceptances
for select
using (auth.uid() = user_id);

drop policy if exists "users can insert own legal acceptances" on public.legal_acceptances;
create policy "users can insert own legal acceptances"
on public.legal_acceptances
for insert
with check (auth.uid() = user_id);

-- Make profile/company inserts work when a signed-in user completes onboarding manually too.
drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "users can create companies" on public.companies;
create policy "users can create companies"
on public.companies
for insert
with check (auth.uid() = created_by);

drop policy if exists "company creators can update companies" on public.companies;
create policy "company creators can update companies"
on public.companies
for update
using (
  auth.uid() = created_by
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = companies.id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = created_by
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = companies.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own company memberships" on public.company_members;
create policy "users can insert own company memberships"
on public.company_members
for insert
with check (auth.uid() = user_id);

-- Avoid recursive company policies. Keep company_members readable by the member only.
drop policy if exists "company members can read company_members" on public.company_members;
create policy "company members can read company_members"
on public.company_members
for select
using (auth.uid() = user_id);

-- Security definer signup provisioner.
create or replace function public.handle_bovaro_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
    personal_identity_number,
    preferred_listing_intent,
    terms_accepted_at,
    privacy_accepted_at,
    personal_identity_consent_at,
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
    case when account_type_value = 'private' then nullif(meta->>'personal_identity_number', '') else null end,
    preferred_intent_value,
    case when coalesce((meta->>'terms_accepted')::boolean, false) then now() else null end,
    case when coalesce((meta->>'privacy_accepted')::boolean, false) then now() else null end,
    case when account_type_value = 'private' and coalesce((meta->>'personal_identity_consent')::boolean, false) then now() else null end,
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
      personal_identity_number = excluded.personal_identity_number,
      preferred_listing_intent = excluded.preferred_listing_intent,
      terms_accepted_at = excluded.terms_accepted_at,
      privacy_accepted_at = excluded.privacy_accepted_at,
      personal_identity_consent_at = excluded.personal_identity_consent_at,
      marketing_consent = excluded.marketing_consent,
      updated_at = now();

  insert into public.legal_acceptances (user_id, document_type, document_version, metadata)
  values
    (new.id, 'terms', terms_version_value, jsonb_build_object('source', 'register')),
    (new.id, 'privacy', privacy_version_value, jsonb_build_object('source', 'register'))
  on conflict (user_id, document_type, document_version) do nothing;

  if account_type_value = 'private' and coalesce((meta->>'personal_identity_consent')::boolean, false) then
    insert into public.legal_acceptances (user_id, document_type, document_version, metadata)
    values (new.id, 'personal_identity_consent', privacy_version_value, jsonb_build_object('source', 'register'))
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

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

drop trigger if exists on_auth_user_created_bovaro_register on auth.users;
create trigger on_auth_user_created_bovaro_register
after insert on auth.users
for each row execute procedure public.handle_bovaro_new_user();
