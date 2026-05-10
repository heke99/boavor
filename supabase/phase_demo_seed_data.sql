-- Bovaro demo/seed data
-- Run after all schema/phase SQL files and after at least one user has registered.
-- This creates real Supabase rows so home, listings, dashboard and admin are not dependent on mock data.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Schema repair for columns the current app expects
-- =========================================================

alter table public.companies
  add column if not exists organization_number text,
  add column if not exists legal_form text not null default 'ab',
  add column if not exists business_purpose text not null default 'rent_and_sale',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists website text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.rental_applications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists listing_id uuid references public.listings(id) on delete set null,
  add column if not exists landlord_user_id uuid references auth.users(id) on delete set null,
  add column if not exists landlord_company_id uuid references public.companies(id) on delete set null,
  add column if not exists listing_slug text,
  add column if not exists listing_title text,
  add column if not exists listing_city text,
  add column if not exists listing_type public.listing_type not null default 'rent',
  add column if not exists listing_price integer not null default 0,
  add column if not exists listing_image_url text,
  add column if not exists applicant_full_name text,
  add column if not exists applicant_email text,
  add column if not exists applicant_phone text,
  add column if not exists applicant_monthly_income integer,
  add column if not exists applicant_household_size integer,
  add column if not exists queue_points_snapshot integer not null default 0,
  add column if not exists queue_joined_at_snapshot timestamptz,
  add column if not exists cover_letter text,
  add column if not exists applicant_snapshot jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Some early schemas used applicant_user_id as a required column. Keep it if present,
-- but do not let it block the app's newer user_id-based insert/query model.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rental_applications'
      and column_name = 'applicant_user_id'
  ) then
    execute 'alter table public.rental_applications alter column applicant_user_id drop not null';
  end if;
end
$$;

create index if not exists rental_applications_user_id_idx on public.rental_applications(user_id);
create index if not exists rental_applications_listing_id_idx on public.rental_applications(listing_id);
create index if not exists rental_applications_landlord_user_id_idx on public.rental_applications(landlord_user_id);
create index if not exists rental_applications_landlord_company_id_idx on public.rental_applications(landlord_company_id);

-- =========================================================
-- 2. Demo data
-- =========================================================

do $$
declare
  seed_owner uuid;
  demo_company_id uuid;
  residential_id uuid;
  office_id uuid;
  parking_id uuid;
  storage_id uuid;
  land_id uuid;
  investment_id uuid;
