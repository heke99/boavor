-- ============================================================================
-- Batch 4 — Queue engine: daily points, ledger-driven accrual, limits, admin
-- ============================================================================
-- * Queue points become deterministic: 1 point per day since joined_queue_at,
--   awarded idempotently by a scheduled job (points = floor(days in queue)).
-- * All point changes flow through queue_point_ledger.
-- * Admins can adjust points, freeze memberships and inspect ledgers (audited).
-- * Application limits come from subscription plans
--   (subscription_plans.max_active_applications, free default 5).
-- * Queue membership is free; the reset hook exists for signed contracts.
--
-- Safe to re-run (enum additions are additive and irreversible).
-- ============================================================================

-- 1. Enum additions --------------------------------------------------------------

alter type public.queue_point_event_type add value if not exists 'daily_accrual';
alter type public.queue_point_event_type add value if not exists 'reset';

-- 2. Columns ----------------------------------------------------------------------

alter table public.queue_memberships add column if not exists points_reset_at timestamptz;
alter table public.queue_memberships add column if not exists queue_type text not null default 'central';
alter table public.subscription_plans add column if not exists max_active_applications integer;

update public.subscription_plans
set name = 'Bovaro bostadskö', amount_sek = 0, max_active_applications = 5
where code = 'queue_monthly';

insert into public.subscription_plans (code, name, amount_sek, interval_unit, is_active, max_active_applications)
values ('bovaro_plus', 'Bovaro Plus', 99, 'month', false, 10)
on conflict (code) do update set max_active_applications = excluded.max_active_applications;

create index if not exists queue_memberships_status_idx
  on public.queue_memberships (membership_status)
  where membership_status = 'active';

-- 3. Admin RLS on queue tables ------------------------------------------------------

drop policy if exists "admins read all queue memberships" on public.queue_memberships;
create policy "admins read all queue memberships" on public.queue_memberships
  for select using (public.current_user_is_admin());

drop policy if exists "admins read all queue ledgers" on public.queue_point_ledger;
create policy "admins read all queue ledgers" on public.queue_point_ledger
  for select using (public.current_user_is_admin());

-- 4. Daily accrual (called by the cron job through the service role) ----------------

create or replace function public.award_queue_points_daily()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_membership record;
  v_days integer;
  v_delta integer;
  v_processed integer := 0;
  v_awarded integer := 0;
begin
  for v_membership in
    select id, user_id, joined_queue_at, current_points, points_reset_at
    from public.queue_memberships
    where membership_status = 'active'
      and joined_queue_at is not null
  loop
    v_processed := v_processed + 1;

    -- Points = whole days since the later of joined_queue_at / points_reset_at.
    v_days := floor(
      extract(epoch from (now() - greatest(v_membership.joined_queue_at, coalesce(v_membership.points_reset_at, v_membership.joined_queue_at)))) / 86400
    )::integer;

    if v_days > v_membership.current_points then
      v_delta := v_days - v_membership.current_points;

      update public.queue_memberships
      set current_points = v_days,
          months_in_queue = floor(v_days / 30),
          last_point_awarded_at = now(),
          updated_at = now()
      where id = v_membership.id;

      insert into public.queue_point_ledger (user_id, membership_id, event_type, points_delta, balance_after, note)
      values (
        v_membership.user_id,
        v_membership.id,
        'daily_accrual',
        v_delta,
        v_days,
        v_delta || ' köpoäng tillagda (1 poäng per dag i kön).'
      );

      v_awarded := v_awarded + 1;
    end if;
  end loop;

  return jsonb_build_object('processed', v_processed, 'awarded', v_awarded);
end;
$$;

-- Only the service role (cron) may execute the batch accrual.
revoke execute on function public.award_queue_points_daily() from public;
revoke execute on function public.award_queue_points_daily() from anon;
revoke execute on function public.award_queue_points_daily() from authenticated;
grant execute on function public.award_queue_points_daily() to service_role;

-- 5. Admin adjustment (audited) -------------------------------------------------------

