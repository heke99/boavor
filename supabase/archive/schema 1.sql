-- Bovaro schema through phase 3
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum (
    'seeker',
    'buyer',
    'landlord',
    'broker',
    'company_admin',
    'admin',
    'super_admin'
  );
exception when duplicate_object then null;
end $$;

do $$ begin create type public.listing_type as enum ('rent', 'sale'); exception when duplicate_object then null; end $$;
do $$ begin create type public.property_type as enum ('apartment', 'house', 'property'); exception when duplicate_object then null; end $$;
do $$ begin create type public.listing_status as enum ('draft', 'published', 'paused', 'rented', 'sold', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.saved_search_mode as enum ('rent', 'sale', 'all'); exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rental_application_status as enum (
    'draft',
    'submitted',
    'received',
    'reviewing',
    'qualified',
    'reserve',
    'viewing',
    'offered',
    'rejected',
    'signed'
  );
exception when duplicate_object then null;
end $$;
do $$ begin create type public.sale_lead_status as enum ('new', 'contacted', 'viewing_booked', 'follow_up', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.viewing_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.viewing_type as enum ('rental', 'sale'); exception when duplicate_object then null; end $$;

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

create table if not exists public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  status public.rental_application_status not null default 'submitted',
  message text,
  household_size integer,
  monthly_income integer,
  employment_status text,
  employer_name text,
  desired_move_in date,
  has_pets boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, applicant_user_id)
);

create table if not exists public.sale_leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  message text,
  status public.sale_lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viewings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  rental_application_id uuid references public.rental_applications(id) on delete set null,
  sale_lead_id uuid references public.sale_leads(id) on delete set null,
  scheduled_at timestamptz not null,
  location_note text,
  status public.viewing_status not null default 'scheduled',
  viewing_type public.viewing_type not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viewings_one_flow_check check (
    (viewing_type = 'rental' and rental_application_id is not null and sale_lead_id is null)
    or (viewing_type = 'sale' and sale_lead_id is not null and rental_application_id is null)
  )
);

create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_type_city on public.listings(listing_type, city);
create index if not exists idx_listings_company_id on public.listings(company_id);
create index if not exists idx_listing_images_listing_id on public.listing_images(listing_id);
create index if not exists idx_listing_features_listing_id on public.listing_features(listing_id);
create index if not exists idx_listing_documents_listing_id on public.listing_documents(listing_id);
create index if not exists idx_company_members_user_id on public.company_members(user_id);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_saved_searches_user_id on public.saved_searches(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_rental_applications_listing_id on public.rental_applications(listing_id);
create index if not exists idx_rental_applications_applicant_user_id on public.rental_applications(applicant_user_id);
create index if not exists idx_sale_leads_listing_id on public.sale_leads(listing_id);
create index if not exists idx_viewings_listing_id on public.viewings(listing_id);

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
exception
  when others then
    insert into public.profiles (id, first_name, last_name, role)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name', ''), coalesce(new.raw_user_meta_data ->> 'last_name', ''), 'seeker')
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
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings for each row execute procedure public.set_updated_at();

drop trigger if exists rental_requirements_updated_at on public.rental_requirements;
create trigger rental_requirements_updated_at before update on public.rental_requirements for each row execute procedure public.set_updated_at();

drop trigger if exists saved_searches_updated_at on public.saved_searches;
create trigger saved_searches_updated_at before update on public.saved_searches for each row execute procedure public.set_updated_at();

drop trigger if exists rental_applications_updated_at on public.rental_applications;
create trigger rental_applications_updated_at before update on public.rental_applications for each row execute procedure public.set_updated_at();

drop trigger if exists sale_leads_updated_at on public.sale_leads;
create trigger sale_leads_updated_at before update on public.sale_leads for each row execute procedure public.set_updated_at();

drop trigger if exists viewings_updated_at on public.viewings;
create trigger viewings_updated_at before update on public.viewings for each row execute procedure public.set_updated_at();

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
alter table public.rental_applications enable row level security;
alter table public.sale_leads enable row level security;
alter table public.viewings enable row level security;

-- Public read access for published listings and related public content
drop policy if exists "public can read published listings" on public.listings;
create policy "public can read published listings"
on public.listings for select
using (status = 'published');

drop policy if exists "public can read images for published listings" on public.listing_images;
create policy "public can read images for published listings"
on public.listing_images for select
using (
  exists (
    select 1 from public.listings
    where public.listings.id = listing_images.listing_id and public.listings.status = 'published'
  )
);

drop policy if exists "public can read features for published listings" on public.listing_features;
create policy "public can read features for published listings"
on public.listing_features for select
using (
  exists (
    select 1 from public.listings
    where public.listings.id = listing_features.listing_id and public.listings.status = 'published'
  )
);

drop policy if exists "public can read documents for published listings" on public.listing_documents;
create policy "public can read documents for published listings"
on public.listing_documents for select
using (
  exists (
    select 1 from public.listings
    where public.listings.id = listing_documents.listing_id and public.listings.status = 'published'
  )
);

drop policy if exists "public can read rental requirements for published listings" on public.rental_requirements;
create policy "public can read rental requirements for published listings"
on public.rental_requirements for select
using (
  exists (
    select 1 from public.listings
    where public.listings.id = rental_requirements.listing_id and public.listings.status = 'published'
  )
);

-- Own profile
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id);

