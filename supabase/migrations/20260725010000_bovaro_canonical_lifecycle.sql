-- ============================================================================
-- Bovaro canonical lifecycle
-- Companies remain the canonical tenant root. This migration completes the
-- post-signing lifecycle without introducing parallel company/person models.
-- Monetary values are stored as integer öre.
-- ============================================================================

create extension if not exists pgcrypto;

-- Canonical numbering ---------------------------------------------------------

create table if not exists public.company_number_sequences (
  company_id uuid not null references public.companies(id) on delete cascade,
  object_type text not null,
  next_value bigint not null default 1 check (next_value > 0),
  prefix text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, object_type)
);

alter table public.company_number_sequences enable row level security;

create or replace function public.next_company_number_internal(
  p_company_id uuid,
  p_object_type text,
  p_prefix text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
begin
  insert into public.company_number_sequences (company_id, object_type, prefix, next_value)
  values (p_company_id, p_object_type, upper(p_prefix), 2)
  on conflict (company_id, object_type)
  do update set
    next_value = company_number_sequences.next_value + 1,
    prefix = excluded.prefix,
    updated_at = now()
  returning next_value - 1 into v_value;

  return upper(p_prefix) || '-' || to_char(current_date, 'YYYY') || '-' || lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function public.next_company_number_internal(uuid, text, text) from public, anon, authenticated;

create or replace function public.next_company_number(
  p_company_id uuid,
  p_object_type text,
  p_prefix text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.current_user_can_manage_company(p_company_id)
     and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;
  return public.next_company_number_internal(p_company_id, p_object_type, p_prefix);
end;
$$;

-- Canonical domain events and transactional outbox ----------------------------

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists domain_events_company_time_idx
  on public.domain_events (company_id, occurred_at desc);
create index if not exists domain_events_aggregate_idx
  on public.domain_events (aggregate_type, aggregate_id, occurred_at);

create table if not exists public.outbox_events (
  id uuid primary key references public.domain_events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'retry', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists outbox_claim_idx
  on public.outbox_events (available_at, created_at)
  where status in ('pending', 'retry');

alter table public.domain_events enable row level security;
alter table public.outbox_events enable row level security;

create policy "company members read domain events" on public.domain_events
  for select using (
    company_id = any(public.current_user_company_ids()) or public.current_user_is_admin()
  );
create policy "admins read outbox" on public.outbox_events
  for select using (public.current_user_is_admin());

create or replace function public.emit_domain_event(
  p_company_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_correlation_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_correlation_id uuid := coalesce(p_correlation_id, gen_random_uuid());
begin
  insert into public.domain_events (
    id, company_id, aggregate_type, aggregate_id, event_type,
    correlation_id, actor_user_id, payload
  ) values (
    v_id, p_company_id, p_aggregate_type, p_aggregate_id, p_event_type,
    v_correlation_id, auth.uid(), coalesce(p_payload, '{}'::jsonb)
  );

  insert into public.outbox_events (id, company_id, event_type, payload)
  values (
    v_id,
    p_company_id,
    p_event_type,
    jsonb_build_object(
      'event_id', v_id,
      'company_id', p_company_id,
      'aggregate_type', p_aggregate_type,
      'aggregate_id', p_aggregate_id,
      'event_type', p_event_type,
      'schema_version', 1,
      'correlation_id', v_correlation_id,
      'data', coalesce(p_payload, '{}'::jsonb)
    )
  );
  return v_id;
end;
$$;

create or replace function public.claim_outbox_events(
  p_worker_id text,
  p_limit integer default 50
) returns setof public.outbox_events
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with claimed as (
    select id
    from public.outbox_events
    where status in ('pending', 'retry') and available_at <= now()
    order by available_at, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  update public.outbox_events o
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = attempts + 1
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$$;

create or replace function public.complete_outbox_event(
  p_event_id uuid,
  p_succeeded boolean,
  p_error text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  if auth.uid() is not null and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;

  select attempts into v_attempts from public.outbox_events where id = p_event_id for update;
  if not found then raise exception 'outbox event not found'; end if;

  update public.outbox_events
  set status = case
        when p_succeeded then 'delivered'
        when v_attempts >= 10 then 'dead_letter'
        else 'retry'
      end,
      delivered_at = case when p_succeeded then now() else null end,
      available_at = case
        when p_succeeded then available_at
        else now() + make_interval(secs => least(3600, (power(2, least(v_attempts, 10)) * 15)::integer))
      end,
      last_error = case when p_succeeded then null else left(coalesce(p_error, 'unknown failure'), 2000) end,
      locked_at = null,
      locked_by = null
  where id = p_event_id;
end;
$$;

-- Permissions ----------------------------------------------------------------

create table if not exists public.company_role_permissions (
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null,
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, role, permission)
);

alter table public.company_role_permissions enable row level security;
create policy "company managers manage role permissions" on public.company_role_permissions
  for all using (
    public.current_user_is_company_manager(company_id) or public.current_user_is_admin()
  )
  with check (
    public.current_user_is_company_manager(company_id) or public.current_user_is_admin()
  );

create or replace function public.current_user_has_company_permission(
  p_company_id uuid,
  p_permission text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_admin()
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and (
          cm.team_role in ('owner', 'admin')
          or exists (
            select 1
            from public.company_role_permissions crp
            where crp.company_id = cm.company_id
              and crp.role = cm.team_role
              and crp.permission = p_permission
              and crp.granted = true
          )
        )
    );
$$;

-- Application completion requests --------------------------------------------

create table if not exists public.application_completion_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.rental_applications(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested','viewed','in_progress','submitted','accepted','rejected','expired','cancelled')),
  message text not null,
  requested_fields text[] not null default '{}',
  requested_document_types text[] not null default '{}',
  response jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists ticket_number text,
  add column if not exists support_scope text not null default 'platform'
    check (support_scope in ('platform','landlord')),
  add column if not exists related_object_type text,
  add column if not exists related_object_id uuid;
create unique index if not exists support_tickets_company_number_unique
  on public.support_tickets (company_id, ticket_number)
  where company_id is not null and ticket_number is not null;
create index if not exists support_tickets_company_status_idx
  on public.support_tickets (company_id, status, sla_due_at)
  where company_id is not null;
create policy "company support staff manage landlord tickets" on public.support_tickets
  for all using (
    company_id is not null and public.current_user_has_company_permission(company_id, 'support.manage')
  )
  with check (
    company_id is not null and public.current_user_has_company_permission(company_id, 'support.manage')
  );

create index if not exists application_completion_application_idx
  on public.application_completion_requests (application_id, created_at desc);
alter table public.application_completion_requests enable row level security;
create policy "company reviewers manage completion requests" on public.application_completion_requests
  for all using (
    public.current_user_has_company_permission(company_id, 'applications.request_completion')
  )
  with check (
    public.current_user_has_company_permission(company_id, 'applications.request_completion')
  );
create policy "applicants read own completion requests" on public.application_completion_requests
  for select using (
    exists (
      select 1 from public.rental_applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );
create policy "applicants update own completion requests" on public.application_completion_requests
  for update using (
    exists (
      select 1 from public.rental_applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

-- Canonical document engine ---------------------------------------------------

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  document_number text,
  category text not null,
  classification text not null default 'private'
    check (classification in ('public','internal','private','sensitive','legal')),
  title text not null,
  status text not null default 'active'
    check (status in ('draft','active','superseded','archived','retained','deleted')),
  current_version integer not null default 0,
  retention_until date,
  legal_hold boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists documents_company_number_unique
  on public.documents (company_id, document_number)
  where document_number is not null;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  virus_scan_status text not null default 'pending'
    check (virus_scan_status in ('pending','clean','infected','failed')),
  ocr_status text not null default 'not_requested'
    check (ocr_status in ('not_requested','pending','completed','failed')),
  extraction_status text not null default 'not_requested'
    check (extraction_status in ('not_requested','pending','completed','failed')),
  metadata jsonb not null default '{}'::jsonb,
  immutable boolean not null default false,
  superseded_by uuid references public.document_versions(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version_number),
  unique (document_id, content_hash)
);

create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  relationship text not null default 'attachment',
  created_at timestamptz not null default now(),
  unique (document_id, object_type, object_id, relationship)
);

create index if not exists document_links_object_idx
  on public.document_links (object_type, object_id);

create or replace function public.prevent_immutable_document_version_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.immutable then
    raise exception 'immutable document versions cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists document_versions_immutable_guard on public.document_versions;
create trigger document_versions_immutable_guard
before update or delete on public.document_versions
for each row execute function public.prevent_immutable_document_version_change();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_links enable row level security;

create policy "document owners and company readers read documents" on public.documents
  for select using (
    owner_user_id = auth.uid()
    or public.current_user_has_company_permission(company_id, 'documents.read')
    or public.current_user_is_admin()
  );
create policy "company document managers manage documents" on public.documents
  for all using (
    owner_user_id = auth.uid()
    or public.current_user_has_company_permission(company_id, 'documents.upload')
    or public.current_user_is_admin()
  )
  with check (
    owner_user_id = auth.uid()
    or public.current_user_has_company_permission(company_id, 'documents.upload')
    or public.current_user_is_admin()
  );
create policy "authorized parties read document versions" on public.document_versions
  for select using (
    exists (select 1 from public.documents d where d.id = document_id)
  );
create policy "document managers create versions" on public.document_versions
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (
          d.owner_user_id = auth.uid()
          or public.current_user_has_company_permission(d.company_id, 'documents.upload')
          or public.current_user_is_admin()
        )
    )
  );
create policy "authorized parties read document links" on public.document_links
  for select using (
    exists (select 1 from public.documents d where d.id = document_id)
  );
create policy "company document managers manage links" on public.document_links
  for all using (
    public.current_user_has_company_permission(company_id, 'documents.upload')
    or public.current_user_is_admin()
  )
  with check (
    public.current_user_has_company_permission(company_id, 'documents.upload')
    or public.current_user_is_admin()
  );

-- Signing invariants ----------------------------------------------------------

alter table public.contracts
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists contract_number text,
  add column if not exists document_id uuid references public.documents(id) on delete restrict,
  add column if not exists document_version_id uuid references public.document_versions(id) on delete restrict,
  add column if not exists document_hash text,
  add column if not exists variables_snapshot jsonb not null default '{}'::jsonb;

create unique index if not exists contracts_company_number_unique
  on public.contracts (company_id, contract_number)
  where contract_number is not null;

create table if not exists public.signing_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  document_hash text not null check (document_hash ~ '^[a-f0-9]{64}$'),
  provider text not null,
  provider_reference text,
  status text not null default 'created'
    check (status in ('created','sent','partially_signed','completed','declined','expired','cancelled','failed')),
  idempotency_key text not null,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference),
  unique (company_id, idempotency_key)
);

alter table public.signing_sessions enable row level security;
create policy "contract parties read signing sessions" on public.signing_sessions
  for select using (
    public.current_user_has_company_permission(company_id, 'contracts.manage_signing')
    or exists (
      select 1 from public.contract_signers cs
      where cs.contract_id = signing_sessions.contract_id and cs.user_id = auth.uid()
    )
  );
create policy "contract managers manage signing sessions" on public.signing_sessions
  for all using (
    public.current_user_has_company_permission(company_id, 'contracts.manage_signing')
  )
  with check (
    public.current_user_has_company_permission(company_id, 'contracts.manage_signing')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contract-documents', 'contract-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "company members upload contract documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contract-documents'
    and public.current_user_can_manage_company(((storage.foldername(name))[1])::uuid)
  );
create policy "company members delete draft contract documents" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contract-documents'
    and public.current_user_can_manage_company(((storage.foldername(name))[1])::uuid)
  );
create policy "contract parties read contract documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contract-documents'
    and (
      public.current_user_can_manage_company(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1
        from public.contracts c
        join public.contract_signers cs on cs.contract_id = c.id
        where c.company_id = ((storage.foldername(name))[1])::uuid
          and c.document_version_id is not null
          and c.document_id is not null
          and cs.user_id = auth.uid()
      )
    )
  );

create or replace function public.register_contract_document(
  p_contract_id uuid,
  p_storage_path text,
  p_content_hash text,
  p_file_size bigint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_application public.rental_applications%rowtype;
  v_document_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_number text;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or v_contract.status not in ('draft','internal_review') then
    raise exception 'editable contract required';
  end if;
  select * into v_application from public.rental_applications where id = v_contract.application_id;
  if v_application.landlord_company_id is null
     or not public.current_user_has_company_permission(v_application.landlord_company_id, 'contracts.create') then
    raise exception 'not authorized';
  end if;
  if p_content_hash !~ '^[a-f0-9]{64}$' or p_file_size <= 0 then
    raise exception 'invalid document metadata';
  end if;
  if p_storage_path not like v_application.landlord_company_id::text || '/contracts/%' then
    raise exception 'invalid storage path';
  end if;

  v_number := public.next_company_number_internal(v_application.landlord_company_id, 'contract', 'AV');
  insert into public.documents (
    id, company_id, document_number, category, classification, title,
    current_version, created_by
  ) values (
    v_document_id, v_application.landlord_company_id, v_number, 'rental_contract',
    'legal', 'Hyresavtal ' || v_number, 1, auth.uid()
  );
  insert into public.document_versions (
    id, document_id, version_number, content_hash, storage_path, mime_type,
    file_size, virus_scan_status, immutable, created_by
  ) values (
    v_version_id, v_document_id, 1, p_content_hash, p_storage_path,
    'application/pdf', p_file_size, 'clean', true, auth.uid()
  );
  insert into public.document_links (document_id, company_id, object_type, object_id, relationship)
  values (v_document_id, v_application.landlord_company_id, 'contract', p_contract_id, 'canonical_pdf');
  update public.contracts
  set company_id = v_application.landlord_company_id,
      contract_number = v_number,
      document_id = v_document_id,
      document_version_id = v_version_id,
      document_hash = p_content_hash
  where id = p_contract_id;
  perform public.emit_domain_event(v_application.landlord_company_id, 'contract', p_contract_id, 'contract.document_registered',
    jsonb_build_object('contract_number', v_number, 'document_id', v_document_id, 'document_version_id', v_version_id, 'content_hash', p_content_hash));
  return v_version_id;
end;
$$;

create or replace function public.register_signing_session(
  p_contract_id uuid,
  p_provider text,
  p_provider_reference text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_session_id uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or v_contract.status not in ('draft','internal_review') then
    raise exception 'contract is not ready for signing';
  end if;
  if v_contract.company_id is null
     or not public.current_user_has_company_permission(v_contract.company_id, 'contracts.send') then
    raise exception 'not authorized';
  end if;
  if v_contract.document_version_id is null or v_contract.document_hash is null then
    raise exception 'canonical contract document is missing';
  end if;

  insert into public.signing_sessions (
    company_id, contract_id, document_version_id, document_hash, provider,
    provider_reference, status, idempotency_key
  ) values (
    v_contract.company_id, v_contract.id, v_contract.document_version_id,
    v_contract.document_hash, trim(p_provider), trim(p_provider_reference),
    'sent', trim(p_idempotency_key)
  )
  on conflict (company_id, idempotency_key) do update
    set provider_reference = excluded.provider_reference
  returning id into v_session_id;

  update public.contracts
  set status = 'sent_for_signing', provider = trim(p_provider), provider_ref = trim(p_provider_reference)
  where id = p_contract_id;
  insert into public.contract_events (contract_id, actor_user_id, event_type, payload)
  values (p_contract_id, auth.uid(), 'sent_for_signing',
    jsonb_build_object('provider', p_provider, 'session_id', v_session_id, 'document_hash', v_contract.document_hash));
  perform public.emit_domain_event(v_contract.company_id, 'contract', p_contract_id, 'contract.sent_for_signing',
    jsonb_build_object('session_id', v_session_id, 'provider', p_provider));
  return v_session_id;
end;
$$;

create or replace function public.process_signing_callback(
  p_provider_reference text,
  p_event text,
  p_signed_pdf_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.signing_sessions%rowtype;
  v_contract public.contracts%rowtype;
begin
  -- Webhook route uses service role. Interactive callers may not finalize.
  if auth.uid() is not null and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;
  select * into v_session
  from public.signing_sessions
  where provider_reference = p_provider_reference
  for update;
  if not found then raise exception 'signing session not found'; end if;
  select * into v_contract from public.contracts where id = v_session.contract_id for update;

  if p_event = 'completed' then
    if v_session.status = 'completed' and v_contract.status = 'signed' then
      return jsonb_build_object('contract_id', v_contract.id, 'already_completed', true);
    end if;
    if v_contract.document_version_id <> v_session.document_version_id
       or v_contract.document_hash <> v_session.document_hash then
      raise exception 'signed document version mismatch';
    end if;
    update public.contract_signers
    set status = 'signed', signed_at = coalesce(signed_at, now())
    where contract_id = v_contract.id and status = 'pending';
    update public.signing_sessions
    set status = 'completed', completed_at = now()
    where id = v_session.id;
    update public.contracts
    set signed_pdf_url = nullif(trim(p_signed_pdf_url), '')
    where id = v_contract.id;
    perform public.finalize_signed_contract(v_contract.id);
    return jsonb_build_object('contract_id', v_contract.id, 'finalized', true);
  elsif p_event = 'declined' then
    if v_session.status <> 'declined' then
      update public.signing_sessions set status = 'declined' where id = v_session.id;
      update public.contracts set status = 'cancelled' where id = v_contract.id and status <> 'signed';
      insert into public.contract_events (contract_id, actor_user_id, event_type)
      values (v_contract.id, null, 'signing_declined');
    end if;
    return jsonb_build_object('contract_id', v_contract.id, 'cancelled', true);
  end if;
  raise exception 'unsupported signing event';
end;
$$;

-- Tenancy, occupancy and move-in ---------------------------------------------

create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_number text not null,
  contract_id uuid not null unique references public.contracts(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  primary_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','notice_given','moving_out','ended','cancelled')),
  starts_on date not null,
  ends_on date,
  activated_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, tenancy_number),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.occupancies (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('primary_tenant','co_tenant','occupant','guardian')),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  unique (tenancy_id, user_id),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.move_in_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null unique references public.tenancies(id) on delete cascade,
  status text not null default 'planned'
    check (status in ('planned','awaiting_tenant','scheduled','in_progress','completed','blocked','cancelled')),
  scheduled_at timestamptz,
  key_handover_at timestamptz,
  inspection_at timestamptz,
  meter_readings jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  deviations jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenancies_company_status_idx on public.tenancies (company_id, status);
create index if not exists tenancies_user_idx on public.tenancies (primary_user_id, status);

alter table public.tenancies enable row level security;
alter table public.occupancies enable row level security;
alter table public.move_in_cases enable row level security;

create policy "tenant parties read tenancies" on public.tenancies
  for select using (
    primary_user_id = auth.uid()
    or public.current_user_has_company_permission(company_id, 'tenants.read')
  );
create policy "tenant managers manage tenancies" on public.tenancies
  for all using (public.current_user_has_company_permission(company_id, 'tenants.manage'))
  with check (public.current_user_has_company_permission(company_id, 'tenants.manage'));
create policy "occupants read occupancies" on public.occupancies
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.tenancies t
      where t.id = tenancy_id
        and (t.primary_user_id = auth.uid() or public.current_user_has_company_permission(t.company_id, 'tenants.read'))
    )
  );
create policy "tenant managers manage occupancies" on public.occupancies
  for all using (
    exists (
      select 1 from public.tenancies t
      where t.id = tenancy_id and public.current_user_has_company_permission(t.company_id, 'tenants.manage')
    )
  )
  with check (
    exists (
      select 1 from public.tenancies t
      where t.id = tenancy_id and public.current_user_has_company_permission(t.company_id, 'tenants.manage')
    )
  );
create policy "move in parties read cases" on public.move_in_cases
  for select using (
    exists (
      select 1 from public.tenancies t
      where t.id = tenancy_id
        and (t.primary_user_id = auth.uid() or public.current_user_has_company_permission(t.company_id, 'tenants.read'))
    )
  );
create policy "tenant managers manage move in" on public.move_in_cases
  for all using (public.current_user_has_company_permission(company_id, 'tenants.manage'))
  with check (public.current_user_has_company_permission(company_id, 'tenants.manage'));

-- Rent ledger (separate from Bovaro SaaS billing) -----------------------------

create table if not exists public.rent_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  description text not null,
  amount_ore bigint not null check (amount_ore >= 0),
  vat_rate_basis_points integer not null default 0 check (vat_rate_basis_points between 0 and 10000),
  frequency text not null default 'monthly' check (frequency in ('monthly','quarterly','yearly')),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.rent_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  invoice_number text not null,
  period_start date not null,
  period_end date not null,
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'draft'
    check (status in ('draft','issued','partially_paid','paid','overdue','credited','cancelled')),
  currency text not null default 'SEK' check (currency ~ '^[A-Z]{3}$'),
  subtotal_ore bigint not null default 0,
  vat_ore bigint not null default 0,
  total_ore bigint not null default 0,
  paid_ore bigint not null default 0,
  outstanding_ore bigint generated always as (greatest(total_ore - paid_ore, 0)) stored,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, invoice_number),
  check (period_end >= period_start),
  check (due_date >= issue_date),
  check (subtotal_ore >= 0 and vat_ore >= 0 and total_ore >= 0 and paid_ore >= 0)
);