begin
  select p.id
  into seed_owner
  from public.profiles p
  join auth.users u on u.id = p.id
  order by
    case when p.role = 'super_admin' then 0 when p.role = 'admin' then 1 else 2 end,
    u.created_at asc
  limit 1;

  if seed_owner is null then
    raise exception 'Bovaro seed stoppad: skapa/logga in minst en användare först så det finns auth.users/profiles att koppla demo-data till.';
  end if;

  insert into public.companies (
    name, slug, company_type, org_number, organization_number, phone, email, city,
    legal_form, business_purpose, verification_status, website, created_by
  )
  values (
    'Bovaro Demo Properties AB', 'bovaro-demo-properties', 'landlord', '559999-0001',
    '559999-0001', '010-555 44 33', 'demo@bovaro.se', 'Stockholm',
    'ab', 'rent_and_sale', 'verified', 'https://bovaro.se', seed_owner
  )
  on conflict (slug) do update set
    name = excluded.name,
    company_type = excluded.company_type,
    org_number = excluded.org_number,
    organization_number = excluded.organization_number,
    phone = excluded.phone,
    email = excluded.email,
    city = excluded.city,
    legal_form = excluded.legal_form,
    business_purpose = excluded.business_purpose,
    verification_status = excluded.verification_status,
    website = excluded.website,
    created_by = excluded.created_by
  returning id into demo_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (demo_company_id, seed_owner, 'company_admin')
  on conflict (company_id, user_id) do update set role = excluded.role;

  delete from public.listing_inquiries
  where listing_slug in (
    'demo-lagenhet-vasastan-stockholm',
    'demo-kontor-nyhamnen-malmo',
    'demo-garageplats-goteborg',
    'demo-forrad-lager-uppsala',
    'demo-mark-industriland-linkoping',
    'demo-hyresfastighet-norrkoping'
  );

  delete from public.rental_applications
  where listing_slug in ('demo-lagenhet-vasastan-stockholm')
     or listing_id in (select id from public.listings where slug in ('demo-lagenhet-vasastan-stockholm'));

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    status, street, city, zip_code, country, area_name, price, monthly_fee, area_sqm, rooms, floor, build_year,
    available_from, is_verified, published_at, has_balcony, has_elevator, has_parking, pets_allowed
  )
  values (
    demo_company_id, seed_owner, 'Modern 2:a med balkong i Vasastan', 'demo-lagenhet-vasastan-stockholm',
    'En ljus och välplanerad bostad nära Odenplan. Perfekt demoobjekt för att testa ansökningar, köpoäng och bostadsflöden i Bovaro.',
    'rent', 'rent', 'apartment', 'residential', 'published', 'Torsgatan 24', 'Stockholm', '11321', 'Sweden', 'Vasastan',
    15400, 0, 56, 2, '3', 1938, current_date + interval '25 days', true, now() - interval '2 days', true, true, false, true
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
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
    published_at = excluded.published_at,
    has_balcony = excluded.has_balcony,
    has_elevator = excluded.has_elevator,
    has_parking = excluded.has_parking,
    pets_allowed = excluded.pets_allowed
  returning id into residential_id;

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    commercial_type, business_purpose, status, street, city, zip_code, country, area_name, price, monthly_fee,
    area_sqm, rooms, available_from, is_verified, published_at, is_vat_applicable, price_per_sqm,
    min_lease_months, workplaces, meeting_rooms, is_furnished, has_reception, access_24_7
  )
  values (
    demo_company_id, seed_owner, 'Flexibelt kontor i Nyhamnen', 'demo-kontor-nyhamnen-malmo',
    'Modernt kontor nära Malmö C med mötesrum, reception och flexibla arbetsplatser. Används för att testa kommersiella leads.',
    'rent', 'rent', 'office', 'commercial', 'office', 'Kontor / etablering', 'published',
    'Carlsgatan 12', 'Malmö', '21120', 'Sweden', 'Nyhamnen', 42000, null, 230, null,
    current_date + interval '45 days', true, now() - interval '1 day', true, 2190, 24, 26, 4, true, true, true
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
    commercial_type = excluded.commercial_type,
    business_purpose = excluded.business_purpose,
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
    available_from = excluded.available_from,
    is_verified = excluded.is_verified,
    published_at = excluded.published_at,
    is_vat_applicable = excluded.is_vat_applicable,
    price_per_sqm = excluded.price_per_sqm,
    min_lease_months = excluded.min_lease_months,
    workplaces = excluded.workplaces,
    meeting_rooms = excluded.meeting_rooms,
    is_furnished = excluded.is_furnished,
    has_reception = excluded.has_reception,
    access_24_7 = excluded.access_24_7
  returning id into office_id;

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    parking_type, status, street, city, zip_code, country, area_name, price, area_sqm, available_from,
    is_verified, published_at, has_ev_charger, is_garage, has_camera_surveillance, access_24_7, max_vehicle_height_cm
  )
  values (
    demo_company_id, seed_owner, 'Garageplats med laddbox i Göteborg', 'demo-garageplats-goteborg',
    'Säker garageplats med laddbox, kameraövervakning och tillgång dygnet runt.',
    'rent', 'rent', 'garage', 'parking', 'ev_charging', 'published', 'Lindholmsallén 8', 'Göteborg', '41755', 'Sweden', 'Lindholmen',
    2100, 12, current_date + interval '7 days', true, now() - interval '4 hours', true, true, true, true, 220
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
    parking_type = excluded.parking_type,
    status = excluded.status,
    street = excluded.street,
    city = excluded.city,
    zip_code = excluded.zip_code,
    country = excluded.country,
    area_name = excluded.area_name,
    price = excluded.price,
    area_sqm = excluded.area_sqm,
    available_from = excluded.available_from,
    is_verified = excluded.is_verified,
    published_at = excluded.published_at,
    has_ev_charger = excluded.has_ev_charger,
    is_garage = excluded.is_garage,
    has_camera_surveillance = excluded.has_camera_surveillance,
    access_24_7 = excluded.access_24_7,
    max_vehicle_height_cm = excluded.max_vehicle_height_cm
  returning id into parking_id;

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    storage_type, status, street, city, zip_code, country, area_name, price, area_sqm, available_from,
    is_verified, published_at, is_heated, access_24_7, has_camera_surveillance, has_loading_zone, has_elevator_access
  )
  values (
    demo_company_id, seed_owner, 'Uppvärmt förråd och lager nära E4', 'demo-forrad-lager-uppsala',
    'Rent, uppvärmt och lättillgängligt förråd/lager med lastzon och hiss.',
    'rent', 'rent', 'storage_unit', 'storage', 'mini_warehouse', 'published', 'Bolandsgatan 15', 'Uppsala', '75323', 'Sweden', 'Boländerna',
    3800, 28, current_date + interval '14 days', true, now() - interval '8 hours', true, true, true, true, true
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
    storage_type = excluded.storage_type,
    status = excluded.status,
    street = excluded.street,
    city = excluded.city,
    zip_code = excluded.zip_code,
    country = excluded.country,
    area_name = excluded.area_name,
    price = excluded.price,
    area_sqm = excluded.area_sqm,
    available_from = excluded.available_from,
    is_verified = excluded.is_verified,
    published_at = excluded.published_at,
    is_heated = excluded.is_heated,
    access_24_7 = excluded.access_24_7,
    has_camera_surveillance = excluded.has_camera_surveillance,
    has_loading_zone = excluded.has_loading_zone,
    has_elevator_access = excluded.has_elevator_access
  returning id into storage_id;

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    land_type, status, street, city, zip_code, country, area_name, price, area_sqm, is_verified, published_at,
    has_detail_plan, has_building_rights, has_water_sewer, has_electricity, has_road_access
  )
  values (
    demo_company_id, seed_owner, 'Industrimark med byggrätt i Linköping', 'demo-mark-industriland-linkoping',
    'Detaljplanerad industrimark med el, VA och bra vägaccess. Demoobjekt för mark/tomt-flödet.',
    'sale', 'sale', 'land_plot', 'land', 'industrial_land', 'published', 'Hackeforsvägen 20', 'Linköping', '58941', 'Sweden', 'Hackefors',
    6200000, 5200, true, now() - interval '3 days', true, true, true, true, true
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
    land_type = excluded.land_type,
    status = excluded.status,
    street = excluded.street,
    city = excluded.city,
    zip_code = excluded.zip_code,
    country = excluded.country,
    area_name = excluded.area_name,
    price = excluded.price,
    area_sqm = excluded.area_sqm,
    is_verified = excluded.is_verified,
    published_at = excluded.published_at,
    has_detail_plan = excluded.has_detail_plan,
    has_building_rights = excluded.has_building_rights,
    has_water_sewer = excluded.has_water_sewer,
    has_electricity = excluded.has_electricity,
    has_road_access = excluded.has_road_access
  returning id into land_id;

  insert into public.listings (
    company_id, created_by, title, slug, description, listing_type, listing_purpose, property_type, listing_segment,
    investment_type, status, street, city, zip_code, country, area_name, price, area_sqm, rooms, build_year,
    is_verified, published_at, annual_income, operating_cost, cap_rate, units_count, occupancy_rate, vacancy_rate
  )
  values (
    demo_company_id, seed_owner, 'Hyresfastighet med 12 lägenheter', 'demo-hyresfastighet-norrkoping',
    'Stabil hyresfastighet med låg vakansgrad, dokumenterad NOI och tydliga nyckeltal för investerare.',
    'sale', 'sale', 'investment_property', 'investment', 'rental_property', 'published', 'Drottninggatan 42', 'Norrköping', '60224', 'Sweden', 'Centrum',
    28500000, 980, 36, 1964, true, now() - interval '5 days', 1920000, 610000, 4.6, 12, 96.5, 3.5
  )
  on conflict (slug) do update set
    company_id = excluded.company_id,
    created_by = excluded.created_by,
    title = excluded.title,
    description = excluded.description,
    listing_type = excluded.listing_type,
    listing_purpose = excluded.listing_purpose,
    property_type = excluded.property_type,
    listing_segment = excluded.listing_segment,
    investment_type = excluded.investment_type,
    status = excluded.status,
    street = excluded.street,
    city = excluded.city,
    zip_code = excluded.zip_code,
    country = excluded.country,
    area_name = excluded.area_name,
    price = excluded.price,
    area_sqm = excluded.area_sqm,
    rooms = excluded.rooms,
    build_year = excluded.build_year,
    is_verified = excluded.is_verified,
    published_at = excluded.published_at,
    annual_income = excluded.annual_income,
    operating_cost = excluded.operating_cost,
    cap_rate = excluded.cap_rate,
    units_count = excluded.units_count,
    occupancy_rate = excluded.occupancy_rate,
    vacancy_rate = excluded.vacancy_rate
  returning id into investment_id;

  delete from public.listing_images where listing_id in (residential_id, office_id, parking_id, storage_id, land_id, investment_id);
  delete from public.listing_features where listing_id in (residential_id, office_id, parking_id, storage_id, land_id, investment_id);
  delete from public.rental_requirements where listing_id in (residential_id, office_id, parking_id, storage_id, land_id, investment_id);

  insert into public.listing_images (listing_id, image_url, alt_text, position, is_cover)
  values
    (residential_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80', 'Ljus lägenhet med vardagsrum', 0, true),
    (office_id, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80', 'Modernt kontor med öppna ytor', 0, true),
    (parking_id, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1400&q=80', 'Garage och parkering', 0, true),
    (storage_id, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80', 'Lager och förråd', 0, true),
    (land_id, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80', 'Markområde', 0, true),
    (investment_id, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80', 'Fastighetsbyggnad', 0, true);

  insert into public.listing_features (listing_id, feature_key, feature_label)
  values
    (residential_id, 'balcony', 'Balkong'),
    (residential_id, 'elevator', 'Hiss'),
    (residential_id, 'pets', 'Husdjur tillåtna'),
    (office_id, 'meeting_rooms', '4 mötesrum'),
    (office_id, 'reception', 'Reception'),
    (office_id, 'access_24_7', '24/7-access'),
    (parking_id, 'ev_charger', 'Laddbox'),
    (parking_id, 'camera', 'Kameraövervakning'),
    (parking_id, 'garage', 'Garage'),
    (storage_id, 'heated', 'Uppvärmt'),
    (storage_id, 'loading_zone', 'Lastzon'),
    (storage_id, 'elevator_access', 'Hiss/lyft'),
    (land_id, 'detail_plan', 'Detaljplan'),
    (land_id, 'building_rights', 'Byggrätt'),
    (land_id, 'road_access', 'Väganslutning'),
    (investment_id, 'cap_rate', 'Cap rate 4,6%'),
    (investment_id, 'units', '12 lägenheter'),
    (investment_id, 'occupancy', '96,5% uthyrt');

  insert into public.rental_requirements (listing_id, min_income, pets_allowed, smoking_allowed, references_required, employment_required)
  values (residential_id, 39000, true, false, true, true)
  on conflict (listing_id) do update set
    min_income = excluded.min_income,
    pets_allowed = excluded.pets_allowed,
    smoking_allowed = excluded.smoking_allowed,
    references_required = excluded.references_required,
    employment_required = excluded.employment_required;

  insert into public.listing_inquiries (
    listing_id, user_id, landlord_user_id, landlord_company_id, listing_slug, listing_title, listing_city,
    listing_type, listing_segment, listing_price, requester_full_name, requester_email, requester_phone,
    requester_company_name, inquiry_type, preferred_contact_method, message, status
  )
  values
    (office_id, seed_owner, seed_owner, demo_company_id, 'demo-kontor-nyhamnen-malmo', 'Flexibelt kontor i Nyhamnen', 'Malmö', 'rent', 'commercial', 42000, 'Sara Lind', 'sara.lind@example.com', '070-111 22 33', 'Lind Studio AB', 'viewing', 'email', 'Vi söker nytt kontor för 18-25 personer och vill boka visning nästa vecka.', 'new'),
    (parking_id, seed_owner, seed_owner, demo_company_id, 'demo-garageplats-goteborg', 'Garageplats med laddbox i Göteborg', 'Göteborg', 'rent', 'parking', 2100, 'Jonas Berg', 'jonas.berg@example.com', '070-222 33 44', null, 'interest', 'phone', 'Är laddboxen inkluderad i hyran?', 'contacted'),
    (investment_id, seed_owner, seed_owner, demo_company_id, 'demo-hyresfastighet-norrkoping', 'Hyresfastighet med 12 lägenheter', 'Norrköping', 'sale', 'investment', 28500000, 'Mikael Fors', 'mikael.fors@example.com', '070-333 44 55', 'Fors Invest AB', 'offer_request', 'email', 'Skicka gärna hyreslista, driftnetto och senaste tre årens kostnader.', 'negotiating');

  insert into public.rental_applications (
    user_id, listing_id, landlord_user_id, landlord_company_id, listing_slug, listing_title, listing_city,
    listing_type, listing_price, listing_image_url, applicant_full_name, applicant_email, applicant_phone,
    applicant_monthly_income, applicant_household_size, queue_points_snapshot, queue_joined_at_snapshot,
    cover_letter, status
  )
  values (
    seed_owner, residential_id, seed_owner, demo_company_id, 'demo-lagenhet-vasastan-stockholm',
    'Modern 2:a med balkong i Vasastan', 'Stockholm', 'rent', 15400,
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
    'Demo Sökande', 'demo.sokande@example.com', '070-444 55 66', 47000, 2, 145,
    now() - interval '8 months', 'Vi är ett skötsamt hushåll som söker långsiktigt boende i Vasastan.', 'reviewing'
  );

  raise notice 'Bovaro demo seed färdig: company %, listings %, %, %, %, %, %', demo_company_id, residential_id, office_id, parking_id, storage_id, land_id, investment_id;
end
$$;
