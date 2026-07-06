-- ============================================================================
-- Batch 10 — Signing functions, finalization and default template
-- ============================================================================
-- Companion to 20260706070000_batch10_viewings_offers_contracts.sql.
-- Safe to re-run.
-- ============================================================================

-- 5. Mock signing (labeled, per-signer) ----------------------------------------------

create or replace function public.mock_sign_contract(p_contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_contract public.contracts%rowtype;
  v_signer public.contract_signers%rowtype;
  v_remaining integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract not found';
  end if;

  if v_contract.provider is distinct from 'mock' or v_contract.status <> 'sent_for_signing' then
    raise exception 'contract is not in mock signing state';
  end if;

  select * into v_signer
  from public.contract_signers
  where contract_id = p_contract_id
    and user_id = auth.uid()
    and status = 'pending'
  limit 1
  for update;

  if not found then
    raise exception 'no pending signature for this user';
  end if;

  update public.contract_signers
  set status = 'signed', signed_at = now()
  where id = v_signer.id;

  insert into public.contract_events (contract_id, actor_user_id, event_type, payload)
  values (p_contract_id, auth.uid(), 'signer_signed_mock', jsonb_build_object('signer_id', v_signer.id));

  select count(*) into v_remaining
  from public.contract_signers
  where contract_id = p_contract_id and status = 'pending';

  if v_remaining = 0 then
    perform public.finalize_signed_contract(p_contract_id);
  end if;

  return jsonb_build_object('contract_id', p_contract_id, 'remaining_signers', v_remaining);
end;
$$;

-- 6. Contract finalization -------------------------------------------------------------

create or replace function public.finalize_signed_contract(p_contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_contract public.contracts%rowtype;
  v_application public.rental_applications%rowtype;
  v_listing record;
  v_skip_reset boolean := false;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract not found';
  end if;

  if v_contract.status = 'signed' then
    return jsonb_build_object('contract_id', p_contract_id, 'already_signed', true);
  end if;

  -- All signers must have signed.
  if exists (select 1 from public.contract_signers where contract_id = p_contract_id and status <> 'signed') then
    raise exception 'not all signers have signed';
  end if;

  update public.contracts
  set status = 'signed', signed_at = now()
  where id = p_contract_id;

  insert into public.contract_events (contract_id, actor_user_id, event_type)
  values (p_contract_id, auth.uid(), 'contract_signed');

  select * into v_application from public.rental_applications where id = v_contract.application_id for update;

  -- Application → signed.
  update public.rental_applications
  set status = 'signed', status_updated_at = now()
  where id = v_application.id;

  insert into public.rental_application_status_history (application_id, actor_user_id, from_status, to_status, note)
  values (v_application.id, auth.uid(), v_application.status, 'signed', 'Kontrakt signerat');

  if v_application.listing_id is not null then
    select id, is_short_term, is_student_housing into v_listing
    from public.listings where id = v_application.listing_id;

    -- Listing → rented.
    update public.listings set status = 'rented' where id = v_application.listing_id;

    insert into public.listing_publications (listing_id, action, actor_user_id, note)
    values (v_application.listing_id, 'rented', auth.uid(), 'Kontrakt signerat');

    -- Competing active applications → rented_to_other (their applicants are
    -- notified by the status trigger).
    update public.rental_applications
    set status = 'rented_to_other', status_updated_at = now()
    where listing_id = v_application.listing_id
      and id <> v_application.id
      and status not in ('signed', 'rejected', 'withdrawn', 'expired', 'rented_to_other', 'draft');

    -- Queue reset rules: skip for short-term and student housing.
    v_skip_reset := coalesce(v_listing.is_short_term, false) or coalesce(v_listing.is_student_housing, false);
  end if;

  if not v_skip_reset and v_application.user_id is not null then
    perform public.reset_queue_points(v_application.user_id, 'Förstahandskontrakt signerat — kötiden nollställs.');
  end if;

  return jsonb_build_object('contract_id', p_contract_id, 'queue_reset', not v_skip_reset);
end;
$$;

-- The finalize function is invoked from mock_sign_contract and by the
-- e-sign webhook (service role). reset_queue_points allows service role and
-- admins; when finalization runs inside mock_sign_contract (definer), the
-- caller is an authenticated user — allow the reset in that path.
create or replace function public.reset_queue_points(p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_membership public.queue_memberships%rowtype;
begin
  -- Allowed: service role (auth.uid() null), admins, or the affected user
  -- (contract finalization path).
  if auth.uid() is not null and not public.current_user_is_admin() and auth.uid() <> p_user_id then
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

-- 7. Seed the platform default contract template ----------------------------------------

insert into public.contract_templates (company_id, name, version, body_template, is_active, created_by)
select
  null,
  'Bovaro standardhyresavtal',
  1,
  E'HYRESAVTAL – FÖRSTAHANDSKONTRAKT\n\nHyresvärd: {{landlord_name}}\nHyresgäst: {{applicant_name}}\nObjekt: {{listing_title}}, {{listing_address}}\nMånadshyra: {{rent}} kr\nTillträde: {{move_in_date}}\n\nAllmänna villkor:\n1. Hyresavtalet gäller tills vidare med tre månaders uppsägningstid, om inte annat anges.\n2. Hyran betalas i förskott senast sista vardagen före varje kalendermånads utgång.\n3. Hyresgästen ansvarar för normal aktsamhet om lägenheten och gemensamma utrymmen.\n4. Andrahandsuthyrning kräver hyresvärdens skriftliga samtycke.\n5. I övrigt gäller hyreslagens (12 kap. jordabalken) bestämmelser.\n\nDetta avtal signeras elektroniskt av samtliga parter.',
  true,
  null
where not exists (
  select 1 from public.contract_templates where company_id is null and name = 'Bovaro standardhyresavtal'
);
