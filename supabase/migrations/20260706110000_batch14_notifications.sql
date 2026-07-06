-- ============================================================================
-- Batch 14 — Notifications, email events and cron run logs
-- ============================================================================
-- * email_events: audit of every outgoing email (sent/skipped/failed).
-- * notification_preferences: per-user, per-category email toggles.
-- * notifications gains category + link for the notification center.
-- * cron_run_logs: start/finish/status for every scheduled job.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  template_key text not null,
  subject text not null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  skip_reason text,
  provider text,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_events_user_idx on public.email_events (user_id, created_at desc);
create index if not exists email_events_template_idx on public.email_events (template_key, created_at desc);

alter table public.email_events enable row level security;

drop policy if exists "admins read email events" on public.email_events;
create policy "admins read email events" on public.email_events
  for select using (public.current_user_is_admin());
-- Writes happen via the service role / server actions.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_applications boolean not null default true,
  email_messages boolean not null default true,
  email_queue boolean not null default true,
  email_saved_searches boolean not null default true,
  email_byta boolean not null default true,
  email_marketing boolean not null default false,
  weekly_digest boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "users manage own notification preferences" on public.notification_preferences;
create policy "users manage own notification preferences" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notification center metadata.
alter table public.notifications add column if not exists category text not null default 'general';
alter table public.notifications add column if not exists link text;

create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;

create table if not exists public.cron_run_logs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists cron_run_logs_job_idx on public.cron_run_logs (job_name, started_at desc);

alter table public.cron_run_logs enable row level security;

drop policy if exists "admins read cron run logs" on public.cron_run_logs;
create policy "admins read cron run logs" on public.cron_run_logs
  for select using (public.current_user_is_admin());
-- Writes happen via the service role.