create table if not exists public.rent_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.rent_invoices(id) on delete cascade,
  schedule_id uuid references public.rent_schedules(id) on delete set null,
  description text not null,
  quantity_milli integer not null default 1000 check (quantity_milli > 0),
  unit_amount_ore bigint not null,
  vat_rate_basis_points integer not null default 0 check (vat_rate_basis_points between 0 and 10000),
  line_total_ore bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  payment_reference text not null,
  amount_ore bigint not null check (amount_ore > 0),
  currency text not null default 'SEK' check (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz not null,
  provider text not null default 'manual',
  provider_reference text,
  status text not null default 'settled' check (status in ('pending','settled','refunded','failed')),
  idempotency_key text not null,
  registered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, idempotency_key),
  unique (provider, provider_reference)
);

create table if not exists public.rent_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.rent_payments(id) on delete restrict,
  invoice_id uuid not null references public.rent_invoices(id) on delete restrict,
  amount_ore bigint not null check (amount_ore > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create table if not exists public.tenancy_deposits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  amount_ore bigint not null check (amount_ore >= 0),
  held_ore bigint not null default 0 check (held_ore >= 0),
  status text not null default 'requested'
    check (status in ('requested','partially_paid','held','partially_released','released','applied')),
  created_at timestamptz not null default now()
);

