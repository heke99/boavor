-- Bovaro schema up to phase 9
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'seeker',
  'buyer',
  'landlord',
  'broker',
  'company_admin',
  'admin',
  'super_admin'
);

create type public.listing_type as enum ('rent', 'sale');
create type public.property_type as enum ('apartment', 'house', 'property');
create type public.listing_status as enum ('draft', 'published', 'paused', 'rented', 'sold', 'archived');
create type public.saved_search_mode as enum ('rent', 'sale', 'all');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  role public.app_role not null default 'seeker',
  city text,
  household_size integer,
  has_pets boolean not null default false,
  employment_status text,
  employer_name text,
  monthly_income integer,
  desired_move_in date,
  desired_locations text[] default '{}',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  company_type text not null default 'landlord',
  org_number text,
  phone text,
  email text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'company_admin',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  listing_type public.listing_type not null,
  property_type public.property_type not null,
  status public.listing_status not null default 'draft',
  street text,
  city text not null,
  zip_code text,
  country text not null default 'Sweden',
  area_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  price integer not null default 0,
  monthly_fee integer,
  area_sqm numeric(8, 2),
  rooms numeric(4, 1),
  floor text,
  build_year integer,
  available_from date,
  is_verified boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  alt_text text,
  position integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_features (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  feature_key text not null,
  feature_label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  document_type text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.rental_requirements (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  min_income integer,
  pets_allowed boolean not null default true,
  smoking_allowed boolean not null default false,
  references_required boolean not null default false,
  employment_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mode public.saved_search_mode not null default 'all',
  city text,
  property_type public.property_type,
  min_rooms numeric(4, 1),
  max_price integer,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'seeker')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at
before update on public.listings
for each row execute procedure public.set_updated_at();

drop trigger if exists rental_requirements_updated_at on public.rental_requirements;
create trigger rental_requirements_updated_at
before update on public.rental_requirements
for each row execute procedure public.set_updated_at();

drop trigger if exists saved_searches_updated_at on public.saved_searches;
create trigger saved_searches_updated_at
before update on public.saved_searches
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_features enable row level security;
alter table public.listing_documents enable row level security;
alter table public.rental_requirements enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.notifications enable row level security;

-- Public read for published listings and related public content
create policy "public can read published listings"
on public.listings
for select
using (status = 'published');

create policy "public can read images for published listings"
on public.listing_images
for select
using (
  exists (
    select 1
    from public.listings
    where public.listings.id = listing_images.listing_id
      and public.listings.status = 'published'
  )
);

create policy "public can read features for published listings"
on public.listing_features
for select
using (
  exists (
    select 1
    from public.listings
    where public.listings.id = listing_features.listing_id
      and public.listings.status = 'published'
  )
);

create policy "public can read documents for published listings"
on public.listing_documents
for select
using (
  exists (
    select 1
    from public.listings
    where public.listings.id = listing_documents.listing_id
      and public.listings.status = 'published'
  )
);

create policy "public can read rental requirements for published listings"
on public.rental_requirements
for select
using (
  exists (
    select 1
    from public.listings
    where public.listings.id = rental_requirements.listing_id
      and public.listings.status = 'published'
  )
);

-- Own profile
create policy "users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Favorites
create policy "users can manage own favorites"
on public.favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Saved searches
create policy "users can manage own saved searches"
on public.saved_searches
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Notifications
create policy "users can read own notifications"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "users can update own notifications"
on public.notifications
for update
using (auth.uid() = user_id);

-- Company visibility
create policy "company members can read companies"
on public.companies
for select
using (
  exists (
    select 1
    from public.company_members
    where public.company_members.company_id = companies.id
      and public.company_members.user_id = auth.uid()
  )
);

create policy "company members can read company_members"
on public.company_members
for select
using (auth.uid() = user_id);

-- Listing management by creator or company member
create policy "authorized users can create listings"
on public.listings
for insert
with check (
  auth.uid() = created_by
  or company_id is not null
);

create policy "users can read own draft listings"
on public.listings
for select
using (
  status = 'published'
  or auth.uid() = created_by
  or exists (
    select 1
    from public.company_members
    where public.company_members.company_id = listings.company_id
      and public.company_members.user_id = auth.uid()
  )
);

create policy "users can update own or company listings"
on public.listings
for update
using (
  auth.uid() = created_by
  or exists (
    select 1
    from public.company_members
    where public.company_members.company_id = listings.company_id
      and public.company_members.user_id = auth.uid()
  )
);

create policy "users can manage own or company listing images"
on public.listing_images
for all
using (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_images.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_images.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

create policy "users can manage own or company listing features"
on public.listing_features
for all
using (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_features.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_features.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

create policy "users can manage own or company listing documents"
on public.listing_documents
for all
using (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_documents.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = listing_documents.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

create policy "users can manage own or company rental requirements"
on public.rental_requirements
for all
using (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = rental_requirements.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = rental_requirements.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

-- Seed demo data
insert into public.companies (id, name, slug, company_type, city)
values
  ('11111111-1111-1111-1111-111111111111', 'Bovaro Homes', 'bovaro-homes', 'landlord', 'Stockholm')
on conflict (id) do nothing;

insert into public.listings (
  id, company_id, title, slug, description, listing_type, property_type, status, city, area_name, price, area_sqm, rooms, available_from, is_verified, published_at
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Ljus 2:a nära vattnet', 'strandkajen-12-stockholm', 'Premium hyresobjekt i citynära läge.', 'rent', 'apartment', 'published', 'Stockholm', 'Kungsholmen', 14850, 58, 2, '2026-06-01', true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'Renoverad 3:a med öppen planlösning', 'parkallén-4-goteborg', 'Modern bostad till salu i attraktivt läge.', 'sale', 'apartment', 'published', 'Göteborg', 'Linné', 3795000, 76, 3, null, true, now())
on conflict (id) do nothing;

insert into public.listing_images (listing_id, image_url, alt_text, position, is_cover)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 'Ljus lägenhet', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80', 'Modern lägenhet', 0, true)
on conflict do nothing;

insert into public.listing_features (listing_id, feature_key, feature_label)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'balcony', 'Balkong'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'elevator', 'Hiss'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'storage', 'Förråd'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bathroom', 'Helkaklat badrum')
on conflict do nothing;
