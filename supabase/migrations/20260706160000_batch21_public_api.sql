-- ============================================================================
-- Batch 21 — Public API keys, request logs and signed webhooks
-- ============================================================================
-- * api_keys: hashed keys (sha256) — the plaintext secret is shown once at
--   creation and never stored. Scopes limit what each key can read.
-- * api_request_logs: per-request audit (path, status, hashed key id).
-- * webhook_endpoints: outbound webhook destinations with a signing secret
--   (stored server-side; required for HMAC signing of deliveries).
-- * webhook_deliveries: queued deliveries with retry/backoff and dead-letter.
-- * enqueue_webhook_event(): definer function so application flows (running
--   as the applicant) can enqueue events for the LANDLORD's endpoints.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint api_keys_owner_check check (company_id is not null or owner_user_id is not null)
);

create index if not exists api_keys_company_idx on public.api_keys (company_id);
create index if not exists api_keys_owner_idx on public.api_keys (owner_user_id);

create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete cascade,
  method text not null,
  path text not null,
  status_code integer not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists api_request_logs_key_idx on public.api_request_logs (api_key_id, created_at desc);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  constraint webhook_endpoints_owner_check check (company_id is not null or owner_user_id is not null),
  constraint webhook_endpoints_url_check check (url like 'https://%')
);

create index if not exists webhook_endpoints_company_idx on public.webhook_endpoints (company_id);
create index if not exists webhook_endpoints_owner_idx on public.webhook_endpoints (owner_user_id);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed', 'dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  response_status integer,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists webhook_deliveries_due_idx on public.webhook_deliveries (next_attempt_at)
  where status in ('pending', 'failed');
create index if not exists webhook_deliveries_endpoint_idx on public.webhook_deliveries (endpoint_id, created_at desc);

-- RLS -------------------------------------------------------------------------

alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

create or replace function public.current_user_owns_api_resource(target_company_id uuid, target_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    target_owner_user_id = auth.uid()
    or (target_company_id is not null and exists (
      select 1 from public.company_members cm
      where cm.company_id = target_company_id and cm.user_id = auth.uid()
    ));
$$;

drop policy if exists "owners manage api keys" on public.api_keys;
create policy "owners manage api keys" on public.api_keys
  for all using (public.current_user_owns_api_resource(company_id, owner_user_id))
  with check (public.current_user_owns_api_resource(company_id, owner_user_id));

drop policy if exists "owners read api request logs" on public.api_request_logs;
create policy "owners read api request logs" on public.api_request_logs
  for select using (
    exists (
      select 1 from public.api_keys k
      where k.id = api_request_logs.api_key_id
        and public.current_user_owns_api_resource(k.company_id, k.owner_user_id)
    )
  );

drop policy if exists "owners manage webhook endpoints" on public.webhook_endpoints;
create policy "owners manage webhook endpoints" on public.webhook_endpoints
  for all using (public.current_user_owns_api_resource(company_id, owner_user_id))
  with check (public.current_user_owns_api_resource(company_id, owner_user_id));

drop policy if exists "owners read webhook deliveries" on public.webhook_deliveries;
create policy "owners read webhook deliveries" on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhook_endpoints e
      where e.id = webhook_deliveries.endpoint_id
        and public.current_user_owns_api_resource(e.company_id, e.owner_user_id)
    )
  );

-- Enqueue helper: fan out one event to all matching active endpoints for the
-- given owner (company and/or user). SECURITY DEFINER because the acting
-- session (e.g. an applicant submitting an application) has no access to the
-- landlord's webhook rows.
create or replace function public.enqueue_webhook_event(
  p_event_type text,
  p_company_id uuid,
  p_owner_user_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer := 0;
begin
  insert into public.webhook_deliveries (endpoint_id, event_type, payload)
  select e.id, p_event_type, coalesce(p_payload, '{}'::jsonb)
  from public.webhook_endpoints e
  where e.is_active = true
    and p_event_type = any (e.events)
    and (
      (p_company_id is not null and e.company_id = p_company_id)
      or (p_owner_user_id is not null and e.owner_user_id = p_owner_user_id)
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