create index if not exists rent_invoice_company_status_idx
  on public.rent_invoices (company_id, status, due_date);
create index if not exists rent_invoice_tenancy_idx
  on public.rent_invoices (tenancy_id, issue_date desc);
create index if not exists rent_payment_tenancy_idx
  on public.rent_payments (tenancy_id, paid_at desc);

alter table public.rent_schedules enable row level security;
alter table public.rent_invoices enable row level security;
alter table public.rent_invoice_lines enable row level security;
alter table public.rent_payments enable row level security;
alter table public.rent_payment_allocations enable row level security;
alter table public.tenancy_deposits enable row level security;

create policy "rent parties read schedules" on public.rent_schedules for select using (
  public.current_user_has_company_permission(company_id, 'rent.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "rent managers manage schedules" on public.rent_schedules for all using (
  public.current_user_has_company_permission(company_id, 'rent.manage')
) with check (public.current_user_has_company_permission(company_id, 'rent.manage'));
create policy "rent parties read invoices" on public.rent_invoices for select using (
  public.current_user_has_company_permission(company_id, 'rent.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "rent managers manage invoices" on public.rent_invoices for all using (
  public.current_user_has_company_permission(company_id, 'rent.manage')
) with check (public.current_user_has_company_permission(company_id, 'rent.manage'));
create policy "rent parties read invoice lines" on public.rent_invoice_lines for select using (
  exists (select 1 from public.rent_invoices i where i.id = invoice_id)
);
create policy "rent managers manage invoice lines" on public.rent_invoice_lines for all using (
  exists (
    select 1 from public.rent_invoices i
    where i.id = invoice_id and public.current_user_has_company_permission(i.company_id, 'rent.manage')
  )
) with check (
  exists (
    select 1 from public.rent_invoices i
    where i.id = invoice_id and public.current_user_has_company_permission(i.company_id, 'rent.manage')
  )
);
create policy "rent parties read payments" on public.rent_payments for select using (
  public.current_user_has_company_permission(company_id, 'rent.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "payment managers manage payments" on public.rent_payments for all using (
  public.current_user_has_company_permission(company_id, 'payments.manage')
) with check (public.current_user_has_company_permission(company_id, 'payments.manage'));
create policy "rent parties read allocations" on public.rent_payment_allocations for select using (
  exists (select 1 from public.rent_payments p where p.id = payment_id)
);
create policy "payment managers manage allocations" on public.rent_payment_allocations for all using (
  exists (
    select 1 from public.rent_payments p
    where p.id = payment_id and public.current_user_has_company_permission(p.company_id, 'payments.manage')
  )
) with check (
  exists (
    select 1 from public.rent_payments p
    where p.id = payment_id and public.current_user_has_company_permission(p.company_id, 'payments.manage')
  )
);
create policy "deposit parties read deposits" on public.tenancy_deposits for select using (
  public.current_user_has_company_permission(company_id, 'rent.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "rent managers manage deposits" on public.tenancy_deposits for all using (
  public.current_user_has_company_permission(company_id, 'rent.manage')
) with check (public.current_user_has_company_permission(company_id, 'rent.manage'));

-- Maintenance and work orders ------------------------------------------------

create table if not exists public.maintenance_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  case_number text not null,
  category text not null,
  urgency text not null default 'normal' check (urgency in ('low','normal','high','urgent','emergency')),
  title text not null,
  description text not null,
  access_instructions text,
  status text not null default 'submitted'
    check (status in ('submitted','triaged','awaiting_information','assigned','scheduled','in_progress','awaiting_parts','completed','verified','closed','cancelled')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  tenant_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, case_number)
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  maintenance_case_id uuid not null references public.maintenance_cases(id) on delete cascade,
  work_order_number text not null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  contractor_name text,
  status text not null default 'created'
    check (status in ('created','assigned','scheduled','in_progress','paused','completed','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  materials jsonb not null default '[]'::jsonb,
  cost_ore bigint not null default 0 check (cost_ore >= 0),
  completion_evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, work_order_number)
);

create index if not exists maintenance_company_status_idx
  on public.maintenance_cases (company_id, status, urgency, created_at);
create index if not exists maintenance_tenancy_idx
  on public.maintenance_cases (tenancy_id, created_at desc);

alter table public.maintenance_cases enable row level security;
alter table public.work_orders enable row level security;
create policy "maintenance parties read cases" on public.maintenance_cases for select using (
  submitted_by = auth.uid()
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
  or public.current_user_has_company_permission(company_id, 'maintenance.read')
);
create policy "tenants create maintenance cases" on public.maintenance_cases for insert with check (
  submitted_by = auth.uid()
  and exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "maintenance managers manage cases" on public.maintenance_cases for all using (
  public.current_user_has_company_permission(company_id, 'maintenance.assign')
) with check (public.current_user_has_company_permission(company_id, 'maintenance.assign'));
create policy "maintenance parties read work orders" on public.work_orders for select using (
  public.current_user_has_company_permission(company_id, 'maintenance.read')
  or exists (
    select 1 from public.maintenance_cases mc
    join public.tenancies t on t.id = mc.tenancy_id
    where mc.id = maintenance_case_id and t.primary_user_id = auth.uid()
  )
);
create policy "maintenance managers manage work orders" on public.work_orders for all using (
  public.current_user_has_company_permission(company_id, 'maintenance.assign')
) with check (public.current_user_has_company_permission(company_id, 'maintenance.assign'));

-- Termination, move-out and republication gate --------------------------------

create table if not exists public.lease_terminations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  termination_number text not null,
  initiated_by text not null check (initiated_by in ('tenant','landlord')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  reason text,
  requested_end_date date not null,
  contractual_end_date date,
  notice_months integer not null check (notice_months between 0 and 24),
  status text not null default 'requested'
    check (status in ('requested','under_review','confirmed','rejected','withdrawn','completed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, termination_number)
);

create table if not exists public.move_out_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenancy_id uuid not null unique references public.tenancies(id) on delete restrict,
  termination_id uuid not null unique references public.lease_terminations(id) on delete restrict,
  status text not null default 'planned'
    check (status in ('planned','inspection_scheduled','inspection_completed','remediation','awaiting_keys','final_settlement','completed','blocked','cancelled')),
  inspection_at timestamptz,
  keys_returned_at timestamptz,
  meter_readings jsonb not null default '{}'::jsonb,
  damages jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  final_charge_ore bigint not null default 0 check (final_charge_ore >= 0),
  cleaning_approved boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.move_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  move_in_case_id uuid references public.move_in_cases(id) on delete cascade,
  move_out_case_id uuid references public.move_out_cases(id) on delete cascade,
  inspector_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  protocol jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((move_in_case_id is not null)::integer + (move_out_case_id is not null)::integer = 1)
);

alter table public.lease_terminations enable row level security;
alter table public.move_out_cases enable row level security;
alter table public.move_inspections enable row level security;
create policy "termination parties read terminations" on public.lease_terminations for select using (
  public.current_user_has_company_permission(company_id, 'tenants.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "tenants create own terminations" on public.lease_terminations for insert with check (
  requested_by = auth.uid()
  and exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "tenant managers manage terminations" on public.lease_terminations for all using (
  public.current_user_has_company_permission(company_id, 'tenants.manage')
) with check (public.current_user_has_company_permission(company_id, 'tenants.manage'));
create policy "move out parties read cases" on public.move_out_cases for select using (
  public.current_user_has_company_permission(company_id, 'tenants.read')
  or exists (select 1 from public.tenancies t where t.id = tenancy_id and t.primary_user_id = auth.uid())
);
create policy "tenant managers manage move out" on public.move_out_cases for all using (
  public.current_user_has_company_permission(company_id, 'tenants.manage')
) with check (public.current_user_has_company_permission(company_id, 'tenants.manage'));
create policy "inspection parties read inspections" on public.move_inspections for select using (
  public.current_user_has_company_permission(company_id, 'tenants.read')
  or exists (
    select 1 from public.move_out_cases mo
    join public.tenancies t on t.id = mo.tenancy_id
    where mo.id = move_out_case_id and t.primary_user_id = auth.uid()
  )
);
create policy "tenant managers manage inspections" on public.move_inspections for all using (
  public.current_user_has_company_permission(company_id, 'tenants.manage')
) with check (public.current_user_has_company_permission(company_id, 'tenants.manage'));

-- Canonical commands ----------------------------------------------------------

create or replace function public.create_maintenance_case(
  p_tenancy_id uuid,
  p_category text,
  p_urgency text,
  p_title text,
  p_description text,
  p_access_instructions text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenancy public.tenancies%rowtype;
  v_id uuid := gen_random_uuid();
  v_number text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_tenancy from public.tenancies where id = p_tenancy_id;
  if not found or v_tenancy.primary_user_id <> auth.uid() or v_tenancy.status not in ('upcoming','active','notice_given','moving_out') then
    raise exception 'tenancy not available';
  end if;
  if p_urgency not in ('low','normal','high','urgent','emergency') then raise exception 'invalid urgency'; end if;
  if length(trim(p_title)) < 3 or length(trim(p_description)) < 10 then raise exception 'insufficient description'; end if;

  v_number := public.next_company_number_internal(v_tenancy.company_id, 'maintenance', 'MA');
  insert into public.maintenance_cases (
    id, company_id, tenancy_id, unit_id, case_number, category, urgency,
    title, description, access_instructions, submitted_by
  ) values (
    v_id, v_tenancy.company_id, v_tenancy.id, v_tenancy.unit_id, v_number,
    trim(p_category), p_urgency, trim(p_title), trim(p_description),
    nullif(trim(p_access_instructions), ''), auth.uid()
  );
  perform public.emit_domain_event(v_tenancy.company_id, 'maintenance_case', v_id, 'maintenance.case_submitted',
    jsonb_build_object('case_number', v_number, 'urgency', p_urgency));
  return v_id;
end;
$$;

create or replace function public.request_lease_termination(
  p_tenancy_id uuid,
  p_requested_end_date date,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenancy public.tenancies%rowtype;
  v_id uuid := gen_random_uuid();
  v_number text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  if not found or v_tenancy.primary_user_id <> auth.uid() or v_tenancy.status <> 'active' then
    raise exception 'active tenancy not available';
  end if;
  if p_requested_end_date < current_date then raise exception 'end date cannot be in the past'; end if;
  if exists (
    select 1 from public.lease_terminations
    where tenancy_id = p_tenancy_id and status in ('requested','under_review','confirmed')
  ) then raise exception 'active termination already exists'; end if;

  v_number := public.next_company_number_internal(v_tenancy.company_id, 'termination', 'UP');
  insert into public.lease_terminations (
    id, company_id, tenancy_id, termination_number, initiated_by,
    requested_by, reason, requested_end_date, notice_months
  ) values (
    v_id, v_tenancy.company_id, v_tenancy.id, v_number, 'tenant',
    auth.uid(), nullif(trim(p_reason), ''), p_requested_end_date, 3
  );
  update public.tenancies set status = 'notice_given', updated_at = now() where id = p_tenancy_id;
  perform public.emit_domain_event(v_tenancy.company_id, 'lease_termination', v_id, 'tenancy.termination_requested',
    jsonb_build_object('termination_number', v_number, 'requested_end_date', p_requested_end_date));
  return v_id;
end;
$$;

create or replace function public.register_rent_payment(
  p_invoice_id uuid,
  p_amount_ore bigint,
  p_paid_at timestamptz,
  p_reference text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.rent_invoices%rowtype;
  v_payment_id uuid;
  v_allocated bigint;
begin
  select * into v_invoice from public.rent_invoices where id = p_invoice_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if not public.current_user_has_company_permission(v_invoice.company_id, 'payments.manage') then
    raise exception 'not authorized';
  end if;
  if p_amount_ore <= 0 then raise exception 'amount must be positive'; end if;

  select id into v_payment_id
  from public.rent_payments
  where company_id = v_invoice.company_id and idempotency_key = p_idempotency_key;
  if found then return v_payment_id; end if;

  v_payment_id := gen_random_uuid();
  v_allocated := least(p_amount_ore, v_invoice.outstanding_ore);
  insert into public.rent_payments (
    id, company_id, tenancy_id, payment_reference, amount_ore, paid_at,
    idempotency_key, registered_by
  ) values (
    v_payment_id, v_invoice.company_id, v_invoice.tenancy_id, trim(p_reference),
    p_amount_ore, p_paid_at, p_idempotency_key, auth.uid()
  );
  if v_allocated > 0 then
    insert into public.rent_payment_allocations (payment_id, invoice_id, amount_ore)
    values (v_payment_id, v_invoice.id, v_allocated);
  end if;
  update public.rent_invoices
  set paid_ore = paid_ore + v_allocated,
      status = case
        when paid_ore + v_allocated >= total_ore then 'paid'
        when paid_ore + v_allocated > 0 then 'partially_paid'
        else status
      end,
      paid_at = case when paid_ore + v_allocated >= total_ore then p_paid_at else null end
  where id = v_invoice.id;
  perform public.emit_domain_event(v_invoice.company_id, 'rent_payment', v_payment_id, 'rent.payment_registered',
    jsonb_build_object('invoice_id', v_invoice.id, 'amount_ore', p_amount_ore, 'allocated_ore', v_allocated));
  return v_payment_id;
end;
$$;

-- Portal bundles keep all UI reads behind RLS and one canonical query surface.
create or replace function public.get_tenant_portal_bundle()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'tenancies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'number', t.tenancy_number,
        'status', t.status,
        'starts_on', t.starts_on,
        'ends_on', t.ends_on,
        'unit_id', t.unit_id,
        'company_id', t.company_id,
        'contract_id', t.contract_id
      ) order by t.starts_on desc)
      from public.tenancies t where t.primary_user_id = auth.uid()
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'number', i.invoice_number,
        'status', i.status,
        'issue_date', i.issue_date,
        'due_date', i.due_date,
        'total_ore', i.total_ore,
        'paid_ore', i.paid_ore,
        'outstanding_ore', i.outstanding_ore,
        'tenancy_id', i.tenancy_id
      ) order by i.issue_date desc)
      from public.rent_invoices i
      join public.tenancies t on t.id = i.tenancy_id
      where t.primary_user_id = auth.uid()
    ), '[]'::jsonb),
    'maintenance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'number', m.case_number,
        'title', m.title,
        'urgency', m.urgency,
        'status', m.status,
        'created_at', m.created_at,
        'tenancy_id', m.tenancy_id
      ) order by m.created_at desc)
      from public.maintenance_cases m
      join public.tenancies t on t.id = m.tenancy_id
      where t.primary_user_id = auth.uid()
    ), '[]'::jsonb),
    'terminations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lt.id,
        'number', lt.termination_number,
        'status', lt.status,
        'requested_end_date', lt.requested_end_date,
        'contractual_end_date', lt.contractual_end_date,
        'tenancy_id', lt.tenancy_id
      ) order by lt.created_at desc)
      from public.lease_terminations lt
      join public.tenancies t on t.id = lt.tenancy_id
      where t.primary_user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