-- Favorites and saved searches
drop policy if exists "users can manage own favorites" on public.favorites;
create policy "users can manage own favorites"
on public.favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can manage own saved searches" on public.saved_searches;
create policy "users can manage own saved searches"
on public.saved_searches for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id);

-- Company visibility
drop policy if exists "company members can read companies" on public.companies;
create policy "company members can read companies"
on public.companies for select
using (
  exists (
    select 1 from public.company_members
    where public.company_members.company_id = companies.id and public.company_members.user_id = auth.uid()
  )
);

drop policy if exists "company members can read company_members" on public.company_members;
create policy "company members can read company_members"
on public.company_members for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.company_members as cm
    where cm.company_id = company_members.company_id and cm.user_id = auth.uid()
  )
);

-- Listing management by creator or company member
drop policy if exists "authorized users can create listings" on public.listings;
create policy "authorized users can create listings"
on public.listings for insert
with check (
  auth.uid() = created_by
  or (
    company_id is not null and exists (
      select 1 from public.company_members
      where public.company_members.company_id = listings.company_id and public.company_members.user_id = auth.uid()
    )
  )
);

drop policy if exists "users can read own draft listings" on public.listings;
create policy "users can read own draft listings"
on public.listings for select
using (
  status = 'published'
  or auth.uid() = created_by
  or exists (
    select 1 from public.company_members
    where public.company_members.company_id = listings.company_id and public.company_members.user_id = auth.uid()
  )
);

drop policy if exists "users can update own or company listings" on public.listings;
create policy "users can update own or company listings"
on public.listings for update
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.company_members
    where public.company_members.company_id = listings.company_id and public.company_members.user_id = auth.uid()
  )
);

drop policy if exists "users can manage own or company listing images" on public.listing_images;
create policy "users can manage own or company listing images"
on public.listing_images for all
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

drop policy if exists "users can manage own or company listing features" on public.listing_features;
create policy "users can manage own or company listing features"
on public.listing_features for all
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

drop policy if exists "users can manage own or company listing documents" on public.listing_documents;
create policy "users can manage own or company listing documents"
on public.listing_documents for all
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

drop policy if exists "users can manage own or company rental requirements" on public.rental_requirements;
create policy "users can manage own or company rental requirements"
on public.rental_requirements for all
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

drop policy if exists "users can create own rental applications" on public.rental_applications;
create policy "users can create own rental applications"
on public.rental_applications for insert
with check (auth.uid() = applicant_user_id);

