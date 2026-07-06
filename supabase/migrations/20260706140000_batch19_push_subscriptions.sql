-- ============================================================================
-- Batch 19 — Web Push subscriptions
-- ============================================================================
-- One row per browser push subscription. Endpoint + keys are only usable
-- with the platform's VAPID private key; still treated as sensitive:
-- users manage their own rows and nobody else (not even admins) can read
-- them — delivery happens via the service role in cron jobs.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  disabled_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id)
  where disabled_at is null;

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