create or replace function public.admin_adjust_queue_points(
  p_user_id uuid,
  p_delta integer,
  p_note text,
  p_joined_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_membership public.queue_memberships%rowtype;
  v_new_balance integer;
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'note required';
  end if;

  select * into v_membership
  from public.queue_memberships
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'membership not found';
  end if;

  v_new_balance := greatest(0, v_membership.current_points + coalesce(p_delta, 0));

  update public.queue_memberships
  set current_points = v_new_balance,
      joined_queue_at = coalesce(p_joined_at, joined_queue_at),
      updated_at = now()
  where id = v_membership.id;

  insert into public.queue_point_ledger (user_id, membership_id, event_type, points_delta, balance_after, note)
  values (p_user_id, v_membership.id, 'manual_adjustment', coalesce(p_delta, 0), v_new_balance, p_note);

  insert into public.admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'queue_points_adjusted',
    'queue_membership',
    v_membership.id,
    jsonb_build_object('user_id', p_user_id, 'delta', p_delta, 'note', p_note, 'joined_at', p_joined_at)
  );

  return jsonb_build_object('user_id', p_user_id, 'balance', v_new_balance);
end;
$$;

-- 6. Admin freeze/unfreeze (audited) ---------------------------------------------------

create or replace function public.admin_set_queue_status(
  p_user_id uuid,
  p_status public.queue_membership_status,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_membership public.queue_memberships%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_membership
  from public.queue_memberships
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'membership not found';
  end if;

  update public.queue_memberships
  set membership_status = p_status,
      updated_at = now()
  where id = v_membership.id;

  insert into public.queue_point_ledger (user_id, membership_id, event_type, points_delta, balance_after, note)
  values (
    p_user_id,
    v_membership.id,
    case when p_status = 'active' then 'resumed' else 'paused' end,
    0,
    v_membership.current_points,
    coalesce(p_note, 'Status ändrad av admin')
  );

  insert into public.admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'queue_status_changed',
    'queue_membership',
    v_membership.id,
    jsonb_build_object('user_id', p_user_id, 'status', p_status, 'note', p_note)
  );

  return jsonb_build_object('user_id', p_user_id, 'status', p_status);
end;
$$;

-- 7. Queue reset (used when a first-hand contract is signed; Batch 10 hooks in) --------

create or replace function public.reset_queue_points(p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_membership public.queue_memberships%rowtype;
begin
  -- Callable by admins and by the service role (contract signing flow).
  if auth.uid() is not null and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_membership
  from public.queue_memberships
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('user_id', p_user_id, 'reset', false);
  end if;

  update public.queue_memberships
  set current_points = 0,
      months_in_queue = 0,
      points_reset_at = now(),
      updated_at = now()
  where id = v_membership.id;

  insert into public.queue_point_ledger (user_id, membership_id, event_type, points_delta, balance_after, note)
  values (p_user_id, v_membership.id, 'reset', -v_membership.current_points, 0, coalesce(p_reason, 'Köpoäng nollställda'));

  return jsonb_build_object('user_id', p_user_id, 'reset', true);
end;
$$;

revoke execute on function public.reset_queue_points(uuid, text) from public;
revoke execute on function public.reset_queue_points(uuid, text) from anon;
grant execute on function public.reset_queue_points(uuid, text) to authenticated;
grant execute on function public.reset_queue_points(uuid, text) to service_role;

-- 8. Household queue points for the max/average/primary co-applicant rule ---------------
-- Returns queue points for the accepted, linked co-applicants of the caller.

create or replace function public.household_queue_points()
returns table(user_id uuid, points integer)
language sql
security definer
set search_path to 'public'
as $$
  select qm.user_id, qm.current_points
  from public.co_applicants ca
  join public.queue_memberships qm on qm.user_id = ca.invited_user_id
  where ca.user_id = auth.uid()
    and ca.invite_status = 'accepted'
    and ca.invited_user_id is not null
    and qm.membership_status = 'active';
$$;

-- 9. Admin membership overview (points + user info without sensitive data) ---------------

create or replace function public.admin_queue_overview()
returns table(
  membership_id uuid,
  user_id uuid,
  membership_status public.queue_membership_status,
  queue_type text,
  joined_queue_at timestamptz,
  current_points integer,
  points_reset_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select qm.id, qm.user_id, qm.membership_status, qm.queue_type, qm.joined_queue_at, qm.current_points, qm.points_reset_at
  from public.queue_memberships qm
  order by qm.created_at desc
  limit 500;
end;
$$;