drop policy if exists "users can read own rental applications" on public.rental_applications;
create policy "users can read own rental applications"
on public.rental_applications for select
using (
  auth.uid() = applicant_user_id
  or exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = rental_applications.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

drop policy if exists "authorized users can update rental applications" on public.rental_applications;
create policy "authorized users can update rental applications"
on public.rental_applications for update
using (
  auth.uid() = applicant_user_id
  or exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = rental_applications.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

drop policy if exists "public can create sale leads" on public.sale_leads;
create policy "public can create sale leads"
on public.sale_leads for insert
with check (true);

drop policy if exists "authorized users can read sale leads" on public.sale_leads;
create policy "authorized users can read sale leads"
on public.sale_leads for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = sale_leads.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

drop policy if exists "authorized users can update sale leads" on public.sale_leads;
create policy "authorized users can update sale leads"
on public.sale_leads for update
using (
  exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = sale_leads.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

drop policy if exists "authorized users can read viewings" on public.viewings;
create policy "authorized users can read viewings"
on public.viewings for select
using (
  exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = viewings.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
  or exists (
    select 1 from public.rental_applications
    where public.rental_applications.id = viewings.rental_application_id
      and public.rental_applications.applicant_user_id = auth.uid()
  )
  or exists (
    select 1 from public.sale_leads
    where public.sale_leads.id = viewings.sale_lead_id and public.sale_leads.user_id = auth.uid()
  )
);

drop policy if exists "authorized users can create viewings" on public.viewings;
create policy "authorized users can create viewings"
on public.viewings for insert
with check (
  exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = viewings.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

drop policy if exists "authorized users can update viewings" on public.viewings;
create policy "authorized users can update viewings"
on public.viewings for update
using (
  exists (
    select 1 from public.listings
    left join public.company_members on company_members.company_id = listings.company_id
    where listings.id = viewings.listing_id
      and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
  )
);

-- Seed demo data for phase 3
insert into public.companies (id, name, slug, company_type, city)
values
  ('11111111-1111-1111-1111-111111111111', 'Bovaro Homes', 'bovaro-homes', 'landlord', 'Stockholm')
on conflict (id) do nothing;

insert into public.listings (
  id, company_id, title, slug, description, listing_type, property_type, status, street, city, zip_code, country, area_name, price, monthly_fee, area_sqm, rooms, floor, build_year, available_from, is_verified, published_at
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Ljus 2:a nära vattnet', 'strandkajen-12-stockholm', 'Premium hyresobjekt i citynära läge med luftig planlösning och starkt pendlingsläge.', 'rent', 'apartment', 'published', 'Strandkajen 12', 'Stockholm', '112 45', 'Sweden', 'Kungsholmen', 14850, null, 58, 2, '3/6', 2017, '2026-06-01', true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'Renoverad 3:a med öppen planlösning', 'parkallén-4-goteborg', 'Modern bostad till salu med renoverat kök, ljusa materialval och attraktiv citynärhet.', 'sale', 'apartment', 'published', 'Parkallén 4', 'Göteborg', '411 36', 'Sweden', 'Linné', 3795000, 3250, 76, 3, '2/5', 1938, null, true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 'Familjevilla med stor trädgård', 'ekliden-9-malmo', 'Rymlig villa i lugnt område med stor trädgård, garage och sociala ytor för familjeliv.', 'sale', 'house', 'published', 'Ekliden 9', 'Malmö', '217 64', 'Sweden', 'Limhamn', 6495000, null, 162, 6, null, 2009, null, true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '11111111-1111-1111-1111-111111111111', 'Central hyresrätt med snabb inflytt', 'stationsgatan-18-uppsala', 'Smart planerad etta i centralt läge med snabb inflytt och nära till pendling.', 'rent', 'apartment', 'published', 'Stationsgatan 18', 'Uppsala', '753 40', 'Sweden', 'Centrum', 11200, null, 39, 1, '5/7', 2020, '2026-05-15', true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '11111111-1111-1111-1111-111111111111', 'Modern 4:a med havsutsikt', 'sodra-hamnen-22-helsingborg', 'Premiumlägenhet till salu med havsutsikt, stora fönster och generösa sociala ytor.', 'sale', 'apartment', 'published', 'Södra Hamnen 22', 'Helsingborg', '252 67', 'Sweden', 'Södra Hamnen', 5295000, 4180, 103, 4, '6/8', 2021, null, true, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', '11111111-1111-1111-1111-111111111111', 'Välplanerad 2:a i lugnt område', 'solrosvagen-3-linkoping', 'Stilren hyreslägenhet med lugnt läge, bra ljusinsläpp och hög vardagskomfort.', 'rent', 'apartment', 'published', 'Solrosvägen 3', 'Linköping', '583 30', 'Sweden', 'Vallastaden', 9950, null, 54, 2, '2/4', 2022, '2026-06-15', true, now())
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  listing_type = excluded.listing_type,
  property_type = excluded.property_type,
  status = excluded.status,
  street = excluded.street,
  city = excluded.city,
  zip_code = excluded.zip_code,
  country = excluded.country,
  area_name = excluded.area_name,
  price = excluded.price,
  monthly_fee = excluded.monthly_fee,
  area_sqm = excluded.area_sqm,
  rooms = excluded.rooms,
  floor = excluded.floor,
  build_year = excluded.build_year,
  available_from = excluded.available_from,
  is_verified = excluded.is_verified,
  published_at = excluded.published_at;

insert into public.listing_images (listing_id, image_url, alt_text, position, is_cover)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 'Ljus lägenhet', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80', 'Modern lägenhet', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', 'Familjevilla', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80', 'Central hyresrätt', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80', 'Havsutsikt', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Välplanerad tvåa', 0, true)
on conflict do nothing;

insert into public.listing_features (listing_id, feature_key, feature_label)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'balcony', 'Balkong'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'elevator', 'Hiss'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'washer', 'Tvättmaskin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'storage', 'Förråd'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bathroom', 'Helkaklat badrum'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'open_plan', 'Öppen planlösning'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'garden', 'Trädgård'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'garage', 'Garage'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'patio', 'Uteplats'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'commute', 'Nära pendling'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'renovated', 'Nyrenoverad'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'fiber', 'Fiber'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'sea_view', 'Havsutsikt'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'balcony', 'Balkong'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'garage', 'Garageplats'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'dishwasher', 'Diskmaskin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'balcony', 'Balkong'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'storage', 'Förråd')
on conflict do nothing;

insert into public.rental_requirements (listing_id, min_income, pets_allowed, smoking_allowed, references_required, employment_required)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 36000, true, false, true, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 28000, false, false, false, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 30000, true, false, true, true)
on conflict (listing_id) do update set
  min_income = excluded.min_income,
  pets_allowed = excluded.pets_allowed,
  smoking_allowed = excluded.smoking_allowed,
  references_required = excluded.references_required,
  employment_required = excluded.employment_required;
