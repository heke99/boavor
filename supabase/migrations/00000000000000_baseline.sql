-- ============================================================================
-- Bovaro baseline migration
-- ============================================================================
-- Captured from the live Supabase project (jpvnkxchsyqtkxseelea) on 2026-07-05
-- and consolidated from the legacy phase SQL files (now in supabase/archive/).
--
-- This file represents the CLEAN consolidated schema:
--   * All 33 public tables with RLS enabled and explicit policies.
--   * One auth signup trigger (handle_bovaro_new_user). The legacy
--     handle_new_user_profile trigger is intentionally excluded.
--   * Deduplicated RLS policies (overlapping legacy policies excluded).
--   * Storage buckets and storage.objects policies.
--
-- The companion migration 20260705220000_batch0_stabilization.sql brings
-- pre-baseline live databases in line with this file. Both are idempotent.
--
-- Safe to run on an empty database. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_type as enum ('rent', 'sale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'published', 'paused', 'rented', 'sold', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_segment as enum ('residential', 'commercial', 'parking', 'storage', 'land', 'investment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum ('apartment', 'house', 'property', 'commercial_space', 'office', 'parking_space', 'garage', 'storage_unit', 'land_plot', 'investment_property');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commercial_type as enum ('office', 'retail', 'restaurant', 'warehouse', 'industrial', 'showroom', 'clinic', 'workshop', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.parking_type as enum ('outdoor', 'garage', 'ev_charging', 'motorcycle', 'truck', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storage_type as enum ('storage_unit', 'warehouse_box', 'mini_warehouse', 'pallet_space', 'container', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.land_type as enum ('land_plot', 'industrial_land', 'agricultural_land', 'development_land', 'yard_space', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.investment_type as enum ('rental_property', 'commercial_property', 'mixed_use_property', 'portfolio', 'project_property', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.saved_search_mode as enum ('rent', 'sale', 'all');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.queue_membership_status as enum ('inactive', 'active', 'paused', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.queue_point_event_type as enum ('enrolled', 'monthly_accrual', 'manual_adjustment', 'paused', 'resumed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('pending', 'active', 'paused', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rental_application_status as enum ('draft', 'submitted', 'received', 'reviewing', 'qualified', 'reserve', 'viewing', 'offered', 'rejected', 'signed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_type as enum ('interest', 'viewing', 'offer_request', 'contact');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_status as enum ('new', 'contacted', 'viewing_booked', 'negotiating', 'closed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_lead_status as enum ('new', 'contacted', 'viewing_booked', 'follow_up', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.viewing_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.viewing_type as enum ('rental', 'sale');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. Utility functions used by triggers and RLS
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_listing_inquiry_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Tables
-- ----------------------------------------------------------------------------

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
  updated_at timestamptz not null default now(),
  account_type text not null default 'private',
  personal_identity_number text,
  preferred_listing_intent text not null default 'both',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  personal_identity_consent_at timestamptz,
  marketing_consent boolean not null default false,
  onboarding_completed boolean not null default false
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
  created_at timestamptz not null default now(),
  organization_number text,
  legal_form text not null default 'ab',
  business_purpose text not null default 'rent_and_sale',
  verification_status text not null default 'pending',
  website text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  verification_note text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'company_admin',
  created_at timestamptz not null default now(),
  title text,
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
  latitude numeric(10,7),
  longitude numeric(10,7),
  price integer not null default 0,
  monthly_fee integer,
  area_sqm numeric(8,2),
  rooms numeric(4,1),
  floor text,
  build_year integer,
  available_from date,
  is_verified boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  listing_purpose public.listing_type,
  listing_segment public.listing_segment not null default 'residential',
  commercial_type public.commercial_type,
  parking_type public.parking_type,
  storage_type public.storage_type,
  land_type public.land_type,
  investment_type public.investment_type,
  business_purpose text,
  is_vat_applicable boolean not null default false,
  monthly_service_fee integer,
  price_per_sqm integer,
  min_lease_months integer,
  annual_income integer,
  operating_cost integer,
  cap_rate numeric(6,2),
  has_balcony boolean not null default false,
  has_elevator boolean not null default false,
  has_parking boolean not null default false,
  pets_allowed boolean not null default false,
  workplaces integer,
  meeting_rooms integer,
  is_furnished boolean not null default false,
  has_reception boolean not null default false,
  access_24_7 boolean not null default false,
  has_ev_charger boolean not null default false,
  is_garage boolean not null default false,
  has_camera_surveillance boolean not null default false,
  max_vehicle_height_cm integer,
  is_heated boolean not null default false,
  has_loading_zone boolean not null default false,
  has_elevator_access boolean not null default false,
  has_detail_plan boolean not null default false,
  has_building_rights boolean not null default false,
  has_water_sewer boolean not null default false,
  has_electricity boolean not null default false,
  has_road_access boolean not null default false,
  units_count integer,
  occupancy_rate numeric(6,2),
  vacancy_rate numeric(6,2)
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
  min_rooms numeric(4,1),
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

create table if not exists public.co_applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  document_type text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  document_status text not null default 'active',
  document_expires_at date,
  is_default_for_applications boolean not null default false
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  amount_sek integer not null,
  interval_unit text not null default 'month',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code) on delete restrict,
  provider text not null default 'manual',
  provider_subscription_id text,
  status public.subscription_status not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_code)
);

create table if not exists public.queue_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  membership_status public.queue_membership_status not null default 'inactive',
  joined_queue_at timestamptz,
  current_points integer not null default 0,
  months_in_queue integer not null default 0,
  last_point_awarded_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null references public.queue_memberships(id) on delete cascade,
  event_type public.queue_point_event_type not null,
  points_delta integer not null default 0,
  balance_after integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_user_id uuid references auth.users(id) on delete cascade,
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
  landlord_user_id uuid references auth.users(id) on delete set null,
  landlord_company_id uuid references public.companies(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  listing_slug text,
  listing_title text,
  listing_city text,
  listing_type public.listing_type not null default 'rent',
  listing_price integer not null default 0,
  listing_image_url text,
  applicant_full_name text,
  applicant_email text,
  applicant_phone text,
  applicant_monthly_income integer,
  applicant_household_size integer,
  queue_points_snapshot integer not null default 0,
  queue_joined_at_snapshot timestamptz,
  cover_letter text,
  applicant_snapshot jsonb,
  move_in_date date,
  employment_type text,
  pets boolean not null default false,
  smoking boolean not null default false,
  internal_note text,
  status_updated_at timestamptz,
  unique (listing_id, applicant_user_id)
);

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

create table if not exists public.rental_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status public.rental_application_status,
  to_status public.rental_application_status not null,
  note text,
  created_at timestamptz not null default now()
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

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, document_type, document_version)
);

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
  updated_at timestamptz not null default now(),
  internal_note text,
  status_updated_at timestamptz
);

create table if not exists public.listing_activity_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_internal_notes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_user_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  account_type text not null default 'private',
  role public.app_role not null default 'seeker',
  note text,
  status text not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  subject_hash text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

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

create table if not exists public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.profile_documents(id) on delete set null,
  application_document_id uuid references public.rental_application_documents(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  access_type text not null check (access_type in ('profile_document', 'application_document')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Indexes (beyond PK/unique constraints)
-- ----------------------------------------------------------------------------

create index if not exists admin_audit_logs_admin_user_id_idx on public.admin_audit_logs (admin_user_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_user_invites_email_idx on public.admin_user_invites (email);
create index if not exists admin_user_invites_status_idx on public.admin_user_invites (status);
create index if not exists idx_co_applicants_user_id on public.co_applicants (user_id);
create index if not exists companies_verification_status_idx on public.companies (verification_status, created_at desc);
create index if not exists company_members_user_id_idx on public.company_members (user_id);
create index if not exists document_access_logs_actor_created_idx on public.document_access_logs (actor_user_id, created_at desc);
create index if not exists document_access_logs_owner_created_idx on public.document_access_logs (owner_user_id, created_at desc);
create index if not exists idx_favorites_user_id on public.favorites (user_id);
create index if not exists legal_acceptances_user_id_idx on public.legal_acceptances (user_id);
create index if not exists listing_activity_events_listing_id_created_idx on public.listing_activity_events (listing_id, created_at desc);
create index if not exists idx_listing_documents_listing_id on public.listing_documents (listing_id);
create index if not exists idx_listing_features_listing_id on public.listing_features (listing_id);
create index if not exists idx_listing_images_listing_id on public.listing_images (listing_id);
create index if not exists listing_inquiries_created_at_idx on public.listing_inquiries (created_at desc);
create index if not exists listing_inquiries_landlord_company_id_idx on public.listing_inquiries (landlord_company_id);
create index if not exists listing_inquiries_landlord_user_id_idx on public.listing_inquiries (landlord_user_id);
create index if not exists listing_inquiries_listing_id_idx on public.listing_inquiries (listing_id);
create index if not exists listing_inquiries_status_created_at_idx on public.listing_inquiries (status, created_at desc);
create index if not exists listing_inquiries_status_idx on public.listing_inquiries (status);
create index if not exists listing_inquiries_user_id_idx on public.listing_inquiries (user_id);
create index if not exists listing_internal_notes_listing_id_created_idx on public.listing_internal_notes (listing_id, created_at desc);
create index if not exists idx_listings_company_id on public.listings (company_id);
create index if not exists idx_listings_status on public.listings (status);
create index if not exists idx_listings_type_city on public.listings (listing_type, city);
create index if not exists listings_area_sqm_idx on public.listings (area_sqm);
create index if not exists listings_available_from_idx on public.listings (available_from);
create index if not exists listings_cap_rate_idx on public.listings (cap_rate);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_commercial_type_idx on public.listings (commercial_type);
create index if not exists listings_company_status_idx on public.listings (company_id, status);
create index if not exists listings_created_by_status_idx on public.listings (created_by, status);
create index if not exists listings_investment_type_idx on public.listings (investment_type);
create index if not exists listings_land_type_idx on public.listings (land_type);
create index if not exists listings_listing_purpose_idx on public.listings (listing_purpose);
create index if not exists listings_listing_segment_idx on public.listings (listing_segment);
create index if not exists listings_parking_type_idx on public.listings (parking_type);
create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_storage_type_idx on public.listings (storage_type);
create index if not exists listings_units_count_idx on public.listings (units_count);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists privacy_requests_status_idx on public.privacy_requests (status, created_at desc);
create index if not exists privacy_requests_user_id_idx on public.privacy_requests (user_id);
create index if not exists idx_profile_documents_user_id on public.profile_documents (user_id);
create index if not exists profile_documents_user_default_idx on public.profile_documents (user_id, is_default_for_applications);
create index if not exists idx_queue_point_ledger_membership_id on public.queue_point_ledger (membership_id);
create index if not exists idx_queue_point_ledger_user_id on public.queue_point_ledger (user_id);
create index if not exists rate_limit_events_scope_subject_created_idx on public.rate_limit_events (scope, subject_hash, created_at desc);
create index if not exists rental_application_co_applicants_application_id_idx on public.rental_application_co_applicants (application_id);
create index if not exists rental_application_documents_application_id_idx on public.rental_application_documents (application_id);
create index if not exists idx_rental_applications_applicant_user_id on public.rental_applications (applicant_user_id);
create index if not exists idx_rental_applications_listing_id on public.rental_applications (listing_id);
create index if not exists rental_applications_created_at_idx on public.rental_applications (created_at desc);
create index if not exists rental_applications_landlord_company_id_idx on public.rental_applications (landlord_company_id);
create index if not exists rental_applications_landlord_user_id_idx on public.rental_applications (landlord_user_id);
create index if not exists rental_applications_listing_created_idx on public.rental_applications (listing_id, created_at desc);
create index if not exists rental_applications_status_idx on public.rental_applications (status);
create index if not exists rental_applications_user_id_idx on public.rental_applications (user_id);
create index if not exists rental_application_status_history_application_id_idx on public.rental_application_status_history (application_id, created_at desc);
create index if not exists idx_sale_leads_listing_id on public.sale_leads (listing_id);
create index if not exists saved_search_notification_runs_user_created_idx on public.saved_search_notification_runs (user_id, created_at desc);
create index if not exists idx_saved_searches_user_id on public.saved_searches (user_id);
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions (user_id);
create index if not exists idx_viewings_listing_id on public.viewings (listing_id);

-- ----------------------------------------------------------------------------
-- 5. Authorization helper functions
-- ----------------------------------------------------------------------------

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  );
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path to 'public'
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_company_ids()
returns uuid[]
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(array_agg(cm.company_id), '{}')
  from public.company_members cm
  where cm.user_id = auth.uid();
$$;

create or replace function public.current_user_can_manage_company(target_company_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select
    target_company_id is not null
    and (
      public.current_user_is_admin()
      or target_company_id = any(public.current_user_company_ids())
    );
$$;

create or replace function public.current_user_can_manage_listing(target_listing_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = target_listing_id
      and (
        public.current_user_is_admin()
        or l.created_by = auth.uid()
        or l.company_id = any(public.current_user_company_ids())
      )
  );
$$;

create or replace function public.current_user_can_manage_application(target_application_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.rental_applications ra
    where ra.id = target_application_id
      and (
        public.current_user_is_admin()
        or ra.landlord_user_id = auth.uid()
        or ra.landlord_company_id = any(public.current_user_company_ids())
        or public.current_user_can_manage_listing(ra.listing_id)
      )
  );
$$;

create or replace function public.current_user_can_manage_inquiry(target_inquiry_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.listing_inquiries li
    where li.id = target_inquiry_id
      and (
        public.current_user_is_admin()
        or li.landlord_user_id = auth.uid()
        or li.landlord_company_id = any(public.current_user_company_ids())
        or public.current_user_can_manage_listing(li.listing_id)
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 6. Application functions
-- ----------------------------------------------------------------------------

create or replace function public.admin_user_overview()
returns table(
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  role public.app_role,
  account_type text,
  city text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    coalesce(p.account_type, 'private')::text,
    p.city,
    u.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by u.created_at desc nulls last, p.updated_at desc nulls last;
end;
$$;

create or replace function public.storage_bucket_exists(bucket_name text)
returns boolean
language sql
security definer
set search_path to 'storage', 'public'
as $$
  select exists (
    select 1
    from storage.buckets
    where id = bucket_name
  );
$$;

create or replace function public.check_rate_limit(
  input_scope text,
  input_subject_hash text,
  input_ip_hash text,
  input_limit integer,
  input_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  event_count integer;
begin
  delete from public.rate_limit_events
  where created_at < now() - interval '24 hours';

  select count(*) into event_count
  from public.rate_limit_events
  where scope = input_scope
    and subject_hash = input_subject_hash
    and created_at >= now() - make_interval(secs => input_window_seconds);

  if event_count >= input_limit then
    return false;
  end if;

  insert into public.rate_limit_events (scope, subject_hash, ip_hash)
  values (input_scope, input_subject_hash, input_ip_hash);

  return true;
end;
$$;

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

-- ----------------------------------------------------------------------------
-- 7. Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created_bovaro_register on auth.users;
create trigger on_auth_user_created_bovaro_register
  after insert on auth.users
  for each row execute function public.handle_bovaro_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

drop trigger if exists rental_requirements_updated_at on public.rental_requirements;
create trigger rental_requirements_updated_at before update on public.rental_requirements
  for each row execute function public.set_updated_at();

drop trigger if exists saved_searches_updated_at on public.saved_searches;
create trigger saved_searches_updated_at before update on public.saved_searches
  for each row execute function public.set_updated_at();

drop trigger if exists co_applicants_updated_at on public.co_applicants;
create trigger co_applicants_updated_at before update on public.co_applicants
  for each row execute function public.set_updated_at();

drop trigger if exists profile_documents_updated_at on public.profile_documents;
create trigger profile_documents_updated_at before update on public.profile_documents
  for each row execute function public.set_updated_at();

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();

drop trigger if exists user_subscriptions_updated_at on public.user_subscriptions;
create trigger user_subscriptions_updated_at before update on public.user_subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists queue_memberships_updated_at on public.queue_memberships;
create trigger queue_memberships_updated_at before update on public.queue_memberships
  for each row execute function public.set_updated_at();

drop trigger if exists rental_applications_updated_at on public.rental_applications;
create trigger rental_applications_updated_at before update on public.rental_applications
  for each row execute function public.set_updated_at();

drop trigger if exists sale_leads_updated_at on public.sale_leads;
create trigger sale_leads_updated_at before update on public.sale_leads
  for each row execute function public.set_updated_at();

drop trigger if exists viewings_updated_at on public.viewings;
create trigger viewings_updated_at before update on public.viewings
  for each row execute function public.set_updated_at();

drop trigger if exists listing_inquiries_updated_at on public.listing_inquiries;
create trigger listing_inquiries_updated_at before update on public.listing_inquiries
  for each row execute function public.set_updated_at();

drop trigger if exists listing_inquiries_status_updated_at on public.listing_inquiries;
create trigger listing_inquiries_status_updated_at before update on public.listing_inquiries
  for each row execute function public.set_listing_inquiry_status_updated_at();

drop trigger if exists admin_user_invites_updated_at on public.admin_user_invites;
create trigger admin_user_invites_updated_at before update on public.admin_user_invites
  for each row execute function public.set_updated_at();

drop trigger if exists privacy_requests_updated_at on public.privacy_requests;
create trigger privacy_requests_updated_at before update on public.privacy_requests
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Row level security
-- ----------------------------------------------------------------------------

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
alter table public.co_applicants enable row level security;
alter table public.profile_documents enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.queue_memberships enable row level security;
alter table public.queue_point_ledger enable row level security;
alter table public.rental_applications enable row level security;
alter table public.rental_application_co_applicants enable row level security;
alter table public.rental_application_documents enable row level security;
alter table public.rental_application_status_history enable row level security;
alter table public.sale_leads enable row level security;
alter table public.viewings enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.listing_inquiries enable row level security;
alter table public.listing_activity_events enable row level security;
alter table public.listing_internal_notes enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_user_invites enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.saved_search_notification_runs enable row level security;
alter table public.document_access_logs enable row level security;

-- profiles
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "admins can read all profiles" on public.profiles;
create policy "admins can read all profiles" on public.profiles
  for select using (public.current_user_is_admin());
drop policy if exists "super admins can update profiles" on public.profiles;
create policy "super admins can update profiles" on public.profiles
  for update using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin());

-- companies
drop policy if exists "users can create companies" on public.companies;
create policy "users can create companies" on public.companies
  for insert with check (auth.uid() = created_by);
drop policy if exists "company members can read own companies" on public.companies;
create policy "company members can read own companies" on public.companies
  for select using (public.current_user_can_manage_company(id));
drop policy if exists "company creators can update companies" on public.companies;
create policy "company creators can update companies" on public.companies
  for update using (
    auth.uid() = created_by
    or exists (select 1 from public.company_members cm where cm.company_id = companies.id and cm.user_id = auth.uid())
  ) with check (
    auth.uid() = created_by
    or exists (select 1 from public.company_members cm where cm.company_id = companies.id and cm.user_id = auth.uid())
  );
drop policy if exists "company members can update own companies" on public.companies;
create policy "company members can update own companies" on public.companies
  for update using (public.current_user_can_manage_company(id)) with check (public.current_user_can_manage_company(id));
drop policy if exists "admins can read all companies" on public.companies;
create policy "admins can read all companies" on public.companies
  for select using (public.current_user_is_admin());
drop policy if exists "admins can update companies" on public.companies;
create policy "admins can update companies" on public.companies
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- company_members
drop policy if exists "users can read own company memberships" on public.company_members;
create policy "users can read own company memberships" on public.company_members
  for select using (auth.uid() = user_id or public.current_user_is_admin());
drop policy if exists "users can insert own company memberships" on public.company_members;
create policy "users can insert own company memberships" on public.company_members
  for insert with check (auth.uid() = user_id);
drop policy if exists "users can update own company memberships" on public.company_members;
create policy "users can update own company memberships" on public.company_members
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users can delete own company memberships" on public.company_members;
create policy "users can delete own company memberships" on public.company_members
  for delete using (auth.uid() = user_id);

-- listings
drop policy if exists "public can read published listings" on public.listings;
create policy "public can read published listings" on public.listings
  for select using (status = 'published');
drop policy if exists "owners can read own listings" on public.listings;
create policy "owners can read own listings" on public.listings
  for select using (
    created_by = auth.uid()
    or company_id = any(public.current_user_company_ids())
    or public.current_user_is_admin()
  );
drop policy if exists "owners can insert listings" on public.listings;
create policy "owners can insert listings" on public.listings
  for insert with check (
    created_by = auth.uid()
    and (company_id is null or company_id = any(public.current_user_company_ids()) or public.current_user_is_admin())
  );
drop policy if exists "owners can update own listings" on public.listings;
create policy "owners can update own listings" on public.listings
  for update using (public.current_user_can_manage_listing(id)) with check (public.current_user_can_manage_listing(id));
drop policy if exists "admins can read all listings" on public.listings;
create policy "admins can read all listings" on public.listings
  for select using (public.current_user_is_admin());
drop policy if exists "admins can update all listings" on public.listings;
create policy "admins can update all listings" on public.listings
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- listing_images
drop policy if exists "public reads published listing images" on public.listing_images;
create policy "public reads published listing images" on public.listing_images
  for select using (
    exists (select 1 from public.listings l where l.id = listing_images.listing_id and l.status = 'published')
  );
drop policy if exists "owners manage listing images" on public.listing_images;
create policy "owners manage listing images" on public.listing_images
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));

-- listing_features
drop policy if exists "public reads published listing features" on public.listing_features;
create policy "public reads published listing features" on public.listing_features
  for select using (
    exists (select 1 from public.listings l where l.id = listing_features.listing_id and l.status = 'published')
  );
drop policy if exists "owners manage listing features" on public.listing_features;
create policy "owners manage listing features" on public.listing_features
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));

-- listing_documents
drop policy if exists "public can read documents for published listings" on public.listing_documents;
create policy "public can read documents for published listings" on public.listing_documents
  for select using (
    exists (select 1 from public.listings l where l.id = listing_documents.listing_id and l.status = 'published')
  );
drop policy if exists "owners manage listing documents" on public.listing_documents;
create policy "owners manage listing documents" on public.listing_documents
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));

-- rental_requirements
drop policy if exists "public reads published rental requirements" on public.rental_requirements;
create policy "public reads published rental requirements" on public.rental_requirements
  for select using (
    exists (select 1 from public.listings l where l.id = rental_requirements.listing_id and l.status = 'published')
  );
drop policy if exists "owners manage rental requirements" on public.rental_requirements;
create policy "owners manage rental requirements" on public.rental_requirements
  for all using (public.current_user_can_manage_listing(listing_id))
  with check (public.current_user_can_manage_listing(listing_id));

-- favorites
drop policy if exists "users can manage own favorites" on public.favorites;
create policy "users can manage own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_searches
drop policy if exists "users can manage own saved searches" on public.saved_searches;
create policy "users can manage own saved searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifications
drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- co_applicants
drop policy if exists "users manage own co_applicants" on public.co_applicants;
create policy "users manage own co_applicants" on public.co_applicants
  for all using (auth.uid() = user_id or public.current_user_is_admin())
  with check (auth.uid() = user_id or public.current_user_is_admin());

-- profile_documents
drop policy if exists "users manage own profile_documents" on public.profile_documents;
create policy "users manage own profile_documents" on public.profile_documents
  for all using (auth.uid() = user_id or public.current_user_is_admin())
  with check (auth.uid() = user_id or public.current_user_is_admin());

-- subscription_plans
drop policy if exists "public can read active subscription plans" on public.subscription_plans;
create policy "public can read active subscription plans" on public.subscription_plans
  for select using (is_active = true);

-- user_subscriptions
drop policy if exists "users manage own subscriptions" on public.user_subscriptions;
create policy "users manage own subscriptions" on public.user_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- queue_memberships
drop policy if exists "users manage own queue membership" on public.queue_memberships;
create policy "users manage own queue membership" on public.queue_memberships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- queue_point_ledger
drop policy if exists "users read own queue ledger" on public.queue_point_ledger;
create policy "users read own queue ledger" on public.queue_point_ledger
  for select using (auth.uid() = user_id);
drop policy if exists "users insert own queue ledger" on public.queue_point_ledger;
create policy "users insert own queue ledger" on public.queue_point_ledger
  for insert with check (auth.uid() = user_id);

-- rental_applications
drop policy if exists "users can create own rental applications" on public.rental_applications;
create policy "users can create own rental applications" on public.rental_applications
  for insert with check (auth.uid() = user_id);
drop policy if exists "users can read own rental applications" on public.rental_applications;
create policy "users can read own rental applications" on public.rental_applications
  for select using (auth.uid() = user_id or public.current_user_is_admin());
drop policy if exists "owners can read incoming rental applications" on public.rental_applications;
create policy "owners can read incoming rental applications" on public.rental_applications
  for select using (public.current_user_can_manage_application(id));
drop policy if exists "owners can update incoming rental applications" on public.rental_applications;
create policy "owners can update incoming rental applications" on public.rental_applications
  for update using (public.current_user_can_manage_application(id))
  with check (public.current_user_can_manage_application(id));
drop policy if exists "authorized users can update rental applications" on public.rental_applications;
create policy "authorized users can update rental applications" on public.rental_applications
  for update using (
    auth.uid() = applicant_user_id
    or exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = rental_applications.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );
drop policy if exists "admins can read all rental applications" on public.rental_applications;
create policy "admins can read all rental applications" on public.rental_applications
  for select using (public.current_user_is_admin());

-- rental_application_co_applicants
drop policy if exists "users can create own rental application co applicants" on public.rental_application_co_applicants;
create policy "users can create own rental application co applicants" on public.rental_application_co_applicants
  for insert with check (auth.uid() = user_id);
drop policy if exists "users can read own rental application co applicants" on public.rental_application_co_applicants;
create policy "users can read own rental application co applicants" on public.rental_application_co_applicants
  for select using (auth.uid() = user_id);
drop policy if exists "admins can read all application co applicants" on public.rental_application_co_applicants;
create policy "admins can read all application co applicants" on public.rental_application_co_applicants
  for select using (public.current_user_is_admin());

-- rental_application_documents
drop policy if exists "users can create own rental application documents" on public.rental_application_documents;
create policy "users can create own rental application documents" on public.rental_application_documents
  for insert with check (auth.uid() = user_id);
drop policy if exists "users can read own rental application documents" on public.rental_application_documents;
create policy "users can read own rental application documents" on public.rental_application_documents
  for select using (auth.uid() = user_id);
drop policy if exists "admins can read all application documents" on public.rental_application_documents;
create policy "admins can read all application documents" on public.rental_application_documents
  for select using (public.current_user_is_admin());

-- rental_application_status_history
drop policy if exists "applicants read own application status history" on public.rental_application_status_history;
create policy "applicants read own application status history" on public.rental_application_status_history
  for select using (
    exists (
      select 1 from public.rental_applications ra
      where ra.id = rental_application_status_history.application_id
        and ra.user_id = auth.uid()
    )
  );
drop policy if exists "owners read application status history" on public.rental_application_status_history;
create policy "owners read application status history" on public.rental_application_status_history
  for select using (public.current_user_can_manage_application(application_id));
drop policy if exists "owners insert application status history" on public.rental_application_status_history;
create policy "owners insert application status history" on public.rental_application_status_history
  for insert with check (
    public.current_user_can_manage_application(application_id)
    or exists (
      select 1 from public.rental_applications ra
      where ra.id = rental_application_status_history.application_id
        and ra.user_id = auth.uid()
    )
  );

-- sale_leads
drop policy if exists "public can create sale leads" on public.sale_leads;
create policy "public can create sale leads" on public.sale_leads
  for insert with check (true);
drop policy if exists "authorized users can read sale leads" on public.sale_leads;
create policy "authorized users can read sale leads" on public.sale_leads
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = sale_leads.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );
drop policy if exists "authorized users can update sale leads" on public.sale_leads;
create policy "authorized users can update sale leads" on public.sale_leads
  for update using (
    exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = sale_leads.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );

-- viewings
drop policy if exists "authorized users can create viewings" on public.viewings;
create policy "authorized users can create viewings" on public.viewings
  for insert with check (
    exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = viewings.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );
drop policy if exists "authorized users can read viewings" on public.viewings;
create policy "authorized users can read viewings" on public.viewings
  for select using (
    exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = viewings.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
    or exists (
      select 1 from public.rental_applications
      where rental_applications.id = viewings.rental_application_id
        and rental_applications.applicant_user_id = auth.uid()
    )
    or exists (
      select 1 from public.sale_leads
      where sale_leads.id = viewings.sale_lead_id
        and sale_leads.user_id = auth.uid()
    )
  );
drop policy if exists "authorized users can update viewings" on public.viewings;
create policy "authorized users can update viewings" on public.viewings
  for update using (
    exists (
      select 1
      from public.listings
      left join public.company_members on company_members.company_id = listings.company_id
      where listings.id = viewings.listing_id
        and (listings.created_by = auth.uid() or company_members.user_id = auth.uid())
    )
  );

-- legal_acceptances
drop policy if exists "users can read own legal acceptances" on public.legal_acceptances;
create policy "users can read own legal acceptances" on public.legal_acceptances
  for select using (auth.uid() = user_id);
drop policy if exists "users can insert own legal acceptances" on public.legal_acceptances;
create policy "users can insert own legal acceptances" on public.legal_acceptances
  for insert with check (auth.uid() = user_id);

-- listing_inquiries
drop policy if exists "users can create listing inquiries" on public.listing_inquiries;
create policy "users can create listing inquiries" on public.listing_inquiries
  for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists "users can read own listing inquiries" on public.listing_inquiries;
create policy "users can read own listing inquiries" on public.listing_inquiries
  for select using (auth.uid() = user_id or public.current_user_is_admin());
drop policy if exists "owners can read listing inquiries" on public.listing_inquiries;
create policy "owners can read listing inquiries" on public.listing_inquiries
  for select using (public.current_user_can_manage_inquiry(id));
drop policy if exists "owners can update listing inquiries" on public.listing_inquiries;
create policy "owners can update listing inquiries" on public.listing_inquiries
  for update using (public.current_user_can_manage_inquiry(id))
  with check (public.current_user_can_manage_inquiry(id));
drop policy if exists "admins can read all inquiries" on public.listing_inquiries;
create policy "admins can read all inquiries" on public.listing_inquiries
  for select using (public.current_user_is_admin());
drop policy if exists "admins can update all inquiries" on public.listing_inquiries;
create policy "admins can update all inquiries" on public.listing_inquiries
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- listing_activity_events
drop policy if exists "owners read listing activity" on public.listing_activity_events;
create policy "owners read listing activity" on public.listing_activity_events
  for select using (public.current_user_can_manage_listing(listing_id));
drop policy if exists "owners insert listing activity" on public.listing_activity_events;
create policy "owners insert listing activity" on public.listing_activity_events
  for insert with check (public.current_user_can_manage_listing(listing_id));
drop policy if exists "admins can read all listing activity" on public.listing_activity_events;
create policy "admins can read all listing activity" on public.listing_activity_events
  for select using (public.current_user_is_admin());
drop policy if exists "admins can insert listing activity" on public.listing_activity_events;
create policy "admins can insert listing activity" on public.listing_activity_events
  for insert with check (public.current_user_is_admin());

-- listing_internal_notes
drop policy if exists "owners can read listing internal notes" on public.listing_internal_notes;
create policy "owners can read listing internal notes" on public.listing_internal_notes
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_internal_notes.listing_id
        and (
          l.created_by = auth.uid()
          or exists (select 1 from public.company_members cm where cm.company_id = l.company_id and cm.user_id = auth.uid())
        )
    )
  );
