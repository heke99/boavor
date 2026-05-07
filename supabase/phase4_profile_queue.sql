-- Phase 4: profile system + queue system
-- Run after schema.sql

create type public.queue_membership_status as enum ('inactive', 'active', 'paused', 'cancelled', 'expired');
create type public.subscription_status as enum ('pending', 'active', 'paused', 'past_due', 'cancelled', 'expired');
create type public.queue_point_event_type as enum ('enrolled', 'monthly_accrual', 'manual_adjustment', 'paused', 'resumed', 'cancelled');

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
  updated_at timestamptz not null default now()
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
  user_id uuid not null unique references auth.users(id) on delete cascade,
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

create index if not exists idx_co_applicants_user_id on public.co_applicants(user_id);
create index if not exists idx_profile_documents_user_id on public.profile_documents(user_id);
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_queue_point_ledger_user_id on public.queue_point_ledger(user_id);
create index if not exists idx_queue_point_ledger_membership_id on public.queue_point_ledger(membership_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists co_applicants_updated_at on public.co_applicants;
create trigger co_applicants_updated_at
before update on public.co_applicants
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_documents_updated_at on public.profile_documents;
create trigger profile_documents_updated_at
before update on public.profile_documents
for each row execute procedure public.set_updated_at();

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at
before update on public.subscription_plans
for each row execute procedure public.set_updated_at();

drop trigger if exists user_subscriptions_updated_at on public.user_subscriptions;
create trigger user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists queue_memberships_updated_at on public.queue_memberships;
create trigger queue_memberships_updated_at
before update on public.queue_memberships
for each row execute procedure public.set_updated_at();

alter table public.co_applicants enable row level security;
alter table public.profile_documents enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.queue_memberships enable row level security;
alter table public.queue_point_ledger enable row level security;

drop policy if exists "users manage own co_applicants" on public.co_applicants;
create policy "users manage own co_applicants"
on public.co_applicants
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own profile_documents" on public.profile_documents;
create policy "users manage own profile_documents"
on public.profile_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "public can read active subscription plans" on public.subscription_plans;
create policy "public can read active subscription plans"
on public.subscription_plans
for select
using (is_active = true);

drop policy if exists "users manage own subscriptions" on public.user_subscriptions;
create policy "users manage own subscriptions"
on public.user_subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own queue membership" on public.queue_memberships;
create policy "users manage own queue membership"
on public.queue_memberships
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users read own queue ledger" on public.queue_point_ledger;
create policy "users read own queue ledger"
on public.queue_point_ledger
for select
using (auth.uid() = user_id);

drop policy if exists "users insert own queue ledger" on public.queue_point_ledger;
create policy "users insert own queue ledger"
on public.queue_point_ledger
for insert
with check (auth.uid() = user_id);

insert into public.subscription_plans (code, name, amount_sek, interval_unit, is_active)
values ('queue_monthly', 'Bovaro Kö+', 49, 'month', true)
on conflict (code) do update
set name = excluded.name,
    amount_sek = excluded.amount_sek,
    interval_unit = excluded.interval_unit,
    is_active = excluded.is_active,
    updated_at = now();
