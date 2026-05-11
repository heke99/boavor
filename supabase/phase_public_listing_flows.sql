-- Bovaro public listing flows
-- Safe schema repair for public listing details, inquiries and rental applications.
-- Run after listings, dashboard and permissions phases.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Rental application columns used by the public apply flow
-- =========================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'rental_applications'
  ) then
    execute 'alter table public.rental_applications add column if not exists user_id uuid references auth.users(id) on delete cascade';
    execute 'alter table public.rental_applications add column if not exists listing_id uuid references public.listings(id) on delete set null';
    execute 'alter table public.rental_applications add column if not exists landlord_user_id uuid references auth.users(id) on delete set null';
    execute 'alter table public.rental_applications add column if not exists landlord_company_id uuid references public.companies(id) on delete set null';
    execute 'alter table public.rental_applications add column if not exists listing_slug text';
    execute 'alter table public.rental_applications add column if not exists listing_title text';
    execute 'alter table public.rental_applications add column if not exists listing_city text';
    execute 'alter table public.rental_applications add column if not exists listing_type public.listing_type not null default ''rent''';
    execute 'alter table public.rental_applications add column if not exists listing_price integer not null default 0';
    execute 'alter table public.rental_applications add column if not exists listing_image_url text';
    execute 'alter table public.rental_applications add column if not exists applicant_full_name text';
    execute 'alter table public.rental_applications add column if not exists applicant_email text';
    execute 'alter table public.rental_applications add column if not exists applicant_phone text';
    execute 'alter table public.rental_applications add column if not exists applicant_monthly_income integer';
    execute 'alter table public.rental_applications add column if not exists applicant_household_size integer';
    execute 'alter table public.rental_applications add column if not exists queue_points_snapshot integer not null default 0';
    execute 'alter table public.rental_applications add column if not exists queue_joined_at_snapshot timestamptz';
    execute 'alter table public.rental_applications add column if not exists cover_letter text';
    execute 'alter table public.rental_applications add column if not exists move_in_date date';
    execute 'alter table public.rental_applications add column if not exists monthly_income numeric';
    execute 'alter table public.rental_applications add column if not exists employment_type text';
    execute 'alter table public.rental_applications add column if not exists household_size integer';
    execute 'alter table public.rental_applications add column if not exists pets boolean not null default false';
    execute 'alter table public.rental_applications add column if not exists smoking boolean not null default false';
    execute 'alter table public.rental_applications add column if not exists internal_note text';
    execute 'alter table public.rental_applications add column if not exists status_updated_at timestamptz';
    execute 'alter table public.rental_applications add column if not exists applicant_snapshot jsonb';
    execute 'alter table public.rental_applications add column if not exists updated_at timestamptz not null default now()';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rental_applications'
        and column_name = 'applicant_user_id'
    ) then
      execute 'alter table public.rental_applications alter column applicant_user_id drop not null';
    end if;

    execute 'create index if not exists rental_applications_user_id_idx on public.rental_applications(user_id)';
    execute 'create index if not exists rental_applications_listing_id_idx on public.rental_applications(listing_id)';
    execute 'create index if not exists rental_applications_landlord_user_id_idx on public.rental_applications(landlord_user_id)';
    execute 'create index if not exists rental_applications_landlord_company_id_idx on public.rental_applications(landlord_company_id)';
    execute 'create index if not exists rental_applications_status_idx on public.rental_applications(status)';
    execute 'create index if not exists rental_applications_created_at_idx on public.rental_applications(created_at desc)';
  end if;
end
$$;

-- =========================================================
-- 2. Application child tables used when applicant selects documents/co-applicants
-- =========================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
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
-- 3. Public inquiry columns used by commercial/sale object forms
-- =========================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'listing_inquiries'
  ) then
    execute 'alter table public.listing_inquiries add column if not exists listing_id uuid references public.listings(id) on delete set null';
    execute 'alter table public.listing_inquiries add column if not exists user_id uuid references auth.users(id) on delete set null';
    execute 'alter table public.listing_inquiries add column if not exists landlord_user_id uuid references auth.users(id) on delete set null';
    execute 'alter table public.listing_inquiries add column if not exists landlord_company_id uuid references public.companies(id) on delete set null';
    execute 'alter table public.listing_inquiries add column if not exists listing_slug text';
    execute 'alter table public.listing_inquiries add column if not exists listing_title text';
    execute 'alter table public.listing_inquiries add column if not exists listing_city text';
    execute 'alter table public.listing_inquiries add column if not exists listing_type public.listing_type not null default ''rent''';
    execute 'alter table public.listing_inquiries add column if not exists listing_segment public.listing_segment not null default ''residential''';
    execute 'alter table public.listing_inquiries add column if not exists listing_price integer not null default 0';
    execute 'alter table public.listing_inquiries add column if not exists requester_full_name text';
    execute 'alter table public.listing_inquiries add column if not exists requester_email text';
    execute 'alter table public.listing_inquiries add column if not exists requester_phone text';
    execute 'alter table public.listing_inquiries add column if not exists requester_company_name text';
    execute 'alter table public.listing_inquiries add column if not exists preferred_contact_method text';
    execute 'alter table public.listing_inquiries add column if not exists message text';
    execute 'alter table public.listing_inquiries add column if not exists internal_note text';
    execute 'alter table public.listing_inquiries add column if not exists status_updated_at timestamptz';
    execute 'alter table public.listing_inquiries add column if not exists updated_at timestamptz not null default now()';

    execute 'create index if not exists listing_inquiries_listing_id_idx on public.listing_inquiries(listing_id)';
    execute 'create index if not exists listing_inquiries_user_id_idx on public.listing_inquiries(user_id)';
    execute 'create index if not exists listing_inquiries_landlord_user_id_idx on public.listing_inquiries(landlord_user_id)';
    execute 'create index if not exists listing_inquiries_landlord_company_id_idx on public.listing_inquiries(landlord_company_id)';
    execute 'create index if not exists listing_inquiries_status_idx on public.listing_inquiries(status)';
    execute 'create index if not exists listing_inquiries_created_at_idx on public.listing_inquiries(created_at desc)';
  end if;
end
$$;

-- =========================================================
-- 4. RLS policies for public flow tables
-- =========================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rental_applications') then
    alter table public.rental_applications enable row level security;
    execute 'drop policy if exists "users can create own rental applications" on public.rental_applications';
    execute 'create policy "users can create own rental applications" on public.rental_applications for insert with check (auth.uid() = user_id)';
    execute 'drop policy if exists "users can read own rental applications" on public.rental_applications';
    execute 'create policy "users can read own rental applications" on public.rental_applications for select using (auth.uid() = user_id or public.current_user_is_admin())';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_inquiries') then
    alter table public.listing_inquiries enable row level security;
    execute 'drop policy if exists "users can create listing inquiries" on public.listing_inquiries';
    execute 'create policy "users can create listing inquiries" on public.listing_inquiries for insert with check (auth.uid() = user_id or user_id is null)';
    execute 'drop policy if exists "users can read own listing inquiries" on public.listing_inquiries';
    execute 'create policy "users can read own listing inquiries" on public.listing_inquiries for select using (auth.uid() = user_id or public.current_user_is_admin())';
  end if;
end
$$;