drop policy if exists "owners can insert listing internal notes" on public.listing_internal_notes;
create policy "owners can insert listing internal notes" on public.listing_internal_notes
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_internal_notes.listing_id
        and (
          l.created_by = auth.uid()
          or exists (select 1 from public.company_members cm where cm.company_id = l.company_id and cm.user_id = auth.uid())
        )
    )
  );
drop policy if exists "admins can read all listing notes" on public.listing_internal_notes;
create policy "admins can read all listing notes" on public.listing_internal_notes
  for select using (public.current_user_is_admin());

-- admin_audit_logs
drop policy if exists "admins can read audit logs" on public.admin_audit_logs;
create policy "admins can read audit logs" on public.admin_audit_logs
  for select using (public.current_user_is_admin());
drop policy if exists "admins can insert audit logs" on public.admin_audit_logs;
create policy "admins can insert audit logs" on public.admin_audit_logs
  for insert with check (public.current_user_is_admin());

-- admin_user_invites
drop policy if exists "admins manage user invites" on public.admin_user_invites;
create policy "admins manage user invites" on public.admin_user_invites
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- privacy_requests
drop policy if exists "users create own privacy requests" on public.privacy_requests;
create policy "users create own privacy requests" on public.privacy_requests
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users read own privacy requests" on public.privacy_requests;
create policy "users read own privacy requests" on public.privacy_requests
  for select to authenticated using (auth.uid() = user_id or public.current_user_is_admin());