create or replace function public.get_landlord_lifecycle_bundle(p_company_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.current_user_can_manage_company(p_company_id) and not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;
  return jsonb_build_object(
    'tenancies', (select count(*) from public.tenancies where company_id = p_company_id and status in ('upcoming','active','notice_given','moving_out')),
    'move_ins', (select count(*) from public.move_in_cases where company_id = p_company_id and status not in ('completed','cancelled')),
    'unpaid_invoices', (select count(*) from public.rent_invoices where company_id = p_company_id and status in ('issued','partially_paid','overdue')),
    'outstanding_ore', (select coalesce(sum(outstanding_ore),0) from public.rent_invoices where company_id = p_company_id and status in ('issued','partially_paid','overdue')),
    'maintenance', (select count(*) from public.maintenance_cases where company_id = p_company_id and status not in ('closed','cancelled')),
    'urgent_maintenance', (select count(*) from public.maintenance_cases where company_id = p_company_id and urgency in ('urgent','emergency') and status not in ('closed','cancelled')),
    'move_outs', (select count(*) from public.move_out_cases where company_id = p_company_id and status not in ('completed','cancelled')),
    'dead_letters', (select count(*) from public.outbox_events where company_id = p_company_id and status = 'dead_letter')
  );
end;
$$;

-- Finalization hardening: signed contract atomically creates the tenant
-- relation and move-in case. Existing application/listing invariants remain.
create or replace function public.provision_tenancy_from_signed_contract(p_contract_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_application public.rental_applications%rowtype;
  v_listing public.listings%rowtype;
  v_id uuid;
  v_number text;
  v_start date;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or v_contract.status <> 'signed' then raise exception 'signed contract required'; end if;
  if v_contract.document_version_id is null or v_contract.document_hash is null then
    raise exception 'verified immutable contract document required';
  end if;
  if not exists (
    select 1 from public.document_versions dv
    where dv.id = v_contract.document_version_id
      and dv.content_hash = v_contract.document_hash
      and dv.immutable = true
      and dv.virus_scan_status = 'clean'
  ) then raise exception 'contract document verification failed'; end if;

  select id into v_id from public.tenancies where contract_id = p_contract_id;
  if found then return v_id; end if;

  select * into v_application from public.rental_applications where id = v_contract.application_id;
  select * into v_listing from public.listings where id = v_contract.listing_id;
  if v_application.landlord_company_id is null or v_application.user_id is null then
    raise exception 'application company and user required';
  end if;

  v_id := gen_random_uuid();
  v_number := public.next_company_number_internal(v_application.landlord_company_id, 'tenancy', 'HG');
  v_start := coalesce(v_application.move_in_date, v_application.desired_move_in, current_date);
  insert into public.tenancies (
    id, company_id, tenancy_number, contract_id, unit_id, primary_user_id, starts_on
  ) values (
    v_id, v_application.landlord_company_id, v_number, p_contract_id,
    v_listing.unit_id, v_application.user_id, v_start
  );
  insert into public.occupancies (tenancy_id, user_id, role, starts_on)
  values (v_id, v_application.user_id, 'primary_tenant', v_start);
  insert into public.move_in_cases (company_id, tenancy_id, status)
  values (v_application.landlord_company_id, v_id, 'planned');
  perform public.emit_domain_event(v_application.landlord_company_id, 'tenancy', v_id, 'tenancy.provisioned',
    jsonb_build_object('tenancy_number', v_number, 'contract_id', p_contract_id));
  return v_id;
end;
$$;

create or replace function public.on_contract_became_signed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'signed' and new.status = 'signed' then
    perform public.provision_tenancy_from_signed_contract(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_provision_signed_tenancy on public.contracts;
create trigger contracts_provision_signed_tenancy
after update of status on public.contracts
for each row
when (new.status = 'signed')
execute function public.on_contract_became_signed();

-- updated_at triggers ---------------------------------------------------------

drop trigger if exists application_completion_requests_updated_at on public.application_completion_requests;
create trigger application_completion_requests_updated_at before update on public.application_completion_requests
for each row execute function public.set_updated_at();
drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
for each row execute function public.set_updated_at();
drop trigger if exists tenancies_updated_at on public.tenancies;
create trigger tenancies_updated_at before update on public.tenancies
for each row execute function public.set_updated_at();
drop trigger if exists move_in_cases_updated_at on public.move_in_cases;
create trigger move_in_cases_updated_at before update on public.move_in_cases
for each row execute function public.set_updated_at();
drop trigger if exists maintenance_cases_updated_at on public.maintenance_cases;
create trigger maintenance_cases_updated_at before update on public.maintenance_cases
for each row execute function public.set_updated_at();
drop trigger if exists lease_terminations_updated_at on public.lease_terminations;
create trigger lease_terminations_updated_at before update on public.lease_terminations
for each row execute function public.set_updated_at();
drop trigger if exists move_out_cases_updated_at on public.move_out_cases;
create trigger move_out_cases_updated_at before update on public.move_out_cases
for each row execute function public.set_updated_at();

-- Seed explicit default role permissions. Owner/admin are always allowed by
-- current_user_has_company_permission; these rows define least privilege for
-- operational roles and are copied per existing company.
insert into public.company_role_permissions (company_id, role, permission)
select c.id, role_name, permission_name
from public.companies c
cross join (
  values
    ('leasing_agent','properties.read'),
    ('leasing_agent','listings.read'),
    ('leasing_agent','listings.write'),
    ('leasing_agent','applications.read'),
    ('leasing_agent','applications.review'),
    ('leasing_agent','applications.request_completion'),
    ('leasing_agent','viewings.manage'),
    ('leasing_agent','offers.create'),
    ('leasing_agent','offers.send'),
    ('leasing_agent','contracts.create'),
    ('leasing_agent','contracts.send'),
    ('viewer','properties.read'),
    ('viewer','listings.read'),
    ('viewer','applications.read'),
    ('billing','rent.read'),
    ('billing','rent.manage'),
    ('billing','payments.manage'),
    ('billing','reports.read'),
    ('billing','reports.export')
) as defaults(role_name, permission_name)
on conflict (company_id, role, permission) do nothing;

create or replace function public.seed_company_default_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_role_permissions (company_id, role, permission)
  select new.id, role_name, permission_name
  from (
    values
      ('leasing_agent','properties.read'),
      ('leasing_agent','listings.read'),
      ('leasing_agent','listings.write'),
      ('leasing_agent','applications.read'),
      ('leasing_agent','applications.review'),
      ('leasing_agent','applications.request_completion'),
      ('leasing_agent','viewings.manage'),
      ('leasing_agent','offers.create'),
      ('leasing_agent','offers.send'),
      ('leasing_agent','contracts.create'),
      ('leasing_agent','contracts.send'),
      ('viewer','properties.read'),
      ('viewer','listings.read'),
      ('viewer','applications.read'),
      ('billing','rent.read'),
      ('billing','rent.manage'),
      ('billing','payments.manage'),
      ('billing','reports.read'),
      ('billing','reports.export')
  ) as defaults(role_name, permission_name)
  on conflict (company_id, role, permission) do nothing;
  return new;
end;
$$;

drop trigger if exists companies_seed_default_permissions on public.companies;
create trigger companies_seed_default_permissions
after insert on public.companies
for each row execute function public.seed_company_default_permissions();

comment on table public.tenancies is 'Canonical tenant/customer relation created only from a verified signed contract.';
comment on table public.rent_invoices is 'Landlord rent ledger; intentionally separate from Bovaro SaaS billing tables.';
comment on table public.domain_events is 'Immutable canonical business event written in the same transaction as domain state.';
