-- Dynamic Search Engine phase
-- Adds searchable filter columns used by the dynamic listings search.
-- Run after phase_commercial_marketplace.sql.

alter table public.listings
  add column if not exists has_balcony boolean not null default false,
  add column if not exists has_elevator boolean not null default false,
  add column if not exists has_parking boolean not null default false,
  add column if not exists pets_allowed boolean not null default false,
  add column if not exists workplaces integer,
  add column if not exists meeting_rooms integer,
  add column if not exists is_furnished boolean not null default false,
  add column if not exists has_reception boolean not null default false,
  add column if not exists access_24_7 boolean not null default false,
  add column if not exists has_ev_charger boolean not null default false,
  add column if not exists is_garage boolean not null default false,
  add column if not exists has_camera_surveillance boolean not null default false,
  add column if not exists max_vehicle_height_cm integer,
  add column if not exists is_heated boolean not null default false,
  add column if not exists has_loading_zone boolean not null default false,
  add column if not exists has_elevator_access boolean not null default false,
  add column if not exists has_detail_plan boolean not null default false,
  add column if not exists has_building_rights boolean not null default false,
  add column if not exists has_water_sewer boolean not null default false,
  add column if not exists has_electricity boolean not null default false,
  add column if not exists has_road_access boolean not null default false,
  add column if not exists units_count integer,
  add column if not exists occupancy_rate numeric(6, 2),
  add column if not exists vacancy_rate numeric(6, 2);

create index if not exists listings_price_idx on public.listings(price);
create index if not exists listings_area_sqm_idx on public.listings(area_sqm);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists listings_available_from_idx on public.listings(available_from);
create index if not exists listings_parking_type_idx on public.listings(parking_type);
create index if not exists listings_storage_type_idx on public.listings(storage_type);
create index if not exists listings_land_type_idx on public.listings(land_type);
create index if not exists listings_investment_type_idx on public.listings(investment_type);
create index if not exists listings_cap_rate_idx on public.listings(cap_rate);
create index if not exists listings_units_count_idx on public.listings(units_count);

-- Optional backfill from existing rental_requirements for residential rental listings.
update public.listings l
set pets_allowed = rr.pets_allowed
from public.rental_requirements rr
where rr.listing_id = l.id
  and l.listing_segment = 'residential'
  and l.listing_type = 'rent';