drop policy if exists "admins update privacy requests" on public.privacy_requests;
create policy "admins update privacy requests" on public.privacy_requests
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- rate_limit_events (writes happen via the check_rate_limit security definer function)
drop policy if exists "admins read rate limit events" on public.rate_limit_events;
create policy "admins read rate limit events" on public.rate_limit_events
  for select to authenticated using (public.current_user_is_admin());

-- saved_search_notification_runs
drop policy if exists "users read own saved search notification runs" on public.saved_search_notification_runs;
create policy "users read own saved search notification runs" on public.saved_search_notification_runs
  for select to authenticated using (auth.uid() = user_id or public.current_user_is_admin());
drop policy if exists "admins manage saved search notification runs" on public.saved_search_notification_runs;
create policy "admins manage saved search notification runs" on public.saved_search_notification_runs
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- document_access_logs
drop policy if exists "users read own document access logs" on public.document_access_logs;
create policy "users read own document access logs" on public.document_access_logs
  for select to authenticated using (auth.uid() = owner_user_id or public.current_user_is_admin());
drop policy if exists "authenticated users insert document access logs" on public.document_access_logs;
create policy "authenticated users insert document access logs" on public.document_access_logs
  for insert to authenticated with check (auth.uid() = actor_user_id);
drop policy if exists "admins read all document access logs" on public.document_access_logs;
create policy "admins read all document access logs" on public.document_access_logs
  for select to authenticated using (public.current_user_is_admin());

