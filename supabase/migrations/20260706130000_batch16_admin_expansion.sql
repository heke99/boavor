-- ============================================================================
-- Batch 16 — Admin expansion: platform settings, support mode, risk rules
-- ============================================================================
-- * platform_settings: key/value configuration with public/internal split.
--   Only super admins write; admins read everything; anon reads is_public.
-- * support_access_grants: time-limited, reason-mandatory, revocable read
--   access to a message thread for one admin ("support mode"). This is the
--   impersonation guardrail: admins never act AS a user — they get audited,
--   expiring read-only access instead. New SELECT-only policies on the
--   messaging tables key off an active grant; there is deliberately no
--   INSERT policy, so support mode can never post.
-- * Automatic risk rule: 3+ distinct reporters on the same exchange profile
--   opens a user_risk_flags entry for the profile owner.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Platform settings --------------------------------------------------------

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists platform_settings_updated_at on public.platform_settings;
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists "public reads public settings" on public.platform_settings;
create policy "public reads public settings" on public.platform_settings
  for select using (is_public = true);
drop policy if exists "admins read all settings" on public.platform_settings;
create policy "admins read all settings" on public.platform_settings
  for select using (public.current_user_is_admin());
drop policy if exists "super admins manage settings" on public.platform_settings;
create policy "super admins manage settings" on public.platform_settings
  for all using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin());

insert into public.platform_settings (key, value, description, is_public)
values
  ('maintenance_mode', '{"enabled": false, "message": ""}'::jsonb, 'Underhållsläge: visar banner och kan stänga skrivflöden (används av Batch 25-ops).', true),
  ('support_access_max_hours', '{"hours": 4}'::jsonb, 'Maximal giltighetstid för support-åtkomst till konversationer.', false),
  ('risk_report_threshold', '{"distinct_reporters": 3}'::jsonb, 'Antal unika anmälare som automatiskt öppnar en riskflagga.', false)
on conflict (key) do nothing;

-- 2. Support access grants ----------------------------------------------------

create table if not exists public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) >= 10),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists support_access_grants_admin_idx
  on public.support_access_grants (admin_user_id, thread_id, expires_at desc);
create index if not exists support_access_grants_thread_idx
  on public.support_access_grants (thread_id, created_at desc);

alter table public.support_access_grants enable row level security;

drop policy if exists "admins read support grants" on public.support_access_grants;
create policy "admins read support grants" on public.support_access_grants
  for select using (public.current_user_is_admin());
drop policy if exists "admins create own support grants" on public.support_access_grants;
create policy "admins create own support grants" on public.support_access_grants
  for insert with check (
    public.current_user_is_admin() and admin_user_id = auth.uid()
  );
drop policy if exists "admins revoke support grants" on public.support_access_grants;
create policy "admins revoke support grants" on public.support_access_grants
  for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Active-grant check used by the messaging read policies below.
create or replace function public.current_user_has_support_access(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.current_user_is_admin() and exists (
    select 1
    from public.support_access_grants g
    where g.thread_id = target_thread_id
      and g.admin_user_id = auth.uid()
      and g.revoked_at is null
      and g.expires_at > now()
  );
$$;

-- Read-only support access to messaging (no insert policies on purpose).
drop policy if exists "support mode reads threads" on public.message_threads;
create policy "support mode reads threads" on public.message_threads
  for select using (public.current_user_has_support_access(id));

drop policy if exists "support mode reads participants" on public.message_participants;
create policy "support mode reads participants" on public.message_participants
  for select using (public.current_user_has_support_access(thread_id));

drop policy if exists "support mode reads messages" on public.messages;
create policy "support mode reads messages" on public.messages
  for select using (public.current_user_has_support_access(thread_id));

drop policy if exists "support mode reads attachments" on public.message_attachments;
create policy "support mode reads attachments" on public.message_attachments
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and public.current_user_has_support_access(m.thread_id)
    )
  );

drop policy if exists "support mode reads message events" on public.message_events;
create policy "support mode reads message events" on public.message_events
  for select using (public.current_user_has_support_access(thread_id));

-- 3. Automatic risk rule: repeated exchange reports --------------------------

create or replace function public.flag_repeated_exchange_reports()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
  v_reporters integer;
  v_threshold integer;
begin
  select user_id into v_owner from public.exchange_profiles where id = new.profile_id;
  if v_owner is null then
    return new;
  end if;

  select coalesce((value->>'distinct_reporters')::integer, 3)
    into v_threshold
    from public.platform_settings
    where key = 'risk_report_threshold';
  if v_threshold is null then
    v_threshold := 3;
  end if;

  select count(distinct reporter_user_id) into v_reporters
  from public.exchange_reports
  where profile_id = new.profile_id;

  if v_reporters >= v_threshold and not exists (
    select 1 from public.user_risk_flags
    where user_id = v_owner
      and flag_type = 'multiple_exchange_reports'
      and resolved_at is null
  ) then
    insert into public.user_risk_flags (user_id, flag_type, severity, note, metadata)
    values (
      v_owner,
      'multiple_exchange_reports',
      'high',
      'Automatisk flagga: minst ' || v_threshold || ' unika anmälningar mot användarens bytesannons.',
      jsonb_build_object('profile_id', new.profile_id, 'distinct_reporters', v_reporters)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists exchange_reports_risk_rule on public.exchange_reports;
create trigger exchange_reports_risk_rule after insert on public.exchange_reports
  for each row execute function public.flag_repeated_exchange_reports();
