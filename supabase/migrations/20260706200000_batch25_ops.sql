-- ============================================================================
-- Batch 25 — Operations: incidents and integration failures
-- ============================================================================
-- * incident_reports: internal incident log (open → monitoring → resolved).
-- * integration_failures: failures from external integrations (email,
--   webhooks, …) recorded by the app so ops can see and resolve them.
--   Written via service role or admin sessions.
--
-- Maintenance mode already lives in platform_settings (Batch 16).
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  severity text not null default 'minor' check (severity in ('minor', 'major', 'critical')),
  status text not null default 'open' check (status in ('open', 'monitoring', 'resolved')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incident_reports_status_idx on public.incident_reports (status, started_at desc);

drop trigger if exists incident_reports_updated_at on public.incident_reports;
create trigger incident_reports_updated_at before update on public.incident_reports
  for each row execute function public.set_updated_at();

create table if not exists public.integration_failures (
  id uuid primary key default gen_random_uuid(),
  integration text not null
    check (integration in ('stripe', 'resend', 'bankid', 'esign', 'webhook', 'push', 'geocoding', 'other')),
  operation text not null,
  error text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists integration_failures_open_idx on public.integration_failures (integration, created_at desc)
  where status = 'open';

alter table public.incident_reports enable row level security;
alter table public.integration_failures enable row level security;

drop policy if exists "admins manage incidents" on public.incident_reports;
create policy "admins manage incidents" on public.incident_reports
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "admins manage integration failures" on public.integration_failures;
create policy "admins manage integration failures" on public.integration_failures
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
