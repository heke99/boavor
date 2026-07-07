-- ============================================================================
-- RLS regression checks (Batch 17)
-- ============================================================================
-- Runs as one transaction and ALWAYS rolls back — safe against any
-- environment. Each check raises an exception on failure, so a clean run
-- (ending with NOTICE "ALL RLS CHECKS PASSED") means the invariants hold.
--
-- Requirements: two seeded users referenced below must exist in auth.users
-- (any Bovaro environment bootstrapped from the baseline has them; otherwise
-- replace the UUIDs with two real users where the second is super_admin).
--
-- Run: psql "$DATABASE_URL" -f supabase/tests/rls_checks.sql
-- ============================================================================

begin;

do $$
declare
  v_seeker uuid;
  v_admin uuid;
  v_thread uuid := '99999999-9999-4999-8999-999999999999';
  v_count bigint;
begin
  -- Pick a seeker and an admin from the environment.
  select id into v_seeker from public.profiles where role = 'seeker' limit 1;
  select id into v_admin from public.profiles where role in ('admin', 'super_admin') limit 1;
  if v_seeker is null or v_admin is null then
    raise exception 'RLS checks need one seeker and one admin user in profiles';
  end if;

  -- --------------------------------------------------------------------------
  -- 1. Anon must not read internal tables
  -- --------------------------------------------------------------------------
  insert into public.analytics_events (event_type, user_id) values ('listing_view', v_seeker);

  set local role anon;
  select count(*) into v_count from public.analytics_events;
  if v_count <> 0 then raise exception 'FAIL: anon can read analytics_events'; end if;
  select count(*) into v_count from public.profiles;
  if v_count <> 0 then raise exception 'FAIL: anon can read profiles'; end if;
  select count(*) into v_count from public.user_risk_flags;
  if v_count <> 0 then raise exception 'FAIL: anon can read user_risk_flags'; end if;
  select count(*) into v_count from public.message_threads;
  if v_count <> 0 then raise exception 'FAIL: anon can read message_threads'; end if;
  reset role;

  -- --------------------------------------------------------------------------
  -- 2. Whitelist in track_analytics_event
  -- --------------------------------------------------------------------------
  begin
    perform public.track_analytics_event('not_a_real_event');
    raise exception 'FAIL: track_analytics_event accepted an unknown event type';
  exception
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if; -- re-raise our own failure
  end;

  -- --------------------------------------------------------------------------
  -- 3. User isolation: a user cannot read someone else's risk flags/favorites
  -- --------------------------------------------------------------------------
  insert into public.user_risk_flags (user_id, flag_type, severity) values (v_seeker, 'manual', 'low');

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_seeker, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.user_risk_flags;
  if v_count <> 0 then raise exception 'FAIL: user can read own risk flags (should be admin-only)'; end if;
  reset role;

  -- --------------------------------------------------------------------------
  -- 4. Support mode lifecycle on messaging
  -- --------------------------------------------------------------------------
  insert into public.message_threads (id, thread_type, subject, created_by)
  values (v_thread, 'application', 'RLS-check', v_seeker);
  insert into public.message_participants (thread_id, user_id, participant_role)
  values (v_thread, v_seeker, 'applicant');
  insert into public.messages (thread_id, sender_user_id, body)
  values (v_thread, v_seeker, 'hemligt');

  -- 4a. Admin without grant: no access.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.message_threads where id = v_thread;
  if v_count <> 0 then raise exception 'FAIL: admin reads thread without support grant'; end if;
  reset role;

  -- 4b. Active grant: read access to thread + messages.
  insert into public.support_access_grants (admin_user_id, thread_id, reason, expires_at)
  values (v_admin, v_thread, 'RLS-kontroll av supportläge', now() + interval '1 hour');

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.message_threads where id = v_thread;
  if v_count <> 1 then raise exception 'FAIL: admin with grant cannot read thread'; end if;
  select count(*) into v_count from public.messages where thread_id = v_thread;
  if v_count <> 1 then raise exception 'FAIL: admin with grant cannot read messages'; end if;

  -- 4c. Support mode must never be able to post.
  begin
    insert into public.messages (thread_id, sender_user_id, body) values (v_thread, v_admin, 'should fail');
    raise exception 'FAIL: support mode could post a message';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  reset role;

  -- 4d. Revoked grant: access closed.
  update public.support_access_grants set revoked_at = now() where thread_id = v_thread;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.message_threads where id = v_thread;
  if v_count <> 0 then raise exception 'FAIL: admin reads thread after revocation'; end if;
  reset role;

  -- --------------------------------------------------------------------------
  -- 5. Platform settings: anon sees only public keys
  -- --------------------------------------------------------------------------
  -- Clear JWT claims set by earlier steps; anon requests carry no claims.
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into v_count from public.platform_settings where is_public = false;
  if v_count <> 0 then raise exception 'FAIL: anon can read internal platform settings'; end if;
  select count(*) into v_count from public.platform_settings where is_public = true;
  if v_count = 0 then raise exception 'FAIL: anon cannot read public platform settings'; end if;
  reset role;

  raise notice 'ALL RLS CHECKS PASSED';
end;
$$;

-- ============================================================================
-- Production hardening checks (20260707000000_production_hardening.sql)
-- ============================================================================

do $$
declare
  v_seeker uuid;
  v_listing uuid := '88888888-8888-4888-8888-888888888888';
  v_application uuid;
  v_synced uuid;
begin
  select id into v_seeker from public.profiles where role = 'seeker' limit 1;
  if v_seeker is null then
    raise exception 'Hardening checks need one seeker user in profiles';
  end if;

  -- --------------------------------------------------------------------------
  -- 6. profiles_role_guard: a user cannot escalate their own role to admin
  -- --------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_seeker, 'role', 'authenticated')::text, true);
  begin
    update public.profiles set role = 'admin' where id = v_seeker;
    raise exception 'FAIL: user escalated own role to admin';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- --------------------------------------------------------------------------
  -- 7. rental_applications trigger keeps user_id/applicant_user_id in sync
  -- --------------------------------------------------------------------------
  insert into public.listings (id, created_by, title, slug, listing_type, property_type, city)
  values (v_listing, v_seeker, 'RLS-check listing', 'rls-check-' || extract(epoch from now())::bigint, 'rent', 'apartment', 'Teststad');

  insert into public.rental_applications (listing_id, user_id, status)
  values (v_listing, v_seeker, 'submitted')
  returning id into v_application;

  select applicant_user_id into v_synced from public.rental_applications where id = v_application;
  if v_synced is distinct from v_seeker then
    raise exception 'FAIL: applicant_user_id was not synced from user_id';
  end if;

  -- --------------------------------------------------------------------------
  -- 8. Duplicate active applications per (listing, user) are blocked
  -- --------------------------------------------------------------------------
  begin
    insert into public.rental_applications (listing_id, user_id, status)
    values (v_listing, v_seeker, 'submitted');
    raise exception 'FAIL: duplicate active application was allowed';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Withdrawn rows must not block a re-apply.
  update public.rental_applications set status = 'withdrawn' where id = v_application;
  insert into public.rental_applications (listing_id, user_id, status)
  values (v_listing, v_seeker, 'submitted');

  raise notice 'ALL HARDENING CHECKS PASSED';
end;
$$;

rollback;
