-- Commercial marketplace phase
-- Adds support for residential, commercial, parking, storage, land and investment listings.
-- Run after previous schema/phase SQL files.

-- Extend existing property_type enum used by listings/saved_searches.
alter type public.property_type add value if not exists 'commercial_space';
alter type public.property_type add value if not exists 'office';
alter type public.property_type add value if not exists 'parking_space';
alter type public.property_type add value if not exists 'garage';
alter type public.property_type add value if not exists 'storage_unit';
alter type public.property_type add value if not exists 'land_plot';
alter type public.property_type add value if not exists 'investment_property';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'listing_segment' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.listing_segment AS ENUM (
      'residential',
      'commercial',
      'parking',
      'storage',
      'land',
      'investment'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'commercial_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.commercial_type AS ENUM (
      'office',
      'retail',
      'restaurant',
      'warehouse',
      'industrial',
      'showroom',
      'clinic',
      'workshop',
      'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'parking_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.parking_type AS ENUM (
      'outdoor',
      'garage',
      'ev_charging',
      'motorcycle',
      'truck',
      'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'storage_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.storage_type AS ENUM (
      'storage_unit',
      'warehouse_box',
      'mini_warehouse',
      'pallet_space',
      'container',
      'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'land_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.land_type AS ENUM (
      'land_plot',
      'industrial_land',
      'agricultural_land',
      'development_land',
      'yard_space',
      'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'investment_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.investment_type AS ENUM (
      'rental_property',
      'commercial_property',
      'mixed_use_property',
      'portfolio',
      'project_property',
      'other'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inquiry_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inquiry_status AS ENUM (
      'new',
      'contacted',
      'viewing_booked',
      'negotiating',
      'closed',
      'rejected'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inquiry_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inquiry_type AS ENUM (
      'interest',
      'viewing',
      'offer_request',
      'contact'
    );
  END IF;
END
$$;

alter table public.listings
  add column if not exists listing_purpose public.listing_type,
  add column if not exists listing_segment public.listing_segment not null default 'residential',
  add column if not exists commercial_type public.commercial_type,
  add column if not exists parking_type public.parking_type,
  add column if not exists storage_type public.storage_type,
  add column if not exists land_type public.land_type,
  add column if not exists investment_type public.investment_type,
  add column if not exists business_purpose text,
  add column if not exists is_vat_applicable boolean not null default false,
  add column if not exists monthly_service_fee integer,
  add column if not exists price_per_sqm integer,
  add column if not exists min_lease_months integer,
  add column if not exists annual_income integer,
  add column if not exists operating_cost integer,
  add column if not exists cap_rate numeric(6, 2);

update public.listings
set listing_purpose = listing_type
where listing_purpose is null;

create index if not exists listings_listing_segment_idx on public.listings(listing_segment);
create index if not exists listings_commercial_type_idx on public.listings(commercial_type);
create index if not exists listings_listing_purpose_idx on public.listings(listing_purpose);

create table if not exists public.listing_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  landlord_user_id uuid references auth.users(id) on delete set null,
  landlord_company_id uuid references public.companies(id) on delete set null,
  listing_slug text not null,
  listing_title text not null,
  listing_city text not null,
  listing_type public.listing_type not null,
  listing_segment public.listing_segment not null,
  listing_price integer not null default 0,
  requester_full_name text not null,
  requester_email text not null,
  requester_phone text,
  requester_company_name text,
  inquiry_type public.inquiry_type not null default 'interest',
  preferred_contact_method text,
  message text,
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_inquiries_listing_id_idx on public.listing_inquiries(listing_id);
create index if not exists listing_inquiries_user_id_idx on public.listing_inquiries(user_id);
create index if not exists listing_inquiries_landlord_user_id_idx on public.listing_inquiries(landlord_user_id);
create index if not exists listing_inquiries_landlord_company_id_idx on public.listing_inquiries(landlord_company_id);
create index if not exists listing_inquiries_status_idx on public.listing_inquiries(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listing_inquiries_updated_at on public.listing_inquiries;
create trigger listing_inquiries_updated_at
before update on public.listing_inquiries
for each row execute procedure public.set_updated_at();

alter table public.listing_inquiries enable row level security;

drop policy if exists "public can create listing inquiries" on public.listing_inquiries;
create policy "public can create listing inquiries"
on public.listing_inquiries
for insert
with check (true);

drop policy if exists "users can read own listing inquiries" on public.listing_inquiries;
create policy "users can read own listing inquiries"
on public.listing_inquiries
for select
using (auth.uid() = user_id);

drop policy if exists "owners can read incoming listing inquiries" on public.listing_inquiries;
create policy "owners can read incoming listing inquiries"
on public.listing_inquiries
for select
using (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = listing_inquiries.landlord_company_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.listings l
    join public.company_members cm on cm.company_id = l.company_id
    where l.id = listing_inquiries.listing_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "owners can update incoming listing inquiries" on public.listing_inquiries;
create policy "owners can update incoming listing inquiries"
on public.listing_inquiries
for update
using (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = listing_inquiries.landlord_company_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.listings l
    join public.company_members cm on cm.company_id = l.company_id
    where l.id = listing_inquiries.listing_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = landlord_user_id
  or exists (
    select 1
    from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.company_id = listing_inquiries.landlord_company_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.listings l
    join public.company_members cm on cm.company_id = l.company_id
    where l.id = listing_inquiries.listing_id
      and cm.user_id = auth.uid()
  )
);