-- ----------------------------------------------------------------------------
-- 9. Storage buckets and policies
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-documents',
  'profile-documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads listing images" on storage.objects;
create policy "public reads listing images" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "users upload own listing images" on storage.objects;
create policy "users upload own listing images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users manage own listing images" on storage.objects;
create policy "users manage own listing images" on storage.objects
  for update to authenticated using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users upload own profile documents" on storage.objects;
create policy "users upload own profile documents" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users manage own profile documents" on storage.objects;
create policy "users manage own profile documents" on storage.objects
  for update to authenticated using (
    bucket_id = 'profile-documents' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'profile-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own profile documents" on storage.objects;
create policy "users delete own profile documents" on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authorized users read profile documents" on storage.objects;
create policy "authorized users read profile documents" on storage.objects
  for select to authenticated using (
    bucket_id = 'profile-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.rental_application_documents rad
        join public.rental_applications ra on ra.id = rad.application_id
        where rad.file_url = ('storage:profile-documents/' || objects.name)
          and (
            rad.user_id = auth.uid()
            or public.current_user_can_manage_application(ra.id)
            or public.current_user_is_admin()
          )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 10. Seed data (idempotent)
-- ----------------------------------------------------------------------------

-- Required by startQueueMembershipAction (user_subscriptions.plan_code FK).
insert into public.subscription_plans (code, name, amount_sek, interval_unit, is_active)
values ('queue_monthly', 'Bovaro Kö+', 49, 'month', true)
on conflict (code) do nothing;
