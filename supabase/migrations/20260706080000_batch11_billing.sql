-- ============================================================================
-- Batch 11 — Stripe billing and entitlements
-- ============================================================================
-- Extends the existing subscription model additively:
-- * subscription_plans gains Stripe price id, audience, visibility, features.
-- * company_subscriptions: landlord plans bound to companies.
-- * billing_customers: Stripe customer mapping (user or company).
-- * billing_events: webhook idempotency + audit (unique Stripe event id).
-- * Seeker/landlord plan seeds (inactive until priced by the admin).
--
-- Entitlements are always resolved server-side from these tables; the
-- application-limit engine (Batch 4) already reads
-- subscription_plans.max_active_applications.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Plan extensions ---------------------------------------------------------------

alter table public.subscription_plans add column if not exists stripe_price_id text;
alter table public.subscription_plans add column if not exists plan_audience text not null default 'seeker'
  check (plan_audience in ('seeker', 'landlord'));
alter table public.subscription_plans add column if not exists description text;
alter table public.subscription_plans add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.subscription_plans add column if not exists is_public boolean not null default true;
alter table public.subscription_plans add column if not exists trial_days integer;

update public.subscription_plans
set description = 'Kostnadsfri bostadskö med 5 aktiva ansökningar.',
    plan_audience = 'seeker',
    features = '["Kostnadsfri bostadskö", "5 aktiva ansökningar", "Sökbevakningar"]'::jsonb
where code = 'queue_monthly' and description is null;

update public.subscription_plans
set description = 'För dig som söker aktivt: fler ansökningar och detaljerad Matchkoll.',
    plan_audience = 'seeker',
    features = '["10 aktiva ansökningar", "Detaljerad Matchkoll", "Prioriterad support"]'::jsonb
where code = 'bovaro_plus' and description is null;

insert into public.subscription_plans (code, name, amount_sek, interval_unit, is_active, plan_audience, description, features, is_public, max_active_applications)
values
  ('landlord_starter', 'Hyresvärd Starter', 0, 'month', false, 'landlord', 'För mindre hyresvärdar: annonser, ansökningar och urval.', '["Obegränsade annonser", "Ansökningshantering", "Matchkoll"]'::jsonb, true, null),
  ('landlord_professional', 'Hyresvärd Professional', 990, 'month', false, 'landlord', 'För växande bestånd: team, policyer och visningar.', '["Allt i Starter", "Team och roller", "Visningar och erbjudanden", "Kontrakt med e-signering"]'::jsonb, true, null),
  ('landlord_enterprise', 'Hyresvärd Enterprise', 0, 'month', false, 'landlord', 'För stora fastighetsbolag: API, white label och SLA. Kontakta oss för pris.', '["Allt i Professional", "Publikt API", "White label-portal", "Dedikerad support"]'::jsonb, true, null)
on conflict (code) do nothing;

-- 2. Company subscriptions ----------------------------------------------------------

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code) on delete restrict,
  provider text not null default 'stripe',
  provider_subscription_id text,
  status public.subscription_status not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, plan_code)
);

create index if not exists company_subscriptions_company_idx on public.company_subscriptions (company_id);

drop trigger if exists company_subscriptions_updated_at on public.company_subscriptions;
create trigger company_subscriptions_updated_at before update on public.company_subscriptions
  for each row execute function public.set_updated_at();

alter table public.company_subscriptions enable row level security;

drop policy if exists "company members read company subscriptions" on public.company_subscriptions;
create policy "company members read company subscriptions" on public.company_subscriptions
  for select using (public.current_user_can_manage_company(company_id));
drop policy if exists "admins read company subscriptions" on public.company_subscriptions;
create policy "admins read company subscriptions" on public.company_subscriptions
  for select using (public.current_user_is_admin());
-- Writes happen via the Stripe webhook (service role) and admin grants.

-- 3. Billing customers ---------------------------------------------------------------

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  constraint billing_customers_owner_check check (user_id is not null or company_id is not null)
);

create unique index if not exists billing_customers_user_idx on public.billing_customers (user_id) where user_id is not null;
create unique index if not exists billing_customers_company_idx on public.billing_customers (company_id) where company_id is not null;

alter table public.billing_customers enable row level security;

drop policy if exists "users read own billing customer" on public.billing_customers;
create policy "users read own billing customer" on public.billing_customers
  for select using (
    user_id = auth.uid() or public.current_user_can_manage_company(company_id)
  );
drop policy if exists "admins read billing customers" on public.billing_customers;
create policy "admins read billing customers" on public.billing_customers
  for select using (public.current_user_is_admin());

-- 4. Billing events (webhook idempotency + audit) --------------------------------------

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_type_idx on public.billing_events (event_type, created_at desc);

alter table public.billing_events enable row level security;

drop policy if exists "admins read billing events" on public.billing_events;
create policy "admins read billing events" on public.billing_events
  for select using (public.current_user_is_admin());
-- Writes happen via the webhook (service role only).

-- 5. Admin plan management policies ------------------------------------------------------

drop policy if exists "super admins manage plans" on public.subscription_plans;
create policy "super admins manage plans" on public.subscription_plans
  for all using (public.current_user_is_super_admin())
  with check (public.current_user_is_super_admin());

-- Admins can read all plans (including inactive) for the pricing admin.
drop policy if exists "admins read all plans" on public.subscription_plans;
create policy "admins read all plans" on public.subscription_plans
  for select using (public.current_user_is_admin());

-- Admin complimentary grants need insert/update on user_subscriptions.
drop policy if exists "admins manage user subscriptions" on public.user_subscriptions;
create policy "admins manage user subscriptions" on public.user_subscriptions
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
drop policy if exists "admins manage company subscriptions" on public.company_subscriptions;
create policy "admins manage company subscriptions" on public.company_subscriptions
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
